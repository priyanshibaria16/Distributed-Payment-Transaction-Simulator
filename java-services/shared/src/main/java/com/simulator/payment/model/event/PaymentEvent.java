package com.simulator.payment.model.event;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.simulator.payment.model.enums.PaymentMethod;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;

public class PaymentEvent implements Serializable {
    private static final long serialVersionUID = 1L;

    private String eventId;
    private String eventType;
    private String transactionId;
    private Long senderAccountId;
    private Long receiverAccountId;
    private BigDecimal amount;
    private String currency;
    private PaymentMethod paymentMethod;
    private String description;
    private String correlationId;
    private String idempotencyKey;
    private int retryCount;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant createdAt;

    public PaymentEvent() {
    }

    public PaymentEvent(String eventId, String eventType, String transactionId, Long senderAccountId,
                        Long receiverAccountId, BigDecimal amount, String currency, PaymentMethod paymentMethod,
                        String description, String correlationId, String idempotencyKey, int retryCount, Instant createdAt) {
        this.eventId = eventId;
        this.eventType = eventType;
        this.transactionId = transactionId;
        this.senderAccountId = senderAccountId;
        this.receiverAccountId = receiverAccountId;
        this.amount = amount;
        this.currency = currency;
        this.paymentMethod = paymentMethod;
        this.description = description;
        this.correlationId = correlationId;
        this.idempotencyKey = idempotencyKey;
        this.retryCount = retryCount;
        this.createdAt = createdAt;
    }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public Long getSenderAccountId() { return senderAccountId; }
    public void setSenderAccountId(Long senderAccountId) { this.senderAccountId = senderAccountId; }

    public Long getReceiverAccountId() { return receiverAccountId; }
    public void setReceiverAccountId(Long receiverAccountId) { this.receiverAccountId = receiverAccountId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCorrelationId() { return correlationId; }
    public void setCorrelationId(String correlationId) { this.correlationId = correlationId; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public int getRetryCount() { return retryCount; }
    public void setRetryCount(int retryCount) { this.retryCount = retryCount; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
