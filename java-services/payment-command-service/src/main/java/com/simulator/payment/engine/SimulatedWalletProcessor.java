package com.simulator.payment.engine;

import com.simulator.payment.exception.PaymentException;
import com.simulator.payment.model.enums.PaymentMethod;
import org.springframework.stereotype.Component;

@Component
public class SimulatedWalletProcessor extends AbstractSimulatedProcessor {

    @Override
    public ProcessResult process(PaymentContext context) throws PaymentException {
        long start = System.currentTimeMillis();
        log.info("Processing SIMULATED_WALLET transaction: ref={}, amount={}, attempt={}",
                context.getTransactionReference(), context.getAmount(), context.getAttemptNumber());

        simulateProcessingLatency();
        evaluateSimulatedFaults(context);

        long latency = System.currentTimeMillis() - start;
        return ProcessResult.success("Simulated wallet balance transfer validated", latency);
    }

    @Override
    public PaymentMethod getSupportedMethod() {
        return PaymentMethod.SIMULATED_WALLET;
    }
}
