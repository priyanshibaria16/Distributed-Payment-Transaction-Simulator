-- ==============================================================================
-- Migration 02: Seed Data for Distributed Payment Simulator
-- ==============================================================================

-- 1. Insert Roles
INSERT INTO roles (id, name, description) VALUES
    (1, 'ROLE_ADMIN', 'Platform Administrator with full oversight and telemetry access'),
    (2, 'ROLE_USER', 'Standard simulated payment account holder')
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Test Users
-- Bcrypt hash for 'SecurePassword123': $2a$10$7vM/YVv2u5fS.k5rZgNl9O7mH5n7d7vE2p3q4r5s6t7u8v9w0x1y2 (or self-seeded on init)
-- We use a known valid bcrypt hash for 'SecurePassword123'
INSERT INTO users (id, email, password_hash, full_name, status) VALUES
    (1, 'admin@simulator.local', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/bBfQsm0h.Z6QJmYlC.bT1Z6qX0r2', 'System Administrator', 'ACTIVE'),
    (2, 'alice@simulator.local', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/bBfQsm0h.Z6QJmYlC.bT1Z6qX0r2', 'Alice Sharma', 'ACTIVE'),
    (3, 'bob@simulator.local', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/bBfQsm0h.Z6QJmYlC.bT1Z6qX0r2', 'Bob Verma', 'ACTIVE'),
    (4, 'priyanshi@simulator.local', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/bBfQsm0h.Z6QJmYlC.bT1Z6qX0r2', 'Priyanshi Patel', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

-- Reset sequence to accommodate manually specified IDs
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- 3. Assign Roles
INSERT INTO user_roles (user_id, role_id) VALUES
    (1, 1), -- Admin gets ROLE_ADMIN
    (1, 2), -- Admin also gets ROLE_USER
    (2, 2), -- Alice gets ROLE_USER
    (3, 2), -- Bob gets ROLE_USER
    (4, 2)  -- Priyanshi gets ROLE_USER
ON CONFLICT DO NOTHING;

-- 4. Create Simulated Wallets / Accounts
INSERT INTO accounts (id, user_id, account_number, currency, balance, status) VALUES
    (1, 1, 'ACC-ADM-100001', 'INR', 100000.0000, 'ACTIVE'),
    (2, 2, 'ACC-ALC-200002', 'INR', 50000.0000, 'ACTIVE'),
    (3, 3, 'ACC-BOB-300003', 'INR', 10000.0000, 'ACTIVE'),
    (4, 4, 'ACC-PRI-400004', 'INR', 25000.0000, 'ACTIVE')
ON CONFLICT (account_number) DO NOTHING;

SELECT setval('accounts_id_seq', (SELECT MAX(id) FROM accounts));

-- 5. Seed Initial System Funding Transactions & Ledger Entries
INSERT INTO transactions (id, transaction_reference, sender_account_id, receiver_account_id, amount, currency, payment_method, status, description, correlation_id) VALUES
    (1, 'TXN-INIT-OPEN-001', 1, 2, 50000.0000, 'INR', 'SIMULATED_WALLET', 'SUCCESS', 'Initial simulated wallet opening grant', 'CORR-SYS-INIT-001'),
    (2, 'TXN-INIT-OPEN-002', 1, 3, 10000.0000, 'INR', 'SIMULATED_WALLET', 'SUCCESS', 'Initial simulated wallet opening grant', 'CORR-SYS-INIT-002'),
    (3, 'TXN-INIT-OPEN-003', 1, 4, 25000.0000, 'INR', 'SIMULATED_WALLET', 'SUCCESS', 'Initial simulated wallet opening grant', 'CORR-SYS-INIT-003')
ON CONFLICT (transaction_reference) DO NOTHING;

SELECT setval('transactions_id_seq', (SELECT MAX(id) FROM transactions));

INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
    (1, 2, 'CREDIT', 50000.0000, 50000.0000, 'Initial simulated balance grant'),
    (2, 3, 'CREDIT', 10000.0000, 10000.0000, 'Initial simulated balance grant'),
    (3, 4, 'CREDIT', 25000.0000, 25000.0000, 'Initial simulated balance grant')
ON CONFLICT DO NOTHING;
