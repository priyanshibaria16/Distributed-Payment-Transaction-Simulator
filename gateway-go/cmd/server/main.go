package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/distributed-payment-simulator/gateway-go/internal/clients"
	"github.com/distributed-payment-simulator/gateway-go/internal/config"
	"github.com/distributed-payment-simulator/gateway-go/internal/handlers"
	"github.com/distributed-payment-simulator/gateway-go/internal/middleware"
	"github.com/distributed-payment-simulator/gateway-go/internal/repository"
)

func main() {
	cfg := config.LoadConfig()
	log.Printf("Starting Go API Gateway on port %s...\n", cfg.Port)

	// 1. Initialize PostgreSQL Connection
	database, err := repository.NewDatabase(cfg)
	if err != nil {
		log.Fatalf("Fatal: Database initialization error: %v", err)
	}
	defer database.DB.Close()

	// 2. Initialize Repositories
	userRepo := repository.NewUserRepository(database.DB)
	accountRepo := repository.NewAccountRepository(database.DB)
	txnRepo := repository.NewTransactionRepository(database.DB)

	// 3. Initialize Java Service Client
	javaClient := clients.NewJavaCommandClient(cfg)

	// 4. Initialize Handlers
	authHandler := handlers.NewAuthHandler(userRepo, cfg)
	accountHandler := handlers.NewAccountHandler(accountRepo)
	paymentHandler := handlers.NewPaymentHandler(txnRepo, accountRepo, userRepo, javaClient)
	adminHandler := handlers.NewAdminHandler(txnRepo)

	// 5. Build Router & Dispatcher
	mux := http.NewServeMux()

	// Auth routes (Public)
	mux.HandleFunc("/api/v1/auth/register", authHandler.Register)
	mux.HandleFunc("/api/v1/auth/login", authHandler.Login)

	// Authenticated routes
	authRequired := middleware.AuthMiddleware(cfg.JWTSecret)
	adminRequired := middleware.RequireRole("ROLE_ADMIN")

	// Recipient directory
	mux.Handle("/api/v1/users/recipients", authRequired(http.HandlerFunc(authHandler.ListRecipients)))

	// Account routes
	mux.Handle("/api/v1/accounts/me", authRequired(http.HandlerFunc(accountHandler.GetMyAccount)))
	mux.Handle("/api/v1/accounts/me/balance", authRequired(http.HandlerFunc(accountHandler.GetMyBalance)))
	mux.Handle("/api/v1/accounts/me/top-up", authRequired(http.HandlerFunc(accountHandler.TopUp)))

	// Payment routes
	mux.Handle("/api/v1/payments", authRequired(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			paymentHandler.CreatePayment(w, r)
		} else if r.Method == http.MethodGet {
			paymentHandler.ListPayments(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})))

	// Dynamic payment paths: /api/v1/payments/{ref} and /api/v1/payments/{ref}/refund
	mux.Handle("/api/v1/payments/", authRequired(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.Trim(r.URL.Path, "/")
		parts := strings.Split(path, "/")
		if len(parts) == 4 { // /api/v1/payments/{ref}
			paymentHandler.GetPaymentStatus(w, r)
		} else if len(parts) == 5 && parts[4] == "refund" { // /api/v1/payments/{ref}/refund
			paymentHandler.RequestRefund(w, r)
		} else {
			http.NotFound(w, r)
		}
	})))

	// Admin routes
	mux.Handle("/api/v1/admin/transactions", authRequired(adminRequired(http.HandlerFunc(adminHandler.GetTransactions))))
	mux.Handle("/api/v1/admin/failed-transactions", authRequired(adminRequired(http.HandlerFunc(adminHandler.GetFailedTransactions))))
	mux.Handle("/api/v1/admin/statistics", authRequired(adminRequired(http.HandlerFunc(adminHandler.GetStatistics))))
	mux.HandleFunc("/api/v1/admin/health", adminHandler.GetHealth)

	// Wrap entire router with CORS middleware
	handlerWithCORS := middleware.CorsMiddleware(mux)

	// 6. Start HTTP Server with Graceful Shutdown
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      handlerWithCORS,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("Go Gateway listening on http://0.0.0.0:%s\n", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down Go Gateway...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Gateway forced to shutdown: %v", err)
	}

	log.Println("Go Gateway exited cleanly.")
}
