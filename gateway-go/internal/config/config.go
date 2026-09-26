package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port                  string
	DBHost                string
	DBPort                string
	DBName                string
	DBUser                string
	DBPassword            string
	DBSSLMode             string
	JWTSecret             string
	JWTExpirationHours    int
	JavaCommandServiceURL string
	InternalAPISecret     string
}

func LoadConfig() *Config {
	port := getEnv("GATEWAY_PORT", "8080")
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbName := getEnv("DB_NAME", "payment_simulator")
	dbUser := getEnv("DB_USER", "simulator_user")
	dbPassword := getEnv("DB_PASSWORD", "simulator_secret")
	dbSSLMode := getEnv("DB_SSLMODE", "disable")
	jwtSecret := getEnv("JWT_SECRET", "super_secret_jwt_key_payment_sim_2026_x99!")
	jwtExpStr := getEnv("JWT_EXPIRATION_HOURS", "24")
	jwtExp, err := strconv.Atoi(jwtExpStr)
	if err != nil {
		jwtExp = 24
	}
	javaURL := getEnv("JAVA_COMMAND_SERVICE_URL", "http://localhost:8081")
	internalSecret := getEnv("INTERNAL_API_SECRET", "internal_service_secret_bridge_99x")

	return &Config{
		Port:                  port,
		DBHost:                dbHost,
		DBPort:                dbPort,
		DBName:                dbName,
		DBUser:                dbUser,
		DBPassword:            dbPassword,
		DBSSLMode:             dbSSLMode,
		JWTSecret:             jwtSecret,
		JWTExpirationHours:    jwtExp,
		JavaCommandServiceURL: javaURL,
		InternalAPISecret:     internalSecret,
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
