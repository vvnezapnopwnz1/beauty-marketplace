package controller

import (
	"net/http"

	"github.com/yourusername/beauty-marketplace/internal/service"
	"go.uber.org/zap"
)

// HealthController exposes HTTP endpoints for readiness checks.
type HealthController struct {
	svc service.HealthService
	log *zap.Logger
}

// NewHealthController constructs HealthController.
func NewHealthController(svc service.HealthService, log *zap.Logger) *HealthController {
	return &HealthController{svc: svc, log: log}
}

// Health responds 200 when dependencies (e.g. DB) are reachable.
func (h *HealthController) Health(w http.ResponseWriter, r *http.Request) {
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
