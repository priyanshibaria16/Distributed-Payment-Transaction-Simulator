package com.simulator.payment.repository;

import com.simulator.payment.model.enums.TransactionStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public class TransactionRepository {

    private final JdbcTemplate jdbcTemplate;

    public TransactionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Long createPendingTransaction(String txnRef, Long senderAccountId, Long receiverAccountId,
                                         BigDecimal amount, String currency, String paymentMethod,
                                         String description, String correlationId, String idempotencyKey) {
        String sql = """
            INSERT INTO transactions (
                transaction_reference, sender_account_id, receiver_account_id,
                amount, currency, payment_method, status, description,
                correlation_id, idempotency_key
            ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
            ON CONFLICT (transaction_reference) DO UPDATE
                SET updated_at = CURRENT_TIMESTAMP
            RETURNING id
        """;

        return jdbcTemplate.queryForObject(sql, Long.class,
                txnRef, senderAccountId, receiverAccountId, amount, currency,
                paymentMethod, description, correlationId, idempotencyKey);
    }

    public Long getTransactionIdByReference(String txnRef) {
        String sql = "SELECT id FROM transactions WHERE transaction_reference = ?";
        List<Long> list = jdbcTemplate.query(sql, (rs, rowNum) -> rs.getLong("id"), txnRef);
        return list.isEmpty() ? null : list.get(0);
    }

    public TransactionStatus getStatus(String txnRef) {
        String sql = "SELECT status FROM transactions WHERE transaction_reference = ?";
        List<String> list = jdbcTemplate.query(sql, (rs, rowNum) -> rs.getString("status"), txnRef);
        return list.isEmpty() ? null : TransactionStatus.valueOf(list.get(0));
    }

    public void updateStatus(String txnRef, TransactionStatus status, String failureCode, String failureMessage) {
        String sql = """
            UPDATE transactions
            SET status = ?, failure_code = ?, failure_message = ?, updated_at = CURRENT_TIMESTAMP
            WHERE transaction_reference = ?
        """;
        jdbcTemplate.update(sql, status.name(), failureCode, failureMessage, txnRef);
    }

    public void incrementRetryCount(String txnRef) {
        String sql = """
            UPDATE transactions
            SET retry_count = retry_count + 1, status = 'RETRYING', updated_at = CURRENT_TIMESTAMP
            WHERE transaction_reference = ?
        """;
        jdbcTemplate.update(sql, txnRef);
    }

    public void recordAttempt(Long transactionId, int attemptNumber, String status, String failureReason, long executionTimeMs) {
        String sql = """
            INSERT INTO transaction_attempts (
                transaction_id, attempt_number, status, failure_reason, execution_time_ms
            ) VALUES (?, ?, ?, ?, ?)
        """;
        jdbcTemplate.update(sql, transactionId, attemptNumber, status, failureReason, executionTimeMs);
    }
}
