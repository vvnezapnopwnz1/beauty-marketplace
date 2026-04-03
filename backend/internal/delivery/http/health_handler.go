package http

import (
	"net/http"

	"github.com/yourusername/beauty-marketplace/internal/usecase"
	"go.uber.org/zap"
)

// HealthHandler exposes HTTP endpoints for readiness checks.
type HealthHandler struct {
	svc usecase.HealthService
	log *zap.Logger
}

// NewHealthHandler constructs HealthHandler.
func NewHealthHandler(svc usecase.HealthService, log *zap.Logger) *HealthHandler {
	return &HealthHandler{svc: svc, log: log}
}

// Health responds 200 when dependencies (e.g. DB) are reachable.
func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if err := h.svc.Check(r.Context()); err != nil {
		h.log.Warn("health check failed", zap.Error(err))
		http.Error(w, "service unavailable", http.StatusServiceUnavailable)
		return
	}
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}
