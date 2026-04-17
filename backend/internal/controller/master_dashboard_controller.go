package controller

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/auth"
	"github.com/yourusername/beauty-marketplace/internal/service"
	"go.uber.org/zap"
)

// MasterDashboardController handles /api/v1/master-dashboard/* (auth + master profile required).
type MasterDashboardController struct {
	svc service.MasterDashboardService
	log *zap.Logger
}

// NewMasterDashboardController constructs MasterDashboardController.
func NewMasterDashboardController(svc service.MasterDashboardService, log *zap.Logger) *MasterDashboardController {
	return &MasterDashboardController{svc: svc, log: log}
}

// MasterDashboardRoutes dispatches under /api/v1/master-dashboard/.
func (h *MasterDashboardController) MasterDashboardRoutes(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/master-dashboard")
	path = strings.Trim(path, "/")
	parts := splitPath(path)

	if len(parts) == 0 {
		http.NotFound(w, r)
		return
	}

	prof, err := h.svc.MyProfile(r.Context(), userID)
	if err != nil {
		h.log.Error("master dashboard profile gate", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	if prof == nil {
		jsonError(w, "master profile required", http.StatusForbidden)
		return
	}

	switch parts[0] {
	case "profile":
		if len(parts) != 1 {
			http.NotFound(w, r)
			return
		}
		if r.Method == http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(prof)
			return
		}
		if r.Method == http.MethodPut {
			var body service.UpdateMasterProfileCabinetInput
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				jsonError(w, "invalid json", http.StatusBadRequest)
				return
			}
			out, err := h.svc.UpdateMyProfile(r.Context(), userID, body)
			if err != nil {
				if err.Error() == "displayName is required" || strings.Contains(err.Error(), "bio exceeds") {
					jsonError(w, err.Error(), http.StatusBadRequest)
					return
				}
				h.log.Error("master update profile", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			if out == nil {
				jsonError(w, "profile not found", http.StatusNotFound)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(out)
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	case "invites":
		if len(parts) == 1 && r.Method == http.MethodGet {
			list, err := h.svc.ListInvites(r.Context(), userID)
			if err != nil {
				h.log.Error("master list invites", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(list)
			return
		}
		if len(parts) == 3 && parts[2] == "accept" && r.Method == http.MethodPost {
			id, err := uuid.Parse(parts[1])
			if err != nil {
				jsonError(w, "invalid id", http.StatusBadRequest)
				return
			}
			if err := h.svc.AcceptInvite(r.Context(), userID, id); err != nil {
				if err.Error() == "invite not found or not pending" {
					jsonError(w, err.Error(), http.StatusNotFound)
					return
				}
				h.log.Error("master accept invite", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
			return
		}
		if len(parts) == 3 && parts[2] == "decline" && r.Method == http.MethodPost {
			id, err := uuid.Parse(parts[1])
			if err != nil {
				jsonError(w, "invalid id", http.StatusBadRequest)
				return
			}
			if err := h.svc.DeclineInvite(r.Context(), userID, id); err != nil {
				if err.Error() == "invite not found or not pending" {
					jsonError(w, err.Error(), http.StatusNotFound)
					return
				}
				h.log.Error("master decline invite", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
			return
		}
		http.NotFound(w, r)
	case "salons":
		if len(parts) == 1 && r.Method == http.MethodGet {
			list, err := h.svc.ListSalons(r.Context(), userID)
			if err != nil {
				h.log.Error("master list salons", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(list)
			return
		}
		http.NotFound(w, r)
	case "appointments":
		if len(parts) == 1 && r.Method == http.MethodGet {
			q := r.URL.Query()
			var from, to *time.Time
			if v := q.Get("from"); v != "" {
				t, err := time.Parse("2006-01-02", v)
				if err == nil {
					utc := t.UTC()
					from = &utc
				}
			}
			if v := q.Get("to"); v != "" {
				t, err := time.Parse("2006-01-02", v)
				if err == nil {
					end := t.Add(24 * time.Hour).UTC()
					to = &end
				}
			}
			status := q.Get("status")
			items, total, err := h.svc.ListAppointments(r.Context(), userID, from, to, status)
			if err != nil {
				h.log.Error("master list appointments", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{"items": items, "total": total})
			return
		}
		http.NotFound(w, r)
	default:
		http.NotFound(w, r)
	}
}
