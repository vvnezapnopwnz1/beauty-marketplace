package controller

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/auth"
	"github.com/yourusername/beauty-marketplace/internal/errs"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"github.com/yourusername/beauty-marketplace/internal/service"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type UserController struct {
	profiles    service.UserProfileService
	dash        service.DashboardService
	userAppts   service.UserAppointmentService
	log         *zap.Logger
}

func NewUserController(
	profiles service.UserProfileService,
	dash service.DashboardService,
	userAppts service.UserAppointmentService,
	log *zap.Logger,
) *UserController {
	return &UserController{profiles: profiles, dash: dash, userAppts: userAppts, log: log}
}

func (h *UserController) MeRoutes(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		writeMachineError(w, "unauthorized", http.StatusUnauthorized, "", "")
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/me")
	path = strings.Trim(path, "/")
	if path != "" {
		h.handleMeSubroutes(w, r, userID, splitPath(path))
		return
	}

	switch r.Method {
	case http.MethodGet:
		out, err := h.profiles.GetMe(r.Context(), userID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) || errors.Is(err, errs.ErrUserNotFound) {
				writeMachineError(w, "user_not_found", http.StatusNotFound, "", "")
				return
			}
			h.log.Error("get /api/v1/me", zap.Error(err))
			writeMachineError(w, "internal_error", http.StatusInternalServerError, "", "")
			return
		}
		jsonOK(w, out)
	case http.MethodPut:
		var body service.UpdateUserProfileInput
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeMachineError(w, "validation_failed", http.StatusBadRequest, "invalid json", "")
			return
		}
		out, err := h.profiles.UpdateMe(r.Context(), userID, body)
		if err != nil {
			if errors.Is(err, service.ErrUsernameTaken) {
				writeMachineError(w, "username_taken", http.StatusConflict, "", "username")
				return
			}
			var verr service.ValidationError
			if errors.As(err, &verr) {
				code := "validation_failed"
				if verr.Message == "username_invalid" {
					code = "username_invalid"
				}
				writeMachineError(w, code, http.StatusBadRequest, verr.Message, verr.Field)
				return
			}
			h.log.Error("put /api/v1/me", zap.Error(err))
			writeMachineError(w, "internal_error", http.StatusInternalServerError, "", "")
			return
		}
		jsonOK(w, out)
	case http.MethodDelete:
		err := h.profiles.DeleteAccount(r.Context(), userID)
		if err != nil {
			var ownedErr service.HasOwnedSalonsError
			if errors.As(err, &ownedErr) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusConflict)
				_ = json.NewEncoder(w).Encode(map[string]any{
					"error":    "has_owned_salons",
					"salonIds": ownedErr.SalonIDs,
				})
				return
			}
			h.log.Error("delete /api/v1/me", zap.Error(err))
			writeMachineError(w, "internal_error", http.StatusInternalServerError, "", "")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *UserController) handleMeSubroutes(w http.ResponseWriter, r *http.Request, userID uuid.UUID, parts []string) {
	if len(parts) == 0 {
		http.NotFound(w, r)
		return
	}
	if parts[0] == "salon-invites" {
		h.handleMeSalonInvites(w, r, userID, parts[1:])
		return
	}
	if parts[0] == "appointments" && len(parts) == 1 {
		h.handleMeAppointments(w, r, userID)
		return
	}
	if parts[0] != "sessions" {
		http.NotFound(w, r)
		return
	}
	currentSessionID := parseSessionIDHeader(r)

	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			out, err := h.profiles.ListSessions(r.Context(), userID, currentSessionID)
			if err != nil {
				h.log.Error("get /api/v1/me/sessions", zap.Error(err))
				writeMachineError(w, "internal_error", http.StatusInternalServerError, "", "")
				return
			}
			jsonOK(w, out)
			return
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
	}

	if len(parts) == 2 && parts[1] == "revoke-all" && r.Method == http.MethodPost {
		revoked, err := h.profiles.RevokeAllSessions(r.Context(), userID, currentSessionID)
		if err != nil {
			h.log.Error("post /api/v1/me/sessions/revoke-all", zap.Error(err))
			writeMachineError(w, "internal_error", http.StatusInternalServerError, "", "")
			return
		}
		jsonOK(w, map[string]int64{"revoked": revoked})
		return
	}

	if len(parts) == 2 && r.Method == http.MethodDelete {
		sessionID, err := uuid.Parse(parts[1])
		if err != nil {
			writeMachineError(w, "validation_failed", http.StatusBadRequest, "invalid session id", "id")
			return
		}
		err = h.profiles.RevokeSession(r.Context(), userID, sessionID, currentSessionID)
		if err != nil {
			if errors.Is(err, service.ErrCannotRevokeCurrent) {
				writeMachineError(w, "cannot_revoke_current", http.StatusBadRequest, "", "")
				return
			}
			h.log.Error("delete /api/v1/me/sessions/:id", zap.Error(err))
			writeMachineError(w, "internal_error", http.StatusInternalServerError, "", "")
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}

	http.NotFound(w, r)
}

