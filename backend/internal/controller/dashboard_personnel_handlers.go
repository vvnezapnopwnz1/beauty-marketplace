package controller

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/auth"
	"github.com/beauty-marketplace/backend/internal/repository"
	"go.uber.org/zap"
)

func (h *DashboardController) handleStaffInvites(w http.ResponseWriter, r *http.Request, salonID uuid.UUID, parts []string) {
	switch len(parts) {
	case 1:
		if r.Method == http.MethodGet {
			items, err := h.svc.ListStaffInvites(r.Context(), salonID)
			if err != nil {
				h.log.Error("list staff invites", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			jsonOK(w, map[string]any{"items": items})
			return
		}
		if r.Method == http.MethodPost {
			uid, ok := auth.UserIDFromCtx(r.Context())
			if !ok {
				jsonError(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			var body struct {
				PhoneE164 string `json:"phoneE164"`
				Role      string `json:"role"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				jsonError(w, "invalid json", http.StatusBadRequest)
				return
			}
			out, err := h.svc.CreateStaffInvite(r.Context(), salonID, uid, body.PhoneE164, body.Role)
			if err != nil {
				if errors.Is(err, repository.ErrSalonMemberInviteAlreadyMember) || errors.Is(err, repository.ErrSalonMemberInviteDuplicate) {
					jsonError(w, err.Error(), http.StatusConflict)
					return
				}
				h.log.Error("create staff invite", zap.Error(err))
				jsonError(w, err.Error(), http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(out)
			return
		}
	case 2:
		if r.Method != http.MethodDelete {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		inviteID, err := uuid.Parse(parts[1])
		if err != nil {
			jsonError(w, "invalid invite id", http.StatusBadRequest)
			return
		}
		ok, err := h.svc.RevokeStaffInvite(r.Context(), salonID, inviteID)
		if err != nil {
			h.log.Error("revoke staff invite", zap.Error(err))
			jsonError(w, "internal error", http.StatusInternalServerError)
			return
		}
		if !ok {
			jsonError(w, "not found", http.StatusNotFound)
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}
	http.NotFound(w, r)
}

func (h *DashboardController) handleSalonMembers(w http.ResponseWriter, r *http.Request, salonID uuid.UUID, parts []string) {
	switch len(parts) {
	case 1:
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		items, err := h.svc.ListSalonMemberUsers(r.Context(), salonID)
		if err != nil {
			h.log.Error("list salon members", zap.Error(err))
			jsonError(w, "internal error", http.StatusInternalServerError)
			return
		}
		jsonOK(w, map[string]any{"items": items})
		return
	case 2:
		targetID, err := uuid.Parse(parts[1])
		if err != nil {
			jsonError(w, "invalid user id", http.StatusBadRequest)
			return
		}
		if r.Method == http.MethodDelete {
			ok, err := h.svc.RemoveSalonMember(r.Context(), salonID, targetID)
			if err != nil {
				h.log.Error("remove salon member", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			if !ok {
				jsonError(w, "not found", http.StatusNotFound)
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if r.Method == http.MethodPatch {
			var body struct {
				Role string `json:"role"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				jsonError(w, "invalid json", http.StatusBadRequest)
				return
			}
			ok, err := h.svc.UpdateSalonMemberRole(r.Context(), salonID, targetID, body.Role)
			if err != nil {
				jsonError(w, err.Error(), http.StatusBadRequest)
				return
			}
			if !ok {
				jsonError(w, "not found", http.StatusNotFound)
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
	}
	http.NotFound(w, r)
}
