package com.simulator.payment.service;

import com.simulator.payment.model.enums.PaymentMethod;
import com.simulator.payment.model.event.PaymentEvent;
import com.simulator.payment.model.event.RefundEvent;
import com.simulator.payment.repository.TransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
public class PaymentCommandService {

    private static final Logger log = LoggerFactory.getLogger(PaymentCommandService.class);

    private final JmsTemplate jmsTemplate;
    private final TransactionRepository transactionRepository;

    @Value("${simulator.queues.payment:payment.queue}")
    private String paymentQueue;

    @Value("${simulator.queues.refund:refund.queue}")
    private String refundQueue;

    public PaymentCommandService(JmsTemplate jmsTemplate, TransactionRepository transactionRepository) {
        this.jmsTemplate = jmsTemplate;
        this.transactionRepository = transactionRepository;
    }

    public PaymentEvent publishPaymentCommand(String transactionReference, Long senderAccountId,
                                              Long receiverAccountId, BigDecimal amount, String currency,
                                              String paymentMethodStr, String description,
                                              String correlationId, String idempotencyKey) {

        // 1. Create or ensure PENDING transaction in DB
        transactionRepository.createPendingTransaction(
                transactionReference, senderAccountId, receiverAccountId,
                amount, currency, paymentMethodStr, description, correlationId, idempotencyKey
        );

        PaymentMethod method = PaymentMethod.fromString(paymentMethodStr);
        String eventId = "EVT-" + UUID.randomUUID().toString().substring(0, 10);

        PaymentEvent event = new PaymentEvent(
                eventId,
                "PAYMENT_REQUESTED",
                transactionReference,
                senderAccountId,
                receiverAccountId,
                amount,
                currency,
                method,
                description,
                correlationId,
                idempotencyKey,
                0,
                Instant.now()
        );

        // 2. Publish to ActiveMQ Artemis payment.queue
        log.info("Publishing payment event {} to {} for txn {}", eventId, paymentQueue, transactionReference);
        jmsTemplate.convertAndSend(paymentQueue, event, message -> {
            message.setJMSCorrelationID(correlationId);
            message.setStringProperty("transactionId", transactionReference);
            message.setStringProperty("eventType", "PAYMENT_REQUESTED");
            return message;
        });

        return event;
    }

    public RefundEvent publishRefundCommand(String originalTxnRef, String refundRef, Long requestedByUserId,
                                            BigDecimal amount, String currency, String reason, String correlationId) {
        String eventId = "EVT-REF-" + UUID.randomUUID().toString().substring(0, 8);
        RefundEvent event = new RefundEvent(
                eventId,
                refundRef,
                originalTxnRef,
                requestedByUserId,
                amount,
                currency,
                reason,
                correlationId,
                Instant.now()
        );

        log.info("Publishing refund event {} to {} for original txn {}", eventId, refundQueue, originalTxnRef);
        jmsTemplate.convertAndSend(refundQueue, event, message -> {
            message.setJMSCorrelationID(correlationId);
            message.setStringProperty("refundReference", refundRef);
            return message;
        });

        return event;
    }
}
