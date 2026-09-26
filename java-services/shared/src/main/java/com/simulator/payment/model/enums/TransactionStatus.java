package com.simulator.payment.model.enums;

public enum TransactionStatus {
    PENDING,
    PROCESSING,
    SUCCESS,
    FAILED,
    RETRYING,
    REFUND_PENDING,
    REFUNDED;

    public boolean isTerminal() {
        return this == SUCCESS || this == FAILED || this == REFUNDED;
    }
}
