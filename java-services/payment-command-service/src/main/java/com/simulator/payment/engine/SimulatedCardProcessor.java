package com.simulator.payment.engine;

import com.simulator.payment.exception.PaymentException;
import com.simulator.payment.model.enums.PaymentMethod;
import org.springframework.stereotype.Component;

@Component
public class SimulatedCardProcessor extends AbstractSimulatedProcessor {

    @Override
    public ProcessResult process(PaymentContext context) throws PaymentException {
        long start = System.currentTimeMillis();
        log.info("Processing SIMULATED_CARD transaction: ref={}, amount={}, attempt={}",
                context.getTransactionReference(), context.getAmount(), context.getAttemptNumber());

        simulateProcessingLatency();
        evaluateSimulatedFaults(context);

        long latency = System.currentTimeMillis() - start;
        return ProcessResult.success("Simulated card payment authorized via mock 3DS", latency);
    }

    @Override
    public PaymentMethod getSupportedMethod() {
        return PaymentMethod.SIMULATED_CARD;
    }
}
