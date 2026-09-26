package com.simulator.payment.engine;

import com.simulator.payment.model.enums.PaymentMethod;

import java.math.BigDecimal;

public class PaymentContext {
    private final String transactionReference;
    private final Long senderAccountId;
    private final Long receiverAccountId;
    private final BigDecimal amount;
    private final String currency;
    private final PaymentMethod paymentMethod;
    private final String correlationId;
    private final int attemptNumber;

    public PaymentContext(String transactionReference, Long senderAccountId, Long receiverAccountId,
                          BigDecimal amount, String currency, PaymentMethod paymentMethod,
                          String correlationId, int attemptNumber) {
        this.transactionReference = transactionReference;
        this.senderAccountId = senderAccountId;
        this.receiverAccountId = receiverAccountId;
        this.amount = amount;
        this.currency = currency;
        this.paymentMethod = paymentMethod;
        this.correlationId = correlationId;
        this.attemptNumber = attemptNumber;
    }

    public String getTransactionReference() { return transactionReference; }
    public Long getSenderAccountId() { return senderAccountId; }
    public Long getReceiverAccountId() { return receiverAccountId; }
    public BigDecimal getAmount() { return amount; }
    public String getCurrency() { return currency; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public String getCorrelationId() { return correlationId; }
    public int getAttemptNumber() { return attemptNumber; }
}
