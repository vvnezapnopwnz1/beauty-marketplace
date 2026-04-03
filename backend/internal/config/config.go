package config

import (
	"fmt"
	"os"
)

// Config holds runtime configuration loaded from the environment.
type Config struct {
	HTTPAddr string
	LogLevel string // "development" | "production"
	DSN      string
}

// Load reads configuration from environment variables with defaults for local dev.
func Load() (*Config, error) {
	cfg := &Config{
		HTTPAddr: getenv("HTTP_ADDR", ":8080"),
		LogLevel: getenv("LOG_LEVEL", "development"),
		DSN: getenv(
			"DATABASE_DSN",
			"postgres://beauty:beauty@127.0.0.1:5432/beauty?sslmode=disable",
		),
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
