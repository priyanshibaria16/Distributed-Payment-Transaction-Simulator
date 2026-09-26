package com.simulator.payment.model.enums;

public enum PaymentMethod {
    SIMULATED_UPI,
    SIMULATED_CARD,
    SIMULATED_WALLET;

    public static PaymentMethod fromString(String value) {
        for (PaymentMethod method : values()) {
            if (method.name().equalsIgnoreCase(value)) {
                return method;
            }
        }
        return SIMULATED_UPI;
    }
}
