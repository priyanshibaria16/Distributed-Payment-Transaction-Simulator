package com.simulator.payment.engine;

import com.simulator.payment.exception.PaymentException;
import com.simulator.payment.model.enums.PaymentMethod;
import org.springframework.stereotype.Component;

@Component
public class SimulatedUpiProcessor extends AbstractSimulatedProcessor {

    @Override
    public ProcessResult process(PaymentContext context) throws PaymentException {
        long start = System.currentTimeMillis();
        log.info("Processing SIMULATED_UPI transaction: ref={}, amount={}, attempt={}",
                context.getTransactionReference(), context.getAmount(), context.getAttemptNumber());

        simulateProcessingLatency();
        evaluateSimulatedFaults(context);

        long latency = System.currentTimeMillis() - start;
        return ProcessResult.success("Simulated UPI transaction authorized successfully", latency);
    }

    @Override
    public PaymentMethod getSupportedMethod() {
        return PaymentMethod.SIMULATED_UPI;
    }
}
