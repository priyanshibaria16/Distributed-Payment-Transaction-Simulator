# Database Documentation - Distributed Payment Simulator

## Engine & Persistence
- **RDBMS**: PostgreSQL 16+
- **Monetary Precision**: `NUMERIC(19, 4)` (no floating point storage)
- **Timezone**: All timestamps are stored with timezone (`TIMESTAMPTZ`) in UTC.

## Schema Migrations
1. `migrations/01_schema.sql`: Core schema defining users, roles, accounts, transactions, double-entry ledger entries, idempotency keys, attempts, refunds, and audit logs.
2. `migrations/02_seed.sql`: Realistic seed accounts (Admin, Alice, Bob, Priyanshi) with verified opening balances and ledger records.

## Default Development Accounts
| User | Email | Role | Initial Balance | Initial Password |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@simulator.local` | ROLE_ADMIN, ROLE_USER | ₹100,000.00 | `SecurePassword123` |
| **Alice** | `alice@simulator.local` | ROLE_USER | ₹50,000.00 | `SecurePassword123` |
| **Bob** | `bob@simulator.local` | ROLE_USER | ₹10,000.00 | `SecurePassword123` |
| **Priyanshi**| `priyanshi@simulator.local` | ROLE_USER | ₹25,000.00 | `SecurePassword123` |

*Note: For testing, the Go gateway also auto-hashes passwords or accepts `SecurePassword123`.*
