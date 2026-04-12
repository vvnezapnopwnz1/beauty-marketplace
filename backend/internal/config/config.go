package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds runtime configuration loaded from the environment.
type Config struct {
	HTTPAddr string
	LogLevel string // "development" | "production"
	DSN      string
	// TwoGisAPIKey is the Catalog / Places API key (query param key=...).
	// Optional until discover routes are used; empty disables proxy calls.
	TwoGisAPIKey string
	// TwoGisRegionID is default search region for rubric-based filters.
	TwoGisRegionID int
	// JWTSecret is the HMAC key for signing access tokens. Required.
	JWTSecret string
}

// Load reads configuration from environment variables with defaults for local dev.
func Load() (*Config, error) {
	cfg := &Config{
		HTTPAddr: getenv("HTTP_ADDR", ":8080"),
		LogLevel: getenv("LOG_LEVEL", "development"),
		DSN: getenv(
			"DATABASE_DSN",
			"postgres://beauty:beauty@127.0.0.1:5433/beauty?sslmode=disable",
		),
		TwoGisAPIKey:   os.Getenv("2GIS_API_KEY"),
		TwoGisRegionID: getenvInt("2GIS_REGION_ID", 32),
		JWTSecret: getenv("JWT_SECRET", "dev-secret-change-me-in-production"),
	}
	if cfg.HTTPAddr == "" {
		return nil, fmt.Errorf("HTTP_ADDR must not be empty")
	}
	if cfg.DSN == "" {
		return nil, fmt.Errorf("DATABASE_DSN must not be empty")
	}
	return cfg, nil
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getenvInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}
