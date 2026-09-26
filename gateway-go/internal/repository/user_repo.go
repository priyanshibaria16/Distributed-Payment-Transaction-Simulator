package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/distributed-payment-simulator/gateway-go/internal/models"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT u.id, u.email, u.password_hash, u.full_name, u.status, u.created_at, u.updated_at
		FROM users u
		WHERE u.email = $1
	`
	row := r.db.QueryRowContext(ctx, query, email)

	var u models.User
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.Status, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	// Fetch roles
	roles, err := r.GetUserRoles(ctx, u.ID)
	if err == nil {
		u.Roles = roles
	}

	return &u, nil
}

func (r *UserRepository) FindByID(ctx context.Context, id int64) (*models.User, error) {
	query := `
		SELECT u.id, u.email, u.password_hash, u.full_name, u.status, u.created_at, u.updated_at
		FROM users u
		WHERE u.id = $1
	`
	row := r.db.QueryRowContext(ctx, query, id)

	var u models.User
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.Status, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	roles, err := r.GetUserRoles(ctx, u.ID)
	if err == nil {
		u.Roles = roles
	}

	return &u, nil
}

func (r *UserRepository) GetUserRoles(ctx context.Context, userID int64) ([]string, error) {
	query := `
		SELECT r.name
		FROM roles r
		JOIN user_roles ur ON r.id = ur.role_id
		WHERE ur.user_id = $1
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err == nil {
			roles = append(roles, role)
		}
	}
	return roles, nil
}

func (r *UserRepository) Create(ctx context.Context, email, passwordHash, fullName string) (*models.User, *models.Account, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback()

	// 1. Insert User
	var user models.User
	userQuery := `
		INSERT INTO users (email, password_hash, full_name, status)
		VALUES ($1, $2, $3, 'ACTIVE')
		RETURNING id, email, full_name, status, created_at, updated_at
	`
	err = tx.QueryRowContext(ctx, userQuery, email, passwordHash, fullName).Scan(
		&user.ID, &user.Email, &user.FullName, &user.Status, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to insert user: %w", err)
	}

	// 2. Assign default ROLE_USER
	roleQuery := `
		INSERT INTO user_roles (user_id, role_id)
		SELECT $1, id FROM roles WHERE name = 'ROLE_USER'
	`
	_, err = tx.ExecContext(ctx, roleQuery, user.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to assign default role: %w", err)
	}
	user.Roles = []string{"ROLE_USER"}

	// 3. Create simulated wallet account with initial 0.00 balance
	accNumber := fmt.Sprintf("ACC-SIM-%06d", user.ID)
	var account models.Account
	accountQuery := `
		INSERT INTO accounts (user_id, account_number, currency, balance, status)
		VALUES ($1, $2, 'INR', 0.0000, 'ACTIVE')
		RETURNING id, user_id, account_number, currency, balance, status, created_at, updated_at
	`
	err = tx.QueryRowContext(ctx, accountQuery, user.ID, accNumber).Scan(
		&account.ID, &account.UserID, &account.AccountNumber, &account.Currency,
		&account.Balance, &account.Status, &account.CreatedAt, &account.UpdatedAt,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create simulated account: %w", err)
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return nil, nil, err
	}

	return &user, &account, nil
}

func (r *UserRepository) ListRecipients(ctx context.Context, currentUserID int64) ([]models.User, error) {
	query := `
		SELECT u.id, u.email, u.full_name, u.status, u.created_at, u.updated_at
		FROM users u
		WHERE u.id != $1 AND u.status = 'ACTIVE'
		ORDER BY u.full_name ASC
	`
	rows, err := r.db.QueryContext(ctx, query, currentUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Email, &u.FullName, &u.Status, &u.CreatedAt, &u.UpdatedAt); err == nil {
			users = append(users, u)
		}
	}
	return users, nil
}
