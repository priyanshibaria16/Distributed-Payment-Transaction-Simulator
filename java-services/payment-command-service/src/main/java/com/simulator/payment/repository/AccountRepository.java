package com.simulator.payment.repository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
public class AccountRepository {

    private static final Logger log = LoggerFactory.getLogger(AccountRepository.class);
    private final JdbcTemplate jdbcTemplate;

    public AccountRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Acquires pessimistic row locks on accounts in deterministic order (ascending account ID)
     * to eliminate potential deadlocks across concurrent worker threads.
     */
    public Map<Long, BigDecimal> lockAndGetBalances(Long accountId1, Long accountId2) {
        Long lowerId = Math.min(accountId1, accountId2);
        Long higherId = Math.max(accountId1, accountId2);

        String sql = "SELECT id, balance FROM accounts WHERE id IN (?, ?) ORDER BY id FOR UPDATE";

        Map<Long, BigDecimal> balances = new HashMap<>();
        jdbcTemplate.query(sql, rs -> {
            balances.put(rs.getLong("id"), rs.getBigDecimal("balance"));
        }, lowerId, higherId);

        return balances;
    }

    public BigDecimal getBalance(Long accountId) {
        String sql = "SELECT balance FROM accounts WHERE id = ?";
        List<BigDecimal> list = jdbcTemplate.query(sql, (rs, rowNum) -> rs.getBigDecimal("balance"), accountId);
        return list.isEmpty() ? null : list.get(0);
    }

    public void updateBalance(Long accountId, BigDecimal newBalance) {
        String sql = "UPDATE accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        jdbcTemplate.update(sql, newBalance, accountId);
    }

    public Long getUserIdForAccount(Long accountId) {
        String sql = "SELECT user_id FROM accounts WHERE id = ?";
        List<Long> list = jdbcTemplate.query(sql, (rs, rowNum) -> rs.getLong("user_id"), accountId);
        return list.isEmpty() ? null : list.get(0);
    }
}
