package com.simulator.payment.model.enums;

public enum FailureMode {
    NONE,
    RANDOM_TRANSIENT,
    DETERMINISTIC_FIRST_ATTEMPT,
    PERMANENT_FAILURE
}
