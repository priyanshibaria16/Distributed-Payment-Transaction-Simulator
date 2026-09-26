package models

import "time"

type User struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FullName     string    `json:"fullName"`
	Status       string    `json:"status"`
	Roles        []string  `json:"roles,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type Account struct {
	ID            int64     `json:"id"`
	UserID        int64     `json:"userId"`
	AccountNumber string    `json:"accountNumber"`
	Currency      string    `json:"currency"`
	Balance       float64   `json:"balance"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type Transaction struct {
	ID                   int64      `json:"id"`
	TransactionReference string     `json:"transactionReference"`
	SenderAccountID      *int64     `json:"senderAccountId"`
	ReceiverAccountID    int64      `json:"receiverAccountId"`
	Amount               float64    `json:"amount"`
	Currency             string     `json:"currency"`
	PaymentMethod        string     `json:"paymentMethod"`
	Status               string     `json:"status"`
	Description          string     `json:"description,omitempty"`
	IdempotencyKey       *string    `json:"idempotencyKey,omitempty"`
	RetryCount           int        `json:"retryCount"`
	MaxRetries           int        `json:"maxRetries"`
	FailureCode          *string    `json:"failureCode,omitempty"`
	FailureMessage       *string    `json:"failureMessage,omitempty"`
	CorrelationID        string     `json:"correlationId"`
	CreatedAt            time.Time  `json:"createdAt"`
	UpdatedAt            time.Time  `json:"updatedAt"`
	SenderName           *string    `json:"senderName,omitempty"`
	ReceiverName         *string    `json:"receiverName,omitempty"`
}

type LedgerEntry struct {
	ID            int64     `json:"id"`
	TransactionID int64     `json:"transactionId"`
	AccountID     int64     `json:"accountId"`
	EntryType     string    `json:"entryType"` // DEBIT, CREDIT
	Amount        float64   `json:"amount"`
	BalanceAfter  float64   `json:"balanceAfter"`
	Description   string    `json:"description,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
}

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type TopUpRequest struct {
	Amount float64 `json:"amount"`
}

type CreatePaymentRequest struct {
	ReceiverID    int64   `json:"receiverId"` // User ID of receiver
	Amount        float64 `json:"amount"`
	Currency      string  `json:"currency"`
	PaymentMethod string  `json:"paymentMethod"`
	Description   string  `json:"description"`
}

type PaymentAcceptedResponse struct {
	TransactionID string `json:"transactionId"`
	Status        string `json:"status"`
	Message       string `json:"message"`
	CorrelationID string `json:"correlationId"`
}

type RefundRequest struct {
	Reason string `json:"reason"`
}

type AdminStatistics struct {
	TotalTransactions   int64              `json:"totalTransactions"`
	SuccessfulCount     int64              `json:"successfulCount"`
	FailedCount         int64              `json:"failedCount"`
	PendingCount        int64              `json:"pendingCount"`
	TotalVolume         float64            `json:"totalVolume"`
	PaymentMethodCounts map[string]int64   `json:"paymentMethodCounts"`
	RecentRetriesCount  int64              `json:"recentRetriesCount"`
}
