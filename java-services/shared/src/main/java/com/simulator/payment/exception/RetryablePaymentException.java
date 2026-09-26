package com.simulator.payment.exception;

public class RetryablePaymentException extends PaymentException {
    public RetryablePaymentException(String message) {
        super("TEMPORARY_NETWORK_FAILURE", message, true);
    }

    public RetryablePaymentException(String errorCode, String message) {
        super(errorCode, message, true);
    }
}
