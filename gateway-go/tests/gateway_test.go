package tests

import (
	"crypto/sha256"
	"encoding/hex"
	"testing"
	"time"

	"github.com/distributed-payment-simulator/gateway-go/internal/utils"
)

func TestJWTGenerationAndValidation(t *testing.T) {
	secret := "test_secret_key_12345"
	userID := int64(42)
	email := "testuser@example.com"
	roles := []string{"ROLE_USER", "ROLE_ADMIN"}

	// Generate Token
	token, err := utils.GenerateToken(userID, email, roles, secret, 2)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	if token == "" {
		t.Fatal("Generated token is empty")
	}

	// Validate valid token
	claims, err := utils.ValidateToken(token, secret)
	if err != nil {
		t.Fatalf("Expected token to be valid, got error: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("Expected userID %d, got %d", userID, claims.UserID)
	}
	if claims.Email != email {
		t.Errorf("Expected email %s, got %s", email, claims.Email)
	}
	if len(claims.Roles) != 2 {
		t.Errorf("Expected 2 roles, got %d", len(claims.Roles))
	}

	// Validate with wrong secret
	_, err = utils.ValidateToken(token, "wrong_secret")
	if err == nil {
		t.Error("Expected error validating with wrong secret, got nil")
	}
}

func TestIdempotencyPayloadHashing(t *testing.T) {
	payload1 := []byte(`{"receiverId":2,"amount":500.00,"currency":"INR"}`)
	payload2 := []byte(`{"receiverId":2,"amount":500.00,"currency":"INR"}`)
	payload3 := []byte(`{"receiverId":2,"amount":600.00,"currency":"INR"}`)

	h1 := sha256.Sum256(payload1)
	hash1 := hex.EncodeToString(h1[:])

	h2 := sha256.Sum256(payload2)
	hash2 := hex.EncodeToString(h2[:])

	h3 := sha256.Sum256(payload3)
	hash3 := hex.EncodeToString(h3[:])

	if hash1 != hash2 {
		t.Errorf("Identical payloads produced different hashes: %s vs %s", hash1, hash2)
	}

	if hash1 == hash3 {
		t.Errorf("Different payloads produced identical hashes: %s", hash1)
	}
}

func TestTokenExpiration(t *testing.T) {
	secret := "test_secret"
	// Generate token with negative duration
	token, err := utils.GenerateToken(1, "expired@test.com", []string{"ROLE_USER"}, secret, -1)
	if err != nil {
		t.Fatalf("Error generating token: %v", err)
	}

	time.Sleep(10 * time.Millisecond)

	_, err = utils.ValidateToken(token, secret)
	if err == nil {
		t.Error("Expected expired token to fail validation, but it passed")
	}
}
