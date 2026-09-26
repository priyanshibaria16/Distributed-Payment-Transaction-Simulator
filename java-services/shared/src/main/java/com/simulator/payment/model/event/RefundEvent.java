package com.simulator.payment.model.event;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;

public class RefundEvent implements Serializable {
    private static final long serialVersionUID = 1L;

    private String eventId;
    private String refundReference;
    private String originalTransactionReference;
    private Long requestedByUserId;
    private BigDecimal amount;
    private String currency;
    private String reason;
    private String correlationId;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant createdAt;

    public RefundEvent() {}

    public RefundEvent(String eventId, String refundReference, String originalTransactionReference,
                       Long requestedByUserId, BigDecimal amount, String currency, String reason,
                       String correlationId, Instant createdAt) {
        this.eventId = eventId;
        this.refundReference = refundReference;
        this.originalTransactionReference = originalTransactionReference;
        this.requestedByUserId = requestedByUserId;
        this.amount = amount;
        this.currency = currency;
        this.reason = reason;
        this.correlationId = correlationId;
        this.createdAt = createdAt;
    }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public String getRefundReference() { return refundReference; }
    public void setRefundReference(String refundReference) { this.refundReference = refundReference; }

    public String getOriginalTransactionReference() { return originalTransactionReference; }
    public void setOriginalTransactionReference(String originalTransactionReference) { this.originalTransactionReference = originalTransactionReference; }

    public Long getRequestedByUserId() { return requestedByUserId; }
    public void setRequestedByUserId(Long requestedByUserId) { this.requestedByUserId = requestedByUserId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getCorrelationId() { return correlationId; }
    public void setCorrelationId(String correlationId) { this.correlationId = correlationId; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
