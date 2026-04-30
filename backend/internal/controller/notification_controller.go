package controller

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/auth"
	"github.com/yourusername/beauty-marketplace/internal/service"
	"go.uber.org/zap"
)

type NotificationController struct {
	svc service.NotificationService
	log *zap.Logger
}

func NewNotificationController(svc service.NotificationService, log *zap.Logger) *NotificationController {
	return &NotificationController{svc: svc, log: log}
}

func (h *NotificationController) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		writeMachineError(w, "unauthorized", http.StatusUnauthorized, "", "")
		return
	}
	q := r.URL.Query()
	unreadOnly := q.Get("unread") == "true"
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))
	rows, err := h.svc.List(r.Context(), userID, unreadOnly, limit, offset)
	if err != nil {
		h.log.Error("notifications list", zap.Error(err))
		writeMachineError(w, "internal_error", http.StatusInternalServerError, "", "")
		return
	}
	jsonOK(w, map[string]any{"items": rows})
}

func (h *NotificationController) UnreadCount(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		writeMachineError(w, "unauthorized", http.StatusUnauthorized, "", "")
		return
	}
	counts, err := h.svc.Count(r.Context(), userID)
	if err != nil {
		h.log.Error("notifications unread count", zap.Error(err))
		writeMachineError(w, "internal_error", http.StatusInternalServerError, "", "")
		return
	}
	jsonOK(w, map[string]any{"unread": counts.Unread, "unseen": counts.Unseen})
}

func (h *NotificationController) MarkSeen(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		writeMachineError(w, "unauthorized", http.StatusUnauthorized, "", "")
		return
	}
	idRaw := r.PathValue("id")
	id, err := uuid.Parse(idRaw)
	if err != nil {
		writeMachineError(w, "validation_failed", http.StatusBadRequest, "invalid id", "id")
		return
	}
	updated, err := h.svc.MarkSeen(r.Context(), userID, id)
	if err != nil {
		h.log.Error("notifications mark seen", zap.Error(err))
		writeMachineError(w, "internal_error", http.StatusInternalServerError, "", "")
		return
	}
	jsonOK(w, map[string]any{"updated": updated})
}

func (h *NotificationController) MarkAllSeen(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		writeMachineError(w, "unauthorized", http.StatusUnauthorized, "", "")
		return
	}
	updated, err := h.svc.MarkAllSeen(r.Context(), userID)
	if err != nil {
		h.log.Error("notifications mark all seen", zap.Error(err))
		writeMachineError(w, "internal_error", http.StatusInternalServerError, "", "")
		return
	}
	jsonOK(w, map[string]any{"updated": updated})
}

func (h *NotificationController) MarkRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		writeMachineError(w, "unauthorized", http.StatusUnauthorized, "", "")
		return
	}
	idRaw := r.PathValue("id")
	id, err := uuid.Parse(idRaw)
	if err != nil {
		writeMachineError(w, "validation_failed", http.StatusBadRequest, "invalid id", "id")
		return
	}
	updated, err := h.svc.MarkRead(r.Context(), userID, id)
	if err != nil {
		h.log.Error("notifications mark read", zap.Error(err))
		writeMachineError(w, "internal_error", http.StatusInternalServerError, "", "")
		return
	}
	jsonOK(w, map[string]any{"updated": updated})
}

func (h *NotificationController) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		writeMachineError(w, "unauthorized", http.StatusUnauthorized, "", "")
		return
	}
	updated, err := h.svc.MarkAllRead(r.Context(), userID)
	if err != nil {
		h.log.Error("notifications mark all read", zap.Error(err))
		writeMachineError(w, "internal_error", http.StatusInternalServerError, "", "")
		return
	}
	jsonOK(w, map[string]any{"updated": updated})
}

func (h *NotificationController) Stream(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		writeMachineError(w, "unauthorized", http.StatusUnauthorized, "", "")
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeMachineError(w, "internal_error", http.StatusInternalServerError, "stream unsupported", "")
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	events, unsubscribe := h.svc.Subscribe(userID)
	defer unsubscribe()
	heartbeat := time.NewTicker(25 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case row := <-events:
			payload, _ := json.Marshal(row)
			_, _ = w.Write([]byte("event: notification\n"))
			_, _ = w.Write([]byte("data: " + string(payload) + "\n\n"))
			flusher.Flush()
		case <-heartbeat.C:
			_, _ = w.Write([]byte(": ping\n\n"))
			flusher.Flush()
		}
	}
}
