package http

import (
	"context"
	"net/http"

	"github.com/yourusername/beauty-marketplace/internal/config"
	"go.uber.org/fx"
	"go.uber.org/zap"
)

// NewHTTPServer wires routes and manages the HTTP server lifecycle.
func NewHTTPServer(lc fx.Lifecycle, cfg *config.Config, log *zap.Logger, hh *HealthHandler) *http.Server {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", hh.Health)

	srv := &http.Server{
		Addr:    cfg.HTTPAddr,
		Handler: mux,
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			go func() {
				log.Info("http listening", zap.String("addr", cfg.HTTPAddr))
				if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
					log.Error("http server stopped", zap.Error(err))
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			return srv.Shutdown(ctx)
		},
	})

	return srv
}
