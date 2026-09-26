package com.simulator.payment.service;

import com.simulator.payment.engine.PaymentContext;
import com.simulator.payment.engine.PaymentProcessor;
import com.simulator.payment.engine.PaymentProcessorFactory;
import com.simulator.payment.engine.ProcessResult;
import com.simulator.payment.exception.InsufficientBalanceException;
import com.simulator.payment.exception.PaymentException;
import com.simulator.payment.model.enums.LedgerEntryType;
import com.simulator.payment.model.enums.NotificationType;
import com.simulator.payment.model.enums.TransactionStatus;
import com.simulator.payment.model.event.NotificationEvent;
import com.simulator.payment.model.event.PaymentEvent;
import com.simulator.payment.repository.AccountRepository;
import com.simulator.payment.repository.LedgerRepository;
import com.simulator.payment.repository.TransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentExecutionService {

    private static final Logger log = LoggerFactory.getLogger(PaymentExecutionService.class);

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerRepository ledgerRepository;
    private final PaymentProcessorFactory processorFactory;
    private final JmsTemplate jmsTemplate;

    public PaymentExecutionService(AccountRepository accountRepository,
                                   TransactionRepository transactionRepository,
                                   LedgerRepository ledgerRepository,
                                   PaymentProcessorFactory processorFactory,
                                   JmsTemplate jmsTemplate) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.ledgerRepository = ledgerRepository;
        this.processorFactory = processorFactory;
        this.jmsTemplate = jmsTemplate;
    }

    /**
     * Executes the payment inside an ACID database transaction.
     * Pessimistic row locking on sender and receiver accounts ensures consistency
     * across multiple concurrent worker threads and application nodes.
     */
    @Transactional(propagation = Propagation.REQUIRED, isolation = Isolation.READ_COMMITTED)
    public void executePayment(PaymentEvent event) throws PaymentException {
        long startTime = System.currentTimeMillis();
        String txnRef = event.getTransactionId();
        int attempt = event.getRetryCount() + 1;

        log.info("Starting execution for txn={}, attempt={}, amount={} {}",
                txnRef, attempt, event.getAmount(), event.getCurrency());

        // 1. Check idempotency / terminal state
        TransactionStatus currentStatus = transactionRepository.getStatus(txnRef);
        if (currentStatus != null && currentStatus.isTerminal()) {
            log.warn("Transaction {} is already in terminal state: {}. Skipping execution.", txnRef, currentStatus);
            return;
        }

        // Update state to PROCESSING
        transactionRepository.updateStatus(txnRef, TransactionStatus.PROCESSING, null, null);
        Long txnId = transactionRepository.getTransactionIdByReference(txnRef);

        try {
            // 2. Lock accounts in ascending order to prevent deadlocks
            Map<Long, BigDecimal> balances = accountRepository.lockAndGetBalances(
                    event.getSenderAccountId(), event.getReceiverAccountId()
            );

            BigDecimal senderBalance = balances.get(event.getSenderAccountId());
            BigDecimal receiverBalance = balances.get(event.getReceiverAccountId());

            if (senderBalance == null || receiverBalance == null) {
                throw new PaymentException("INVALID_ACCOUNTS", "One or both accounts not found", false);
            }

            // 3. Balance verification
            if (senderBalance.compareTo(event.getAmount()) < 0) {
                throw new InsufficientBalanceException(
                        String.format("Available balance (%s) is less than transfer amount (%s)",
                                senderBalance, event.getAmount())
                );
            }

            // 4. Execute Payment Strategy via Strategy Pattern
            PaymentProcessor processor = processorFactory.getProcessor(event.getPaymentMethod());
            PaymentContext context = new PaymentContext(
                    txnRef,
                    event.getSenderAccountId(),
                    event.getReceiverAccountId(),
                    event.getAmount(),
                    event.getCurrency(),
                    event.getPaymentMethod(),
                    event.getCorrelationId(),
                    attempt
            );

            ProcessResult result = processor.process(context);

            // 5. Atomic balance updates
            BigDecimal newSenderBalance = senderBalance.subtract(event.getAmount());
            BigDecimal newReceiverBalance = receiverBalance.add(event.getAmount());

            accountRepository.updateBalance(event.getSenderAccountId(), newSenderBalance);
            accountRepository.updateBalance(event.getReceiverAccountId(), newReceiverBalance);

            // 6. Write Double-Entry Ledger Entries
            // Debit Sender
            ledgerRepository.insertEntry(
                    txnId,
                    event.getSenderAccountId(),
                    LedgerEntryType.DEBIT,
                    event.getAmount(),
                    newSenderBalance,
                    "Payment transfer debit: " + txnRef
            );

            // Credit Receiver
            ledgerRepository.insertEntry(
                    txnId,
                    event.getReceiverAccountId(),
                    LedgerEntryType.CREDIT,
                    event.getAmount(),
                    newReceiverBalance,
                    "Payment transfer credit: " + txnRef
            );

            // 7. Mark Transaction as SUCCESS
            transactionRepository.updateStatus(txnRef, TransactionStatus.SUCCESS, "00", result.getMessage());

            // 8. Record attempt metrics
            long duration = System.currentTimeMillis() - startTime;
            transactionRepository.recordAttempt(txnId, attempt, "SUCCESS", null, duration);

            log.info("Payment committed successfully: txn={}, duration={}ms", txnRef, duration);

            // 9. Dispatch notification event asynchronously
            dispatchNotification(event, NotificationType.PAYMENT_SUCCESS, "Payment of " + event.getAmount() + " " + event.getCurrency() + " was successful.");

        } catch (InsufficientBalanceException e) {
            long duration = System.currentTimeMillis() - startTime;
            transactionRepository.updateStatus(txnRef, TransactionStatus.FAILED, e.getErrorCode(), e.getMessage());
            transactionRepository.recordAttempt(txnId, attempt, "FAILED", e.getMessage(), duration);
            dispatchNotification(event, NotificationType.PAYMENT_FAILED, "Payment failed: " + e.getMessage());
            log.warn("Payment rejected due to balance: txn={}, error={}", txnRef, e.getMessage());
            // Do not rethrow non-retryable insufficient balance exception to prevent infinite redelivery
        } catch (PaymentException e) {
            long duration = System.currentTimeMillis() - startTime;
            transactionRepository.recordAttempt(txnId, attempt, e.isRetryable() ? "RETRYABLE_ERROR" : "FAILED", e.getMessage(), duration);
            if (!e.isRetryable()) {
                transactionRepository.updateStatus(txnRef, TransactionStatus.FAILED, e.getErrorCode(), e.getMessage());
                dispatchNotification(event, NotificationType.PAYMENT_FAILED, "Payment failed: " + e.getMessage());
            }
            throw e; // Rethrow so Worker can handle retry logic
        }
    }

    private void dispatchNotification(PaymentEvent event, NotificationType type, String message) {
        try {
            Long recipientUser = accountRepository.getUserIdForAccount(event.getReceiverAccountId());
            NotificationEvent notif = new NotificationEvent(
                    "NOTIF-" + UUID.randomUUID().toString().substring(0, 8),
                    type,
                    recipientUser,
                    event.getTransactionId(),
                    event.getAmount(),
                    event.getCurrency(),
                    message,
                    Instant.now()
            );
            jmsTemplate.convertAndSend("notification.queue", notif);
        } catch (Exception ex) {
            log.error("Failed to enqueue notification for txn {}: {}", event.getTransactionId(), ex.getMessage());
        }
    }
}
