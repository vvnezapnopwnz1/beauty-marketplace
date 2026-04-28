package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
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
	// DevDemoSeed wipes and repopulates a fixed demo salon on API startup (local dev only).
	// Env: DEV_DEMO_SEED=1 / true.
	DevDemoSeed bool
	// DevOTPBypass allows fixed code "1234" on verify when an active OTP exists (local dev only).
	// Env: DEV_OTP_BYPASS=1 / true.
	DevOTPBypass bool
	// DevOTPBypassAny allows auth without persisted OTP in local/dev test scenarios.
	// Env: DEV_OTP_BYPASS_ANY=1 / true.
	DevOTPBypassAny bool
	// DevEndpoints enables /api/dev/* helpers for local/e2e setup.
	// Env: DEV_ENDPOINTS=1 / true.
	DevEndpoints bool
	// Telegram settings for OTP delivery channel.
	TelegramBotToken    string
	TelegramBotUsername string
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
		TwoGisAPIKey:        twoGisAPIKeyFromEnv(),
		TwoGisRegionID:      getenvIntFirst([]string{"2GIS_REGION_ID", "TWO_GIS_REGION_ID"}, 32),
		JWTSecret:           getenv("JWT_SECRET", "dev-secret-change-me-in-production"),
		DevDemoSeed:         getenvBool("DEV_DEMO_SEED", false),
		DevOTPBypass:        getenvBool("DEV_OTP_BYPASS", false),
		DevOTPBypassAny:     getenvBool("DEV_OTP_BYPASS_ANY", false),
		DevEndpoints:        getenvBool("DEV_ENDPOINTS", false),
		TelegramBotToken:    getenv("TELEGRAM_BOT_TOKEN", ""),
		TelegramBotUsername: getenv("TELEGRAM_BOT_USERNAME", ""),
	}
	if cfg.HTTPAddr == "" {
		return nil, fmt.Errorf("HTTP_ADDR must not be empty")
	}
	if cfg.DSN == "" {
		return nil, fmt.Errorf("DATABASE_DSN must not be empty")
	}
	if strings.EqualFold(strings.TrimSpace(cfg.LogLevel), "production") {
		if cfg.DevOTPBypass || cfg.DevOTPBypassAny || cfg.DevEndpoints {
			return nil, fmt.Errorf("dev auth/dev endpoints flags are forbidden in production")
		}
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

// twoGisAPIKeyFromEnv reads Catalog API key. Names 2GIS_* work in Docker YAML but are not valid
// shell identifiers; use TWO_GIS_API_KEY in zsh/bash (see docker-compose TWO_GIS_API_KEY → 2GIS_API_KEY).
func twoGisAPIKeyFromEnv() string {
	if v := os.Getenv("2GIS_API_KEY"); v != "" {
		return v
	}
	return os.Getenv("TWO_GIS_API_KEY")
}

func getenvIntFirst(keys []string, def int) int {
	for _, k := range keys {
		if v := os.Getenv(k); v != "" {
			if n, err := strconv.Atoi(v); err == nil {
				return n
			}
		}
	}
	return def
}

func getenvBool(key string, def bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return def
	}
}
