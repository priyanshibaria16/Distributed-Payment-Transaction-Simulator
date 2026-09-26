package clients

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/distributed-payment-simulator/gateway-go/internal/config"
)

type JavaCommandClient struct {
	baseURL    string
	secret     string
	httpClient *http.Client
}

func NewJavaCommandClient(cfg *config.Config) *JavaCommandClient {
	return &JavaCommandClient{
		baseURL: cfg.JavaCommandServiceURL,
		secret:  cfg.InternalAPISecret,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type PaymentCommandPayload struct {
	TransactionReference string  `json:"transactionReference"`
	SenderAccountID      int64   `json:"senderAccountId"`
	ReceiverAccountID    int64   `json:"receiverAccountId"`
	Amount               float64 `json:"amount"`
	Currency             string  `json:"currency"`
	PaymentMethod        string  `json:"paymentMethod"`
	Description          string  `json:"description"`
	CorrelationID        string  `json:"correlationId"`
	IdempotencyKey       string  `json:"idempotencyKey"`
}

type CommandResponse struct {
	Success       bool   `json:"success"`
	TransactionID string `json:"transactionId"`
	Status        string `json:"status"`
	Message       string `json:"message"`
	CorrelationID string `json:"correlationId"`
	ErrorCode     string `json:"errorCode,omitempty"`
}

func (c *JavaCommandClient) SubmitPaymentCommand(ctx context.Context, cmd *PaymentCommandPayload) (*CommandResponse, error) {
	url := fmt.Sprintf("%s/internal/v1/commands/payments", c.baseURL)

	bodyBytes, err := json.Marshal(cmd)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payment command: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create http request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Secret", c.secret)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call java command service: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read java command service response: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		return nil, fmt.Errorf("java service returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var cmdResp CommandResponse
	if err := json.Unmarshal(respBody, &cmdResp); err != nil {
		return nil, fmt.Errorf("failed to decode java command service response: %w", err)
	}

	return &cmdResp, nil
}

type RefundCommandPayload struct {
	OriginalTransactionReference string  `json:"originalTransactionReference"`
	RefundReference              string  `json:"refundReference"`
	RequestedByUserID            int64   `json:"requestedByUserId"`
	Amount                       float64 `json:"amount"`
	Currency                     string  `json:"currency"`
	Reason                       string  `json:"reason"`
	CorrelationID                string  `json:"correlationId"`
}

func (c *JavaCommandClient) SubmitRefundCommand(ctx context.Context, cmd *RefundCommandPayload) (*CommandResponse, error) {
	url := fmt.Sprintf("%s/internal/v1/commands/refunds", c.baseURL)

	bodyBytes, err := json.Marshal(cmd)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal refund command: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create http request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Secret", c.secret)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call java command service: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read java command service response: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		return nil, fmt.Errorf("java service returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var cmdResp CommandResponse
	if err := json.Unmarshal(respBody, &cmdResp); err != nil {
		return nil, fmt.Errorf("failed to decode refund response: %w", err)
	}

	return &cmdResp, nil
}
