package com.simulator.payment;

import com.simulator.payment.engine.*;
import com.simulator.payment.model.enums.PaymentMethod;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PaymentProcessorFactoryTest {

    private PaymentProcessorFactory factory;

    @BeforeEach
    void setUp() {
        List<PaymentProcessor> processors = List.of(
                new SimulatedUpiProcessor(),
                new SimulatedCardProcessor(),
                new SimulatedWalletProcessor()
        );
        factory = new PaymentProcessorFactory(processors);
    }

    @Test
    @DisplayName("Should correctly return SimulatedUpiProcessor for SIMULATED_UPI")
    void shouldReturnUpiProcessor() {
        PaymentProcessor processor = factory.getProcessor(PaymentMethod.SIMULATED_UPI);
        assertNotNull(processor);
        assertInstanceOf(SimulatedUpiProcessor.class, processor);
        assertEquals(PaymentMethod.SIMULATED_UPI, processor.getSupportedMethod());
    }

    @Test
    @DisplayName("Should correctly return SimulatedCardProcessor for SIMULATED_CARD")
    void shouldReturnCardProcessor() {
        PaymentProcessor processor = factory.getProcessor(PaymentMethod.SIMULATED_CARD);
        assertNotNull(processor);
        assertInstanceOf(SimulatedCardProcessor.class, processor);
        assertEquals(PaymentMethod.SIMULATED_CARD, processor.getSupportedMethod());
    }

    @Test
    @DisplayName("Should correctly return SimulatedWalletProcessor for SIMULATED_WALLET")
    void shouldReturnWalletProcessor() {
        PaymentProcessor processor = factory.getProcessor(PaymentMethod.SIMULATED_WALLET);
        assertNotNull(processor);
        assertInstanceOf(SimulatedWalletProcessor.class, processor);
        assertEquals(PaymentMethod.SIMULATED_WALLET, processor.getSupportedMethod());
    }
}