func (h *UserController) handleMeSalonInvites(w http.ResponseWriter, r *http.Request, userID uuid.UUID, tail []string) {
	ctx := r.Context()
	if len(tail) == 0 && r.Method == http.MethodGet {
		items, err := h.dash.ListMySalonInvites(ctx, userID)
		if err != nil {
			h.log.Error("list my salon invites", zap.Error(err))
			writeMachineError(w, "internal_error", http.StatusInternalServerError, "", "")
			return
		}
		jsonOK(w, map[string]any{"items": items})
		return
	}
	if len(tail) == 2 {
		inviteID, err := uuid.Parse(tail[0])
		if err != nil {
			writeMachineError(w, "validation_failed", http.StatusBadRequest, "invalid invite id", "")
			return
		}
		if tail[1] == "accept" && r.Method == http.MethodPost {
			err := h.dash.AcceptMySalonInvite(ctx, userID, inviteID)
			if err != nil {
				if errors.Is(err, repository.ErrSalonMemberInviteNotFound) {
					writeMachineError(w, "not_found", http.StatusNotFound, "", "")
					return
				}
				if errors.Is(err, repository.ErrSalonMemberInviteForbidden) || errors.Is(err, repository.ErrSalonMemberInviteExpired) {
					writeMachineError(w, "validation_failed", http.StatusBadRequest, err.Error(), "")
					return
				}
				if errors.Is(err, repository.ErrSalonMemberInviteAlreadyMember) {
					writeMachineError(w, "conflict", http.StatusConflict, "", "")
					return
				}
				h.log.Error("accept salon invite", zap.Error(err))
				writeMachineError(w, "internal_error", http.StatusInternalServerError, "", "")
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if tail[1] == "decline" && r.Method == http.MethodPost {
			ok, err := h.dash.DeclineMySalonInvite(ctx, userID, inviteID)
			if err != nil {
				h.log.Error("decline salon invite", zap.Error(err))
				writeMachineError(w, "internal_error", http.StatusInternalServerError, "", "")
				return
			}
			if !ok {
				writeMachineError(w, "not_found", http.StatusNotFound, "", "")
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
	}
	http.NotFound(w, r)
}

func (h *UserController) handleMeAppointments(w http.ResponseWriter, r *http.Request, userID uuid.UUID) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	pageSize, _ := strconv.Atoi(q.Get("page_size"))

	result, err := h.userAppts.ListMyAppointments(r.Context(), userID, page, pageSize)
	if err != nil {
		h.log.Error("get /api/v1/me/appointments", zap.Error(err))
		writeMachineError(w, "internal_error", http.StatusInternalServerError, "", "")
		return
	}
	jsonOK(w, result)
}

func parseSessionIDHeader(r *http.Request) *uuid.UUID {
	raw := strings.TrimSpace(r.Header.Get("X-Session-Id"))
	if raw == "" {
		return nil
	}
	id, err := uuid.Parse(raw)
	if err != nil {
		return nil
	}
	return &id
}

func writeMachineError(w http.ResponseWriter, code string, status int, message string, field string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	resp := map[string]string{"error": code}
	if message != "" {
		resp["message"] = message
	}
	if field != "" {
		resp["field"] = field
	}
	_ = json.NewEncoder(w).Encode(resp)
}
