package com.simulator.payment.engine;

public class ProcessResult {
    private final boolean success;
    private final String responseCode;
    private final String message;
    private final long latencyMs;

    public ProcessResult(boolean success, String responseCode, String message, long latencyMs) {
        this.success = success;
        this.responseCode = responseCode;
        this.message = message;
        this.latencyMs = latencyMs;
    }

    public static ProcessResult success(String message, long latencyMs) {
        return new ProcessResult(true, "00", message, latencyMs);
    }

    public static ProcessResult failure(String code, String message, long latencyMs) {
        return new ProcessResult(false, code, message, latencyMs);
    }

    public boolean isSuccess() { return success; }
    public String getResponseCode() { return responseCode; }
    public String getMessage() { return message; }
    public long getLatencyMs() { return latencyMs; }
}
