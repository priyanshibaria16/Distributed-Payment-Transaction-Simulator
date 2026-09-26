package com.simulator.payment.worker;

import com.simulator.payment.exception.PaymentException;
import com.simulator.payment.exception.RetryablePaymentException;
import com.simulator.payment.model.enums.NotificationType;
import com.simulator.payment.model.enums.TransactionStatus;
import com.simulator.payment.model.event.NotificationEvent;
import com.simulator.payment.model.event.PaymentEvent;
import com.simulator.payment.repository.TransactionRepository;
import com.simulator.payment.service.PaymentExecutionService;
import jakarta.jms.JMSException;
import jakarta.jms.Message;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ThreadPoolExecutor;

@Component
public class PaymentWorkerConsumer {

    private static final Logger log = LoggerFactory.getLogger(PaymentWorkerConsumer.class);

    private final ThreadPoolExecutor executor;
    private final PaymentExecutionService executionService;
    private final TransactionRepository transactionRepository;
    private final JmsTemplate jmsTemplate;

    @Value("${simulator.retry.max-attempts:3}")
    private int maxRetries;

    @Value("${simulator.queues.payment-retry:payment.retry.queue}")
    private String retryQueue;

    @Value("${simulator.queues.payment-failed:payment.failed.queue}")
    private String failedQueue;

    public PaymentWorkerConsumer(
            @Qualifier("paymentThreadPoolExecutor") ThreadPoolExecutor executor,
            PaymentExecutionService executionService,
            TransactionRepository transactionRepository,
            JmsTemplate jmsTemplate) {
        this.executor = executor;
        this.executionService = executionService;
        this.transactionRepository = transactionRepository;
        this.jmsTemplate = jmsTemplate;
    }

    @JmsListener(destination = "${simulator.queues.payment:payment.queue}",
                 containerFactory = "jmsListenerContainerFactory")
    public void onPaymentMessage(PaymentEvent event, Message jmsMessage) {
        processInThreadPool(event, jmsMessage);
    }

    @JmsListener(destination = "${simulator.queues.payment-retry:payment.retry.queue}",
                 containerFactory = "jmsListenerContainerFactory")
    public void onPaymentRetryMessage(PaymentEvent event, Message jmsMessage) {
        processInThreadPool(event, jmsMessage);
    }

    private void processInThreadPool(PaymentEvent event, Message jmsMessage) {
        log.info("JMS message received: txn={}, eventId={}, activeThreads={}/{}, workQueueSize={}",
                event.getTransactionId(), event.getEventId(),
                executor.getActiveCount(), executor.getMaximumPoolSize(),
                executor.getQueue().size());

        // Submit task to Core Java ThreadPoolExecutor
        executor.submit(() -> {
            String currentThread = Thread.currentThread().getName();
            log.info("[{}] Worker picked up transaction: {}", currentThread, event.getTransactionId());

            try {
                // Execute business logic with pessimistic locking
                executionService.executePayment(event);

            } catch (RetryablePaymentException ex) {
                handleRetry(event, ex);
            } catch (PaymentException ex) {
                handleNonRetryableFailure(event, ex);
            } catch (Exception ex) {
                log.error("[{}] Unexpected error processing {}: {}", currentThread, event.getTransactionId(), ex.getMessage(), ex);
                handleNonRetryableFailure(event, new PaymentException("INTERNAL_ERROR", ex.getMessage(), false));
            }
        });

        // Acknowledge receipt to broker
        try {
            jmsMessage.acknowledge();
        } catch (JMSException e) {
            log.error("Failed to acknowledge JMS message for {}: {}", event.getTransactionId(), e.getMessage());
        }
    }

    private void handleRetry(PaymentEvent event, RetryablePaymentException ex) {
        int currentAttempt = event.getRetryCount() + 1;
        event.setRetryCount(currentAttempt);

        if (currentAttempt < maxRetries) {
            log.warn("Transient error for txn {}: {}. Routing to {} (attempt {} of {})",
                    event.getTransactionId(), ex.getMessage(), retryQueue, currentAttempt, maxRetries);

            transactionRepository.incrementRetryCount(event.getTransactionId());

            // Enqueue into retry queue
            jmsTemplate.convertAndSend(retryQueue, event, msg -> {
                msg.setJMSCorrelationID(event.getCorrelationId());
                msg.setIntProperty("retryAttempt", currentAttempt);
                return msg;
            });
        } else {
            log.error("Max retries ({}) exhausted for txn {}. Routing to {}",
                    maxRetries, event.getTransactionId(), failedQueue);

            transactionRepository.updateStatus(
                    event.getTransactionId(),
                    TransactionStatus.FAILED,
                    "MAX_RETRIES_EXCEEDED",
                    "Exhausted " + maxRetries + " attempts. Last error: " + ex.getMessage()
            );

            jmsTemplate.convertAndSend(failedQueue, event);
            dispatchNotification(event, NotificationType.PAYMENT_FAILED, "Payment failed after maximum retries: " + ex.getMessage());
        }
    }

    private void handleNonRetryableFailure(PaymentEvent event, PaymentException ex) {
        log.warn("Non-retryable failure for txn {}: [{} - {}]. Moving to {}",
                event.getTransactionId(), ex.getErrorCode(), ex.getMessage(), failedQueue);

        transactionRepository.updateStatus(
                event.getTransactionId(),
                TransactionStatus.FAILED,
                ex.getErrorCode(),
                ex.getMessage()
        );

        jmsTemplate.convertAndSend(failedQueue, event);
        dispatchNotification(event, NotificationType.PAYMENT_FAILED, "Payment rejected: " + ex.getMessage());
    }

    private void dispatchNotification(PaymentEvent event, NotificationType type, String message) {
        try {
            NotificationEvent notif = new NotificationEvent(
                    "NOTIF-" + UUID.randomUUID().toString().substring(0, 8),
                    type,
                    null,
                    event.getTransactionId(),
                    event.getAmount(),
                    event.getCurrency(),
                    message,
                    Instant.now()
            );
            jmsTemplate.convertAndSend("notification.queue", notif);
        } catch (Exception ex) {
            log.error("Failed to send notification: {}", ex.getMessage());
        }
    }
}
