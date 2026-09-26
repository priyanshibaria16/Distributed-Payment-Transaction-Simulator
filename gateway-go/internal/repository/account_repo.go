package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/distributed-payment-simulator/gateway-go/internal/models"
	"github.com/google/uuid"
)

type AccountRepository struct {
	db *sql.DB
}

func NewAccountRepository(db *sql.DB) *AccountRepository {
	return &AccountRepository{db: db}
}

func (r *AccountRepository) FindByUserID(ctx context.Context, userID int64) (*models.Account, error) {
	query := `
		SELECT id, user_id, account_number, currency, balance, status, created_at, updated_at
		FROM accounts
		WHERE user_id = $1
		LIMIT 1
	`
	row := r.db.QueryRowContext(ctx, query, userID)

	var acc models.Account
	err := row.Scan(&acc.ID, &acc.UserID, &acc.AccountNumber, &acc.Currency, &acc.Balance, &acc.Status, &acc.CreatedAt, &acc.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &acc, nil
}

func (r *AccountRepository) FindByID(ctx context.Context, id int64) (*models.Account, error) {
	query := `
		SELECT id, user_id, account_number, currency, balance, status, created_at, updated_at
		FROM accounts
		WHERE id = $1
	`
	row := r.db.QueryRowContext(ctx, query, id)

	var acc models.Account
	err := row.Scan(&acc.ID, &acc.UserID, &acc.AccountNumber, &acc.Currency, &acc.Balance, &acc.Status, &acc.CreatedAt, &acc.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &acc, nil
}

func (r *AccountRepository) TopUp(ctx context.Context, userID int64, amount float64) (*models.Account, *models.Transaction, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback()

	// 1. Lock account row for update
	lockQuery := `
		SELECT id, user_id, account_number, currency, balance, status, created_at, updated_at
		FROM accounts
		WHERE user_id = $1
		FOR UPDATE
	`
	var acc models.Account
	err = tx.QueryRowContext(ctx, lockQuery, userID).Scan(
		&acc.ID, &acc.UserID, &acc.AccountNumber, &acc.Currency, &acc.Balance, &acc.Status, &acc.CreatedAt, &acc.UpdatedAt,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("account not found: %w", err)
	}

	newBalance := acc.Balance + amount

	// 2. Update balance
	updateQuery := `
		UPDATE accounts
		SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
		RETURNING balance, updated_at
	`
	err = tx.QueryRowContext(ctx, updateQuery, amount, acc.ID).Scan(&acc.Balance, &acc.UpdatedAt)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to update balance: %w", err)
	}

	// 3. Insert system funding transaction record
	txnRef := fmt.Sprintf("TXN-TOPUP-%s", uuid.New().String()[:8])
	corrID := fmt.Sprintf("CORR-%s", uuid.New().String()[:8])
	var txn models.Transaction
	txnQuery := `
		INSERT INTO transactions (
			transaction_reference, receiver_account_id, amount, currency,
			payment_method, status, description, correlation_id
		) VALUES ($1, $2, $3, $4, 'SIMULATED_WALLET', 'SUCCESS', 'Simulated account top-up funds grant', $5)
		RETURNING id, transaction_reference, receiver_account_id, amount, currency, payment_method, status, description, correlation_id, created_at, updated_at
	`
	err = tx.QueryRowContext(ctx, txnQuery, txnRef, acc.ID, amount, acc.Currency, corrID).Scan(
		&txn.ID, &txn.TransactionReference, &txn.ReceiverAccountID, &txn.Amount,
		&txn.Currency, &txn.PaymentMethod, &txn.Status, &txn.Description, &txn.CorrelationID,
		&txn.CreatedAt, &txn.UpdatedAt,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to insert transaction: %w", err)
	}

	// 4. Insert ledger entry (CREDIT)
	ledgerQuery := `
		INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description)
		VALUES ($1, $2, 'CREDIT', $3, $4, 'Simulated top-up funding credit')
	`
	_, err = tx.ExecContext(ctx, ledgerQuery, txn.ID, acc.ID, amount, newBalance)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to insert ledger entry: %w", err)
	}

	// 5. Insert audit log
	auditQuery := `
		INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details)
		VALUES ('ACCOUNT', $1, 'SIMULATED_TOPUP', $2, json_build_object('amount', $3::numeric, 'balanceAfter', $4::numeric))
	`
	_, _ = tx.ExecContext(ctx, auditQuery, fmt.Sprintf("%d", acc.ID), fmt.Sprintf("USER_%d", userID), amount, newBalance)

	if err = tx.Commit(); err != nil {
		return nil, nil, err
	}

	return &acc, &txn, nil
}
