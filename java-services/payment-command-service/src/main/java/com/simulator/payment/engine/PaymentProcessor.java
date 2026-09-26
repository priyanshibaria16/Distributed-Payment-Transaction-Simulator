package com.simulator.payment.engine;

import com.simulator.payment.exception.PaymentException;
import com.simulator.payment.model.enums.PaymentMethod;

public interface PaymentProcessor {
    /**
     * Executes the simulated gateway authorization and validation.
     * Throws PaymentException on transient or non-transient failures.
     */
    ProcessResult process(PaymentContext context) throws PaymentException;

    PaymentMethod getSupportedMethod();
}
