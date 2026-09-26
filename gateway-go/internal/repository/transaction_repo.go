package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/distributed-payment-simulator/gateway-go/internal/models"
)

type TransactionRepository struct {
	db *sql.DB
}

func NewTransactionRepository(db *sql.DB) *TransactionRepository {
	return &TransactionRepository{db: db}
}

type IdempotencyResult struct {
	IsDuplicate  bool
	Status       string
	ResponseCode int
	ResponseBody string
}

func (r *TransactionRepository) CheckOrSetIdempotency(ctx context.Context, key string, userID int64, requestHash string) (*IdempotencyResult, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	query := `
		SELECT request_hash, status, COALESCE(response_code, 0), COALESCE(response_body, '')
		FROM idempotency_keys
		WHERE key = $1
		FOR UPDATE
	`
	row := tx.QueryRowContext(ctx, query, key)

	var existingHash, status, responseBody string
	var responseCode int
	err = row.Scan(&existingHash, &status, &responseCode, &responseBody)
	if err == nil {
		// Key exists
		if existingHash != requestHash {
			return nil, errors.New("PAYLOAD_MISMATCH: Idempotency key already used with different payload")
		}
		_ = tx.Commit()
		return &IdempotencyResult{
			IsDuplicate:  true,
			Status:       status,
			ResponseCode: responseCode,
			ResponseBody: responseBody,
		}, nil
	}

	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	// Insert new in-progress key
	insertQuery := `
		INSERT INTO idempotency_keys (key, user_id, request_hash, status)
		VALUES ($1, $2, $3, 'IN_PROGRESS')
	`
	_, err = tx.ExecContext(ctx, insertQuery, key, userID, requestHash)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return &IdempotencyResult{IsDuplicate: false}, nil
}

func (r *TransactionRepository) UpdateIdempotency(ctx context.Context, key string, responseCode int, responseBody, status string) error {
	query := `
		UPDATE idempotency_keys
		SET response_code = $1, response_body = $2, status = $3, updated_at = CURRENT_TIMESTAMP
		WHERE key = $4
	`
	_, err := r.db.ExecContext(ctx, query, responseCode, responseBody, status, key)
	return err
}

