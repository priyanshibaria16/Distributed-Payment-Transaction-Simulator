package com.simulator.payment.engine;

import com.simulator.payment.exception.InvalidPaymentException;
import com.simulator.payment.exception.PaymentException;
import com.simulator.payment.exception.RetryablePaymentException;
import com.simulator.payment.model.enums.FailureMode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;

import java.math.BigDecimal;
import java.util.Random;

public abstract class AbstractSimulatedProcessor implements PaymentProcessor {

    protected final Logger log = LoggerFactory.getLogger(getClass());
    private final Random random = new Random();

    @Value("${simulator.simulation.failure-mode:NONE}")
    private String failureModeConfig;

    @Value("${simulator.simulation.failure-rate:0.0}")
    private double failureRate;

    @Value("${simulator.simulation.processing-delay-ms:50}")
    private long processingDelayMs;

    // Test overrides for deterministic testing
    private volatile FailureMode forcedFailureMode = null;

    public void setForcedFailureMode(FailureMode mode) {
        this.forcedFailureMode = mode;
    }

    protected void simulateProcessingLatency() {
        if (processingDelayMs > 0) {
            try {
                Thread.sleep(processingDelayMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    protected void evaluateSimulatedFaults(PaymentContext context) throws PaymentException {
        FailureMode mode = forcedFailureMode;
        if (mode == null) {
            try {
                mode = FailureMode.valueOf(failureModeConfig.toUpperCase());
            } catch (IllegalArgumentException e) {
                mode = FailureMode.NONE;
            }
        }

        // 1. Permanent failure mode
        if (mode == FailureMode.PERMANENT_FAILURE) {
            throw new InvalidPaymentException("Simulated upstream switch rejected transaction permanently");
        }

        // 2. Deterministic first attempt failure (succeeds on attempt >= 2)
        if (mode == FailureMode.DETERMINISTIC_FIRST_ATTEMPT && context.getAttemptNumber() == 1) {
            throw new RetryablePaymentException("GATEWAY_TIMEOUT", "Simulated transient timeout on attempt 1");
        }

        // 3. Random transient failure based on configured rate
        if (mode == FailureMode.RANDOM_TRANSIENT && failureRate > 0) {
            if (random.nextDouble() < failureRate) {
                throw new RetryablePaymentException("SIMULATED_TRANSIENT_FAULT", "Simulated transient connection timeout");
            }
        }

        // 4. Basic currency and amount validation
        if (context.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidPaymentException("Payment amount must be strictly positive");
        }
    }
}
