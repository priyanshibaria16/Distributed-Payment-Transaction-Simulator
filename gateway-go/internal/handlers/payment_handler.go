package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/distributed-payment-simulator/gateway-go/internal/clients"
	"github.com/distributed-payment-simulator/gateway-go/internal/middleware"
	"github.com/distributed-payment-simulator/gateway-go/internal/models"
	"github.com/distributed-payment-simulator/gateway-go/internal/repository"
	"github.com/distributed-payment-simulator/gateway-go/internal/utils"
	"github.com/google/uuid"
)

type PaymentHandler struct {
	txnRepo     *repository.TransactionRepository
	accountRepo *repository.AccountRepository
	userRepo    *repository.UserRepository
	javaClient  *clients.JavaCommandClient
}

func NewPaymentHandler(
	txnRepo *repository.TransactionRepository,
	accountRepo *repository.AccountRepository,
	userRepo *repository.UserRepository,
	javaClient *clients.JavaCommandClient,
) *PaymentHandler {
	return &PaymentHandler{
		txnRepo:     txnRepo,
		accountRepo: accountRepo,
		userRepo:    userRepo,
		javaClient:  javaClient,
	}
}

func (h *PaymentHandler) CreatePayment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Only POST allowed", "")
		return
	}

	claims := middleware.GetUserClaims(r.Context())
	if claims == nil {
		utils.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing user context", "")
		return
	}

	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if idempotencyKey == "" {
		idempotencyKey = fmt.Sprintf("IDEMP-%s", uuid.New().String())
	}

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		utils.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "Failed to read request payload", "")
		return
	}

	var req models.CreatePaymentRequest
	if err := json.Unmarshal(bodyBytes, &req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, "MALFORMED_JSON", "Invalid JSON format", "")
		return
	}

	// Payload validation
	if req.Amount <= 0 {
		utils.WriteError(w, http.StatusBadRequest, "INVALID_AMOUNT", "Payment amount must be greater than 0.00", "")
		return
	}
	if req.ReceiverID <= 0 {
		utils.WriteError(w, http.StatusBadRequest, "INVALID_RECEIVER", "Receiver ID must be specified", "")
		return
	}
	if req.ReceiverID == claims.UserID {
		utils.WriteError(w, http.StatusBadRequest, "SELF_PAYMENT_DISALLOWED", "Self-transfers are not allowed", "")
		return
	}

	if req.Currency == "" {
		req.Currency = "INR"
	}
	if req.PaymentMethod == "" {
		req.PaymentMethod = "SIMULATED_UPI"
	}

	// Calculate payload hash for idempotency integrity check
	hash := sha256.Sum256(bodyBytes)
	reqHash := hex.EncodeToString(hash[:])

	// Check or establish idempotency record
	idempResult, err := h.txnRepo.CheckOrSetIdempotency(r.Context(), idempotencyKey, claims.UserID, reqHash)
	if err != nil {
		if strings.Contains(err.Error(), "PAYLOAD_MISMATCH") {
			utils.WriteError(w, http.StatusUnprocessableEntity, "IDEMPOTENCY_PAYLOAD_MISMATCH", "Idempotency-Key was previously used with different parameters", "")
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "IDEMPOTENCY_CHECK_FAILED", err.Error(), "")
		return
	}

	if idempResult.IsDuplicate {
		if idempResult.Status == "COMPLETED" && idempResult.ResponseBody != "" {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Idempotent-Replay", "true")
			w.WriteHeader(idempResult.ResponseCode)
			_, _ = w.Write([]byte(idempResult.ResponseBody))
			return
		}
		// If in progress:
		utils.WriteError(w, http.StatusConflict, "REQUEST_IN_PROGRESS", "This payment is currently being processed. Please wait.", "")
		return
	}

	// Fetch sender account
	senderAccount, err := h.accountRepo.FindByUserID(r.Context(), claims.UserID)
	if err != nil || senderAccount == nil {
		utils.WriteError(w, http.StatusBadRequest, "SENDER_ACCOUNT_MISSING", "Sender has no active simulated account", "")
		return
	}

	// Fetch receiver account
	receiverAccount, err := h.accountRepo.FindByUserID(r.Context(), req.ReceiverID)
	if err != nil || receiverAccount == nil {
		utils.WriteError(w, http.StatusBadRequest, "RECEIVER_ACCOUNT_MISSING", "Receiver has no active simulated account", "")
		return
	}

	// Generate transaction reference and correlation ID
	txnRef := fmt.Sprintf("TXN-%s-%s", req.PaymentMethod[:3], strings.ReplaceAll(uuid.New().String()[:12], "-", ""))
	corrID := fmt.Sprintf("CORR-%s", uuid.New().String()[:10])

	cmdPayload := &clients.PaymentCommandPayload{
		TransactionReference: txnRef,
		SenderAccountID:      senderAccount.ID,
		ReceiverAccountID:    receiverAccount.ID,
		Amount:               req.Amount,
		Currency:             req.Currency,
		PaymentMethod:        req.PaymentMethod,
		Description:          req.Description,
		CorrelationID:        corrID,
		IdempotencyKey:       idempotencyKey,
	}

	// Submit payment command to Java Command Service (which publishes to JMS)
	resp, err := h.javaClient.SubmitPaymentCommand(r.Context(), cmdPayload)
	if err != nil {
		// Log error and handle broker submission failure
		_ = h.txnRepo.UpdateIdempotency(r.Context(), idempotencyKey, http.StatusServiceUnavailable, "", "FAILED")
		utils.WriteError(w, http.StatusServiceUnavailable, "BROKER_SUBMISSION_FAILED", fmt.Sprintf("Could not queue payment command: %v", err), corrID)
		return
	}

	successResp := models.PaymentAcceptedResponse{
		TransactionID: txnRef,
		Status:        "PENDING",
		Message:       "Payment request accepted for processing",
		CorrelationID: corrID,
	}

	// Cache successful idempotency response
	respBytes, _ := json.Marshal(utils.APIResponse{
		Success: true,
		Data:    successResp,
	})
	_ = h.txnRepo.UpdateIdempotency(r.Context(), idempotencyKey, http.StatusAccepted, string(respBytes), "COMPLETED")

	w.Header().Set("Idempotency-Key", idempotencyKey)
	utils.WriteJSON(w, http.StatusAccepted, successResp)
}

