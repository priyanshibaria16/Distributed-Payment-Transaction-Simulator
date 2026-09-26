package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/distributed-payment-simulator/gateway-go/internal/middleware"
	"github.com/distributed-payment-simulator/gateway-go/internal/models"
	"github.com/distributed-payment-simulator/gateway-go/internal/repository"
	"github.com/distributed-payment-simulator/gateway-go/internal/utils"
)

type AccountHandler struct {
	accountRepo *repository.AccountRepository
}

func NewAccountHandler(accountRepo *repository.AccountRepository) *AccountHandler {
	return &AccountHandler{accountRepo: accountRepo}
}

func (h *AccountHandler) GetMyAccount(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	if claims == nil {
		utils.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing user context", "")
		return
	}

	acc, err := h.accountRepo.FindByUserID(r.Context(), claims.UserID)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "DB_ERROR", "Failed to retrieve account details", "")
		return
	}
	if acc == nil {
		utils.WriteError(w, http.StatusNotFound, "ACCOUNT_NOT_FOUND", "No simulated account found for this user", "")
		return
	}

	utils.WriteJSON(w, http.StatusOK, acc)
}

func (h *AccountHandler) GetMyBalance(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	if claims == nil {
		utils.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing user context", "")
		return
	}

	acc, err := h.accountRepo.FindByUserID(r.Context(), claims.UserID)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "DB_ERROR", "Failed to retrieve account balance", "")
		return
	}
	if acc == nil {
		utils.WriteError(w, http.StatusNotFound, "ACCOUNT_NOT_FOUND", "Account does not exist", "")
		return
	}

	utils.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"accountId":     acc.ID,
		"accountNumber": acc.AccountNumber,
		"currency":      acc.Currency,
		"balance":       acc.Balance,
		"status":        acc.Status,
	})
}

func (h *AccountHandler) TopUp(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.WriteError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Only POST allowed", "")
		return
	}

	claims := middleware.GetUserClaims(r.Context())
	if claims == nil {
		utils.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing user context", "")
		return
	}

	var req models.TopUpRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "Malformed JSON body", "")
		return
	}

	if req.Amount <= 0 {
		utils.WriteError(w, http.StatusBadRequest, "INVALID_AMOUNT", "Top-up amount must be strictly greater than 0.00", "")
		return
	}
	if req.Amount > 1000000 {
		utils.WriteError(w, http.StatusBadRequest, "LIMIT_EXCEEDED", "Maximum simulated single top-up limit is 1,000,000.00", "")
		return
	}

	acc, txn, err := h.accountRepo.TopUp(r.Context(), claims.UserID, req.Amount)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "TOPUP_FAILED", err.Error(), "")
		return
	}

	utils.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"message":       "Simulated funds added successfully",
		"account":       acc,
		"transaction":   txn,
		"isSimulated":   true,
	})
}
