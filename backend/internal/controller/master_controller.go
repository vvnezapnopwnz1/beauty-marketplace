package controller

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/service"
	"go.uber.org/zap"
)

// MasterController handles public master profile HTTP API.
type MasterController struct {
	svc service.MasterPublicService
	log *zap.Logger
}

// NewMasterController constructs MasterController.
func NewMasterController(svc service.MasterPublicService, log *zap.Logger) *MasterController {
	return &MasterController{svc: svc, log: log}
}

// MasterRoutes handles GET /api/v1/masters/{masterProfileId}.
func (h *MasterController) MasterRoutes(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 || parts[0] != "api" || parts[1] != "v1" || parts[2] != "masters" {
		http.NotFound(w, r)
		return
	}
	if len(parts) != 4 {
		http.NotFound(w, r)
		return
	}
	masterID, err := uuid.Parse(parts[3])
	if err != nil {
		http.Error(w, "invalid master id", http.StatusBadRequest)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	dto, err := h.svc.GetMasterProfilePublic(r.Context(), masterID)
	if err != nil {
		h.log.Error("get public master profile", zap.Error(err))
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if dto == nil {
		http.Error(w, "master not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(dto)
}
