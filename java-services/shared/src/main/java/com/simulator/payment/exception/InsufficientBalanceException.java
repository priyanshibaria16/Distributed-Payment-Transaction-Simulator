package com.simulator.payment.exception;

public class InsufficientBalanceException extends PaymentException {
    public InsufficientBalanceException(String message) {
        super("INSUFFICIENT_BALANCE", message, false);
    }
}
