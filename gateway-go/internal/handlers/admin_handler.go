package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/distributed-payment-simulator/gateway-go/internal/repository"
	"github.com/distributed-payment-simulator/gateway-go/internal/utils"
)

type AdminHandler struct {
	txnRepo *repository.TransactionRepository
}

func NewAdminHandler(txnRepo *repository.TransactionRepository) *AdminHandler {
	return &AdminHandler{txnRepo: txnRepo}
}

func (h *AdminHandler) GetTransactions(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 50
	offset := 0
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
		limit = l
	}
	if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
		offset = o
	}

	txns, total, err := h.txnRepo.ListAdminTransactions(r.Context(), status, limit, offset)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "DB_ERROR", "Failed to retrieve transactions", "")
		return
	}

	utils.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"transactions": txns,
		"total":        total,
		"limit":        limit,
		"offset":       offset,
	})
}

func (h *AdminHandler) GetFailedTransactions(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 50
	offset := 0
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
		limit = l
	}
	if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
		offset = o
	}

	txns, total, err := h.txnRepo.ListAdminTransactions(r.Context(), "FAILED", limit, offset)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "DB_ERROR", "Failed to retrieve failed transactions", "")
		return
	}

	utils.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"transactions": txns,
		"total":        total,
		"limit":        limit,
		"offset":       offset,
	})
}

func (h *AdminHandler) GetStatistics(w http.ResponseWriter, r *http.Request) {
	stats, err := h.txnRepo.GetAdminStats(r.Context())
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "DB_ERROR", "Failed to calculate statistics", "")
		return
	}

	utils.WriteJSON(w, http.StatusOK, stats)
}

func (h *AdminHandler) GetHealth(w http.ResponseWriter, r *http.Request) {
	utils.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"status":      "HEALTHY",
		"service":     "gateway-go",
		"currentTime": time.Now().UTC().Format(time.RFC3339),
		"version":     "1.0.0",
	})
}
