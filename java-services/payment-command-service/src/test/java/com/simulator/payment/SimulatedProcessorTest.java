package com.simulator.payment;

import com.simulator.payment.engine.PaymentContext;
import com.simulator.payment.engine.ProcessResult;
import com.simulator.payment.engine.SimulatedUpiProcessor;
import com.simulator.payment.exception.InvalidPaymentException;
import com.simulator.payment.exception.RetryablePaymentException;
import com.simulator.payment.model.enums.FailureMode;
import com.simulator.payment.model.enums.PaymentMethod;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class SimulatedProcessorTest {

    @Test
    @DisplayName("Should successfully process valid payment when failure mode is NONE")
    void testSuccessfulPayment() {
        SimulatedUpiProcessor processor = new SimulatedUpiProcessor();
        processor.setForcedFailureMode(FailureMode.NONE);

        PaymentContext context = new PaymentContext(
                "TXN-TEST-001", 1L, 2L, new BigDecimal("100.00"), "INR",
                PaymentMethod.SIMULATED_UPI, "CORR-001", 1
        );

        ProcessResult result = processor.process(context);
        assertTrue(result.isSuccess());
        assertEquals("00", result.getResponseCode());
    }

    @Test
    @DisplayName("Should throw RetryablePaymentException on attempt 1 when mode is DETERMINISTIC_FIRST_ATTEMPT")
    void testDeterministicFirstAttemptFailure() {
        SimulatedUpiProcessor processor = new SimulatedUpiProcessor();
        processor.setForcedFailureMode(FailureMode.DETERMINISTIC_FIRST_ATTEMPT);

        PaymentContext attempt1 = new PaymentContext(
                "TXN-TEST-002", 1L, 2L, new BigDecimal("250.00"), "INR",
                PaymentMethod.SIMULATED_UPI, "CORR-002", 1
        );

        RetryablePaymentException ex = assertThrows(RetryablePaymentException.class, () -> processor.process(attempt1));
        assertTrue(ex.isRetryable());
        assertEquals("GATEWAY_TIMEOUT", ex.getErrorCode());

        // Attempt 2 should now succeed
        PaymentContext attempt2 = new PaymentContext(
                "TXN-TEST-002", 1L, 2L, new BigDecimal("250.00"), "INR",
                PaymentMethod.SIMULATED_UPI, "CORR-002", 2
        );

        ProcessResult result = processor.process(attempt2);
        assertTrue(result.isSuccess());
    }

    @Test
    @DisplayName("Should throw non-retryable InvalidPaymentException when mode is PERMANENT_FAILURE")
    void testPermanentFailure() {
        SimulatedUpiProcessor processor = new SimulatedUpiProcessor();
        processor.setForcedFailureMode(FailureMode.PERMANENT_FAILURE);

        PaymentContext context = new PaymentContext(
                "TXN-TEST-003", 1L, 2L, new BigDecimal("500.00"), "INR",
                PaymentMethod.SIMULATED_UPI, "CORR-003", 1
        );

        InvalidPaymentException ex = assertThrows(InvalidPaymentException.class, () -> processor.process(context));
        assertFalse(ex.isRetryable());
    }
}
