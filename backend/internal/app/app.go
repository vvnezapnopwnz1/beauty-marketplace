package app

import (
	"net/http"

	"github.com/yourusername/beauty-marketplace/internal/config"
	httpdelivery "github.com/yourusername/beauty-marketplace/internal/delivery/http"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence"
	applogger "github.com/yourusername/beauty-marketplace/internal/logger"
	"github.com/yourusername/beauty-marketplace/internal/usecase"
	"go.uber.org/fx"
	"go.uber.org/fx/fxevent"
	"go.uber.org/zap"
)

// New builds the fx application graph for the HTTP API.
func New() *fx.App {
	return fx.New(
		fx.WithLogger(func(log *zap.Logger) fxevent.Logger {
			return &fxevent.ZapLogger{Logger: log}
		}),
		fx.Provide(
			config.Load,
			applogger.New,
			persistence.NewDB,
			persistence.NewHealthRepository,
			usecase.NewHealthService,
			httpdelivery.NewHealthHandler,
			httpdelivery.NewHTTPServer,
		),
		fx.Invoke(func(*http.Server) {}),
	)
}
