package com.simulator.payment.controller;

import com.simulator.payment.model.event.PaymentEvent;
import com.simulator.payment.model.event.RefundEvent;
import com.simulator.payment.service.PaymentCommandService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/internal/v1")
public class PaymentCommandController {

    private static final Logger log = LoggerFactory.getLogger(PaymentCommandController.class);

    private final PaymentCommandService commandService;

    @Value("${simulator.security.internal-secret:internal_service_secret_bridge_99x}")
    private String expectedInternalSecret;

    public PaymentCommandController(PaymentCommandService commandService) {
        this.commandService = commandService;
    }

    private boolean isAuthorized(String secret) {
        return expectedInternalSecret != null && expectedInternalSecret.equals(secret);
    }

    @PostMapping("/commands/payments")
    public ResponseEntity<?> submitPaymentCommand(
            @RequestHeader(value = "X-Internal-Secret", required = false) String secret,
            @RequestBody Map<String, Object> payload) {

        if (!isAuthorized(secret)) {
            log.warn("Unauthorized internal payment command call rejected");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Unauthorized internal access"));
        }

        try {
            String txnRef = (String) payload.get("transactionReference");
            Long senderId = Long.valueOf(payload.get("senderAccountId").toString());
            Long receiverId = Long.valueOf(payload.get("receiverAccountId").toString());
            BigDecimal amount = new BigDecimal(payload.get("amount").toString());
            String currency = (String) payload.getOrDefault("currency", "INR");
            String paymentMethod = (String) payload.getOrDefault("paymentMethod", "SIMULATED_UPI");
            String description = (String) payload.getOrDefault("description", "");
            String correlationId = (String) payload.get("correlationId");
            String idempotencyKey = (String) payload.get("idempotencyKey");

            PaymentEvent event = commandService.publishPaymentCommand(
                    txnRef, senderId, receiverId, amount, currency,
                    paymentMethod, description, correlationId, idempotencyKey
            );

            return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of(
                    "success", true,
                    "transactionId", txnRef,
                    "status", "PENDING",
                    "message", "Payment command published to queue",
                    "correlationId", correlationId
            ));
        } catch (Exception e) {
            log.error("Failed to enqueue payment command: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "success", false,
                    "errorCode", "BROKER_UNAVAILABLE",
                    "message", "Failed to enqueue payment command: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/commands/refunds")
    public ResponseEntity<?> submitRefundCommand(
            @RequestHeader(value = "X-Internal-Secret", required = false) String secret,
            @RequestBody Map<String, Object> payload) {

        if (!isAuthorized(secret)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Unauthorized"));
        }

        try {
            String origTxn = (String) payload.get("originalTransactionReference");
            String refundRef = (String) payload.get("refundReference");
            Long userId = Long.valueOf(payload.get("requestedByUserId").toString());
            BigDecimal amount = new BigDecimal(payload.get("amount").toString());
            String currency = (String) payload.getOrDefault("currency", "INR");
            String reason = (String) payload.getOrDefault("reason", "Refund requested");
            String corrId = (String) payload.get("correlationId");

            RefundEvent event = commandService.publishRefundCommand(
                    origTxn, refundRef, userId, amount, currency, reason, corrId
            );

            return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of(
                    "success", true,
                    "refundReference", refundRef,
                    "status", "REFUND_PENDING",
                    "message", "Refund command published to queue",
                    "correlationId", corrId
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "success", false,
                    "errorCode", "BROKER_UNAVAILABLE",
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "payment-command-service"
        ));
    }
}