func (h *PaymentHandler) GetPaymentStatus(w http.ResponseWriter, r *http.Request) {
	// Extract transactionReference from path e.g. /api/v1/payments/{ref}
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 4 {
		utils.WriteError(w, http.StatusBadRequest, "INVALID_PATH", "Transaction reference must be provided", "")
		return
	}
	ref := pathParts[3]

	claims := middleware.GetUserClaims(r.Context())
	if claims == nil {
		utils.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing user context", "")
		return
	}

	txn, err := h.txnRepo.GetByReference(r.Context(), ref)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "DB_ERROR", "Failed to retrieve transaction", "")
		return
	}
	if txn == nil {
		utils.WriteError(w, http.StatusNotFound, "TRANSACTION_NOT_FOUND", "No transaction found with specified reference", "")
		return
	}

	// Authorization check: User must be sender or receiver or admin
	isAdmin := false
	for _, r := range claims.Roles {
		if r == "ROLE_ADMIN" {
			isAdmin = true
			break
		}
	}

	senderAccount, _ := h.accountRepo.FindByUserID(r.Context(), claims.UserID)
	isAuthorized := isAdmin
	if senderAccount != nil {
		if (txn.SenderAccountID != nil && *txn.SenderAccountID == senderAccount.ID) || txn.ReceiverAccountID == senderAccount.ID {
			isAuthorized = true
		}
	}

	if !isAuthorized {
		utils.WriteError(w, http.StatusForbidden, "FORBIDDEN", "You do not have access to view this transaction", "")
		return
	}

	utils.WriteJSON(w, http.StatusOK, txn)
}

func (h *PaymentHandler) ListPayments(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	if claims == nil {
		utils.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing user context", "")
		return
	}

	status := r.URL.Query().Get("status")
	method := r.URL.Query().Get("paymentMethod")
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 20
	offset := 0
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
		limit = l
	}
	if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
		offset = o
	}

	txns, total, err := h.txnRepo.ListUserTransactions(r.Context(), claims.UserID, status, method, limit, offset)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "DB_ERROR", "Failed to list transactions", "")
		return
	}

	utils.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"transactions": txns,
		"total":        total,
		"limit":        limit,
		"offset":       offset,
	})
}

func (h *PaymentHandler) RequestRefund(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Only POST allowed", "")
		return
	}

	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 5 || pathParts[4] != "refund" {
		utils.WriteError(w, http.StatusBadRequest, "INVALID_PATH", "Expected /api/v1/payments/{ref}/refund", "")
		return
	}
	ref := pathParts[3]

	claims := middleware.GetUserClaims(r.Context())
	if claims == nil {
		utils.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing user context", "")
		return
	}

	var req models.RefundRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	if req.Reason == "" {
		req.Reason = "Customer requested reversal"
	}

	// Verify original transaction
	txn, err := h.txnRepo.GetByReference(r.Context(), ref)
	if err != nil || txn == nil {
		utils.WriteError(w, http.StatusNotFound, "TRANSACTION_NOT_FOUND", "Transaction not found", "")
		return
	}

	if txn.Status != "SUCCESS" {
		utils.WriteError(w, http.StatusBadRequest, "INELIGIBLE_TRANSACTION", "Only SUCCESS transactions can be refunded", "")
		return
	}

	refundRef := fmt.Sprintf("REF-%s", strings.ReplaceAll(uuid.New().String()[:10], "-", ""))
	corrID := fmt.Sprintf("CORR-REF-%s", uuid.New().String()[:8])

	refundCmd := &clients.RefundCommandPayload{
		OriginalTransactionReference: txn.TransactionReference,
		RefundReference:              refundRef,
		RequestedByUserID:            claims.UserID,
		Amount:                       txn.Amount,
		Currency:                     txn.Currency,
		Reason:                       req.Reason,
		CorrelationID:                corrID,
	}

	resp, err := h.javaClient.SubmitRefundCommand(r.Context(), refundCmd)
	if err != nil {
		utils.WriteError(w, http.StatusServiceUnavailable, "REFUND_SUBMISSION_FAILED", err.Error(), corrID)
		return
	}

	utils.WriteJSON(w, http.StatusAccepted, map[string]interface{}{
		"refundReference": refundRef,
		"status":          "REFUND_PENDING",
		"message":         resp.Message,
		"correlationId":   corrID,
	})
}
