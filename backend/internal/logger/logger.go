package logger

import (
	"fmt"

	"github.com/yourusername/beauty-marketplace/internal/config"
	"go.uber.org/zap"
)

// New builds a zap logger according to config.LogLevel.
func New(cfg *config.Config) (*zap.Logger, error) {
	switch cfg.LogLevel {
	case "production":
		l, err := zap.NewProduction()
		if err != nil {
			return nil, fmt.Errorf("zap production: %w", err)
		}
		return l, nil
	case "development":
		l, err := zap.NewDevelopment()
		if err != nil {
			return nil, fmt.Errorf("zap development: %w", err)
		}
		return l, nil
	default:
		return nil, fmt.Errorf("unsupported LOG_LEVEL %q (use development or production)", cfg.LogLevel)
	}
}
