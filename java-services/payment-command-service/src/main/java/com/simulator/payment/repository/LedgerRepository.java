package com.simulator.payment.repository;

import com.simulator.payment.model.enums.LedgerEntryType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;

@Repository
public class LedgerRepository {

    private final JdbcTemplate jdbcTemplate;

    public LedgerRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void insertEntry(Long transactionId, Long accountId, LedgerEntryType entryType,
                            BigDecimal amount, BigDecimal balanceAfter, String description) {
        String sql = """
            INSERT INTO ledger_entries (
                transaction_id, account_id, entry_type, amount, balance_after, description
            ) VALUES (?, ?, ?, ?, ?, ?)
        """;
        jdbcTemplate.update(sql, transactionId, accountId, entryType.name(), amount, balanceAfter, description);
    }
}
