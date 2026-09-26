package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/distributed-payment-simulator/gateway-go/internal/utils"
)

type contextKey string

const (
	UserClaimsKey contextKey = "user_claims"
)

func AuthMiddleware(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				utils.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing Authorization header", "")
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				utils.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid Authorization header format. Expected 'Bearer <token>'", "")
				return
			}

			claims, err := utils.ValidateToken(parts[1], jwtSecret)
			if err != nil {
				utils.WriteError(w, http.StatusUnauthorized, "INVALID_TOKEN", err.Error(), "")
				return
			}

			ctx := context.WithValue(r.Context(), UserClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := r.Context().Value(UserClaimsKey).(*utils.JWTClaims)
			if !ok || claims == nil {
				utils.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User identity not found in request context", "")
				return
			}

			hasRole := false
			for _, r := range claims.Roles {
				if r == role {
					hasRole = true
					break
				}
			}

			if !hasRole {
				utils.WriteError(w, http.StatusForbidden, "FORBIDDEN", "You do not have permission to access this resource", "")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func GetUserClaims(ctx context.Context) *utils.JWTClaims {
	if claims, ok := ctx.Value(UserClaimsKey).(*utils.JWTClaims); ok {
		return claims
	}
	return nil
}
