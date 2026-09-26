package com.simulator.payment.engine;

import com.simulator.payment.exception.InvalidPaymentException;
import com.simulator.payment.model.enums.PaymentMethod;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class PaymentProcessorFactory {

    private final Map<PaymentMethod, PaymentProcessor> processorMap = new EnumMap<>(PaymentMethod.class);

    public PaymentProcessorFactory(List<PaymentProcessor> processors) {
        for (PaymentProcessor processor : processors) {
            processorMap.put(processor.getSupportedMethod(), processor);
        }
    }

    public PaymentProcessor getProcessor(PaymentMethod method) {
        PaymentProcessor processor = processorMap.get(method);
        if (processor == null) {
            throw new InvalidPaymentException("Unsupported payment method: " + method);
        }
        return processor;
    }
}
