package com.simulator.payment.worker;

import com.simulator.payment.model.enums.LedgerEntryType;
import com.simulator.payment.model.enums.NotificationType;
import com.simulator.payment.model.enums.TransactionStatus;
import com.simulator.payment.model.event.NotificationEvent;
import com.simulator.payment.model.event.RefundEvent;
import com.simulator.payment.repository.AccountRepository;
import com.simulator.payment.repository.LedgerRepository;
import com.simulator.payment.repository.TransactionRepository;
import jakarta.jms.JMSException;
import jakarta.jms.Message;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
public class RefundWorkerConsumer {

    private static final Logger log = LoggerFactory.getLogger(RefundWorkerConsumer.class);

    private final JdbcTemplate jdbcTemplate;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerRepository ledgerRepository;
    private final JmsTemplate jmsTemplate;

    public RefundWorkerConsumer(JdbcTemplate jdbcTemplate,
                                AccountRepository accountRepository,
                                TransactionRepository transactionRepository,
                                LedgerRepository ledgerRepository,
                                JmsTemplate jmsTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.ledgerRepository = ledgerRepository;
        this.jmsTemplate = jmsTemplate;
    }

    @JmsListener(destination = "${simulator.queues.refund:refund.queue}",
                 containerFactory = "jmsListenerContainerFactory")
    public void onRefundMessage(RefundEvent event, Message jmsMessage) {
        log.info("Processing refund command: refundRef={}, origTxn={}, amount={} {}",
                event.getRefundReference(), event.getOriginalTransactionReference(),
                event.getAmount(), event.getCurrency());

        try {
            processRefund(event);
            jmsMessage.acknowledge();
        } catch (JMSException e) {
            log.error("Failed to acknowledge refund message: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Failed to process refund {}: {}", event.getRefundReference(), e.getMessage(), e);
        }
    }

    @Transactional
    public void processRefund(RefundEvent event) {
        // 1. Get original transaction details
        String origSql = """
            SELECT id, sender_account_id, receiver_account_id, amount, status
            FROM transactions
            WHERE transaction_reference = ?
        """;

        Map<String, Object> origTxn = jdbcTemplate.queryForMap(origSql, event.getOriginalTransactionReference());
        Long txnId = (Long) origTxn.get("id");
        Long origSenderAcc = (Long) origTxn.get("sender_account_id");
        Long origReceiverAcc = (Long) origTxn.get("receiver_account_id");
        String currentStatus = (String) origTxn.get("status");

        if (!"SUCCESS".equals(currentStatus)) {
            log.warn("Cannot refund transaction in status {}: {}", currentStatus, event.getOriginalTransactionReference());
            return;
        }

        // 2. Insert or update refund record
        String refundInsertSql = """
            INSERT INTO refunds (
                refund_reference, original_transaction_id, requested_by_user_id,
                amount, currency, status, reason
            ) VALUES (?, ?, ?, ?, ?, 'PROCESSING', ?)
            ON CONFLICT (refund_reference) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
            RETURNING id
        """;
        Long refundId = jdbcTemplate.queryForObject(refundInsertSql, Long.class,
                event.getRefundReference(), txnId, event.getRequestedByUserId(),
                event.getAmount(), event.getCurrency(), event.getReason());

        // 3. Lock accounts in ascending order: origReceiverAcc and origSenderAcc
        Map<Long, BigDecimal> balances = accountRepository.lockAndGetBalances(origSenderAcc, origReceiverAcc);
        BigDecimal receiverBalance = balances.get(origReceiverAcc);
        BigDecimal senderBalance = balances.get(origSenderAcc);

        // 4. Reverse funds: debit the original receiver, credit the original sender
        BigDecimal newReceiverBalance = receiverBalance.subtract(event.getAmount());
        BigDecimal newSenderBalance = senderBalance.add(event.getAmount());

        accountRepository.updateBalance(origReceiverAcc, newReceiverBalance);
        accountRepository.updateBalance(origSenderAcc, newSenderBalance);

        // 5. Insert Reversal Ledger entries
        ledgerRepository.insertEntry(txnId, origReceiverAcc, LedgerEntryType.DEBIT,
                event.getAmount(), newReceiverBalance, "Refund reversal debit: " + event.getRefundReference());
        ledgerRepository.insertEntry(txnId, origSenderAcc, LedgerEntryType.CREDIT,
                event.getAmount(), newSenderBalance, "Refund reversal credit: " + event.getRefundReference());

        // 6. Update transaction and refund status to REFUNDED / COMPLETED
        transactionRepository.updateStatus(event.getOriginalTransactionReference(), TransactionStatus.REFUNDED, "00", "Refund completed");
        jdbcTemplate.update("UPDATE refunds SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", refundId);

        log.info("Refund completed successfully: refundRef={}, origTxn={}",
                event.getRefundReference(), event.getOriginalTransactionReference());

        // 7. Dispatch notification
        NotificationEvent notif = new NotificationEvent(
                "NOTIF-REF-" + UUID.randomUUID().toString().substring(0, 8),
                NotificationType.REFUND_COMPLETED,
                event.getRequestedByUserId(),
                event.getOriginalTransactionReference(),
                event.getAmount(),
                event.getCurrency(),
                "Refund of " + event.getAmount() + " " + event.getCurrency() + " was processed successfully.",
                Instant.now()
        );
        jmsTemplate.convertAndSend("notification.queue", notif);
    }
}