func (r *TransactionRepository) GetByReference(ctx context.Context, ref string) (*models.Transaction, error) {
	query := `
		SELECT 
			t.id, t.transaction_reference, t.sender_account_id, t.receiver_account_id,
			t.amount, t.currency, t.payment_method, t.status, t.description,
			t.idempotency_key, t.retry_count, t.max_retries, t.failure_code, t.failure_message,
			t.correlation_id, t.created_at, t.updated_at,
			su.full_name as sender_name, ru.full_name as receiver_name
		FROM transactions t
		LEFT JOIN accounts sa ON t.sender_account_id = sa.id
		LEFT JOIN users su ON sa.user_id = su.id
		JOIN accounts ra ON t.receiver_account_id = ra.id
		JOIN users ru ON ra.user_id = ru.id
		WHERE t.transaction_reference = $1
	`
	row := r.db.QueryRowContext(ctx, query, ref)

	var txn models.Transaction
	var desc, idempKey, failCode, failMsg, senderName, receiverName sql.NullString
	var senderAccID sql.NullInt64

	err := row.Scan(
		&txn.ID, &txn.TransactionReference, &senderAccID, &txn.ReceiverAccountID,
		&txn.Amount, &txn.Currency, &txn.PaymentMethod, &txn.Status, &desc,
		&idempKey, &txn.RetryCount, &txn.MaxRetries, &failCode, &failMsg,
		&txn.CorrelationID, &txn.CreatedAt, &txn.UpdatedAt,
		&senderName, &receiverName,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	if senderAccID.Valid {
		txn.SenderAccountID = &senderAccID.Int64
	}
	if desc.Valid {
		txn.Description = desc.String
	}
	if idempKey.Valid {
		txn.IdempotencyKey = &idempKey.String
	}
	if failCode.Valid {
		txn.FailureCode = &failCode.String
	}
	if failMsg.Valid {
		txn.FailureMessage = &failMsg.String
	}
	if senderName.Valid {
		txn.SenderName = &senderName.String
	}
	if receiverName.Valid {
		txn.ReceiverName = &receiverName.String
	}

	return &txn, nil
}

func (r *TransactionRepository) ListUserTransactions(ctx context.Context, userID int64, status, method string, limit, offset int) ([]models.Transaction, int64, error) {
	whereClause := `
		WHERE (sa.user_id = $1 OR ra.user_id = $1)
	`
	args := []interface{}{userID}
	paramIdx := 2

	if status != "" {
		whereClause += fmt.Sprintf(" AND t.status = $%d", paramIdx)
		args = append(args, status)
		paramIdx++
	}
	if method != "" {
		whereClause += fmt.Sprintf(" AND t.payment_method = $%d", paramIdx)
		args = append(args, method)
		paramIdx++
	}

	countQuery := `
		SELECT COUNT(DISTINCT t.id)
		FROM transactions t
		LEFT JOIN accounts sa ON t.sender_account_id = sa.id
		JOIN accounts ra ON t.receiver_account_id = ra.id
	` + whereClause

	var total int64
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT 
			t.id, t.transaction_reference, t.sender_account_id, t.receiver_account_id,
			t.amount, t.currency, t.payment_method, t.status, t.description,
			t.idempotency_key, t.retry_count, t.max_retries, t.failure_code, t.failure_message,
			t.correlation_id, t.created_at, t.updated_at,
			su.full_name as sender_name, ru.full_name as receiver_name
		FROM transactions t
		LEFT JOIN accounts sa ON t.sender_account_id = sa.id
		LEFT JOIN users su ON sa.user_id = su.id
		JOIN accounts ra ON t.receiver_account_id = ra.id
		JOIN users ru ON ra.user_id = ru.id
	` + whereClause + fmt.Sprintf(" ORDER BY t.created_at DESC LIMIT $%d OFFSET $%d", paramIdx, paramIdx+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var transactions []models.Transaction
	for rows.Next() {
		var txn models.Transaction
		var desc, idempKey, failCode, failMsg, senderName, receiverName sql.NullString
		var senderAccID sql.NullInt64

		err := rows.Scan(
			&txn.ID, &txn.TransactionReference, &senderAccID, &txn.ReceiverAccountID,
			&txn.Amount, &txn.Currency, &txn.PaymentMethod, &txn.Status, &desc,
			&idempKey, &txn.RetryCount, &txn.MaxRetries, &failCode, &failMsg,
			&txn.CorrelationID, &txn.CreatedAt, &txn.UpdatedAt,
			&senderName, &receiverName,
		)
		if err == nil {
			if senderAccID.Valid {
				txn.SenderAccountID = &senderAccID.Int64
			}
			if desc.Valid {
				txn.Description = desc.String
			}
			if idempKey.Valid {
				txn.IdempotencyKey = &idempKey.String
			}
			if failCode.Valid {
				txn.FailureCode = &failCode.String
			}
			if failMsg.Valid {
				txn.FailureMessage = &failMsg.String
			}
			if senderName.Valid {
				txn.SenderName = &senderName.String
			}
			if receiverName.Valid {
				txn.ReceiverName = &receiverName.String
			}
			transactions = append(transactions, txn)
		}
	}

	return transactions, total, nil
}

func (r *TransactionRepository) ListAdminTransactions(ctx context.Context, status string, limit, offset int) ([]models.Transaction, int64, error) {
	whereClause := ""
	args := []interface{}{}
	paramIdx := 1

	if status != "" {
		whereClause = fmt.Sprintf("WHERE t.status = $%d", paramIdx)
		args = append(args, status)
		paramIdx++
	}

	countQuery := "SELECT COUNT(*) FROM transactions t " + whereClause
	var total int64
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT 
			t.id, t.transaction_reference, t.sender_account_id, t.receiver_account_id,
			t.amount, t.currency, t.payment_method, t.status, t.description,
			t.idempotency_key, t.retry_count, t.max_retries, t.failure_code, t.failure_message,
			t.correlation_id, t.created_at, t.updated_at,
			su.full_name as sender_name, ru.full_name as receiver_name
		FROM transactions t
		LEFT JOIN accounts sa ON t.sender_account_id = sa.id
		LEFT JOIN users su ON sa.user_id = su.id
		JOIN accounts ra ON t.receiver_account_id = ra.id
		JOIN users ru ON ra.user_id = ru.id
	` + whereClause + fmt.Sprintf(" ORDER BY t.created_at DESC LIMIT $%d OFFSET $%d", paramIdx, paramIdx+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var transactions []models.Transaction
	for rows.Next() {
		var txn models.Transaction
		var desc, idempKey, failCode, failMsg, senderName, receiverName sql.NullString
		var senderAccID sql.NullInt64

		err := rows.Scan(
			&txn.ID, &txn.TransactionReference, &senderAccID, &txn.ReceiverAccountID,
			&txn.Amount, &txn.Currency, &txn.PaymentMethod, &txn.Status, &desc,
			&idempKey, &txn.RetryCount, &txn.MaxRetries, &failCode, &failMsg,
			&txn.CorrelationID, &txn.CreatedAt, &txn.UpdatedAt,
			&senderName, &receiverName,
		)
		if err == nil {
			if senderAccID.Valid {
				txn.SenderAccountID = &senderAccID.Int64
			}
			if desc.Valid {
				txn.Description = desc.String
			}
			if idempKey.Valid {
				txn.IdempotencyKey = &idempKey.String
			}
			if failCode.Valid {
				txn.FailureCode = &failCode.String
			}
			if failMsg.Valid {
				txn.FailureMessage = &failMsg.String
			}
			if senderName.Valid {
				txn.SenderName = &senderName.String
			}
			if receiverName.Valid {
				txn.ReceiverName = &receiverName.String
			}
			transactions = append(transactions, txn)
		}
	}

	return transactions, total, nil
}

func (r *TransactionRepository) GetAdminStats(ctx context.Context) (*models.AdminStatistics, error) {
	stats := &models.AdminStatistics{
		PaymentMethodCounts: make(map[string]int64),
	}

	// 1. Overall counts
	summaryQuery := `
		SELECT 
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE status = 'SUCCESS') as successful,
			COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
			COUNT(*) FILTER (WHERE status IN ('PENDING', 'PROCESSING', 'RETRYING')) as pending,
			COALESCE(SUM(amount) FILTER (WHERE status = 'SUCCESS'), 0) as total_volume,
			COALESCE(SUM(retry_count), 0) as total_retries
		FROM transactions
	`
	err := r.db.QueryRowContext(ctx, summaryQuery).Scan(
		&stats.TotalTransactions, &stats.SuccessfulCount, &stats.FailedCount,
		&stats.PendingCount, &stats.TotalVolume, &stats.RecentRetriesCount,
	)
	if err != nil {
		return nil, err
	}

	// 2. Counts per payment method
	methodQuery := `
		SELECT payment_method, COUNT(*)
		FROM transactions
		GROUP BY payment_method
	`
	rows, err := r.db.QueryContext(ctx, methodQuery)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var method string
			var count int64
			if err := rows.Scan(&method, &count); err == nil {
				stats.PaymentMethodCounts[method] = count
			}
		}
	}

	return stats, nil
}
