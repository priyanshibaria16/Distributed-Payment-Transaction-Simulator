package com.simulator.payment.exception;

public class DuplicatePaymentException extends PaymentException {
    public DuplicatePaymentException(String message) {
        super("DUPLICATE_PAYMENT", message, false);
    }
}
