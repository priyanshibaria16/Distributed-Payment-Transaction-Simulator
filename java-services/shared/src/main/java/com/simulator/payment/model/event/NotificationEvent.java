package com.simulator.payment.model.event;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.simulator.payment.model.enums.NotificationType;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;

public class NotificationEvent implements Serializable {
    private static final long serialVersionUID = 1L;

    private String eventId;
    private NotificationType type;
    private Long recipientUserId;
    private String transactionId;
    private BigDecimal amount;
    private String currency;
    private String message;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant timestamp;

    public NotificationEvent() {}

    public NotificationEvent(String eventId, NotificationType type, Long recipientUserId, String transactionId,
                             BigDecimal amount, String currency, String message, Instant timestamp) {
        this.eventId = eventId;
        this.type = type;
        this.recipientUserId = recipientUserId;
        this.transactionId = transactionId;
        this.amount = amount;
        this.currency = currency;
        this.message = message;
        this.timestamp = timestamp;
    }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public NotificationType getType() { return type; }
    public void setType(NotificationType type) { this.type = type; }

    public Long getRecipientUserId() { return recipientUserId; }
    public void setRecipientUserId(Long recipientUserId) { this.recipientUserId = recipientUserId; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
