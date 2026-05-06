package controller

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/beauty-marketplace/backend/internal/auth"
	"github.com/beauty-marketplace/backend/internal/service"
)

type ChatController struct {
	svc service.ChatService
	log *zap.Logger
}

func NewChatController(svc service.ChatService, log *zap.Logger) *ChatController {
	return &ChatController{svc: svc, log: log}
}

type postMessageRequest struct {
	Body        string `json:"body"`
	AccessToken string `json:"accessToken,omitempty"`
}

func (h *ChatController) PostMessage(w http.ResponseWriter, r *http.Request) {
	roomID, err := uuid.Parse(r.PathValue("roomId"))
	if err != nil {
		http.Error(w, "invalid roomId", http.StatusBadRequest)
		return
	}
	var req postMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if req.Body == "" {
		http.Error(w, "body required", http.StatusBadRequest)
		return
	}

	params := service.SendMessageParams{RoomID: roomID, Body: req.Body}
	if uid, ok := auth.UserIDFromCtx(r.Context()); ok {
		params.SenderUserID = &uid
	}
	if req.AccessToken != "" {
		tok, err := uuid.Parse(req.AccessToken)
		if err != nil {
			http.Error(w, "invalid accessToken", http.StatusBadRequest)
			return
		}
		params.AccessToken = &tok
	}
	if params.SenderUserID == nil && params.AccessToken == nil {
		http.Error(w, "auth required", http.StatusUnauthorized)
		return
	}

	msg, err := h.svc.SendMessage(r.Context(), params)
	if err != nil {
		writeChatError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(msg)
}

func (h *ChatController) ListMessages(w http.ResponseWriter, r *http.Request) {
	roomID, err := uuid.Parse(r.PathValue("roomId"))
	if err != nil {
		http.Error(w, "invalid roomId", http.StatusBadRequest)
		return
	}
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	var userID *uuid.UUID
	if uid, ok := auth.UserIDFromCtx(r.Context()); ok {
		userID = &uid
	}
	var token *uuid.UUID
	if t := q.Get("accessToken"); t != "" {
		parsed, err := uuid.Parse(t)
		if err != nil {
			http.Error(w, "invalid accessToken", http.StatusBadRequest)
			return
		}
		token = &parsed
	}
	if userID == nil && token == nil {
		http.Error(w, "auth required", http.StatusUnauthorized)
		return
	}

	msgs, err := h.svc.ListMessages(r.Context(), roomID, userID, token, limit, offset)
	if err != nil {
		writeChatError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"messages": msgs})
}

func (h *ChatController) GetRoomForAppointment(w http.ResponseWriter, r *http.Request) {
	apptID, err := uuid.Parse(r.PathValue("appointmentId"))
	if err != nil {
		http.Error(w, "invalid appointmentId", http.StatusBadRequest)
		return
	}
	room, err := h.svc.EnsureRoomForAppointment(r.Context(), apptID)
	if err != nil {
		writeChatError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(room)
}

func (h *ChatController) GetRoomByToken(w http.ResponseWriter, r *http.Request) {
	tok, err := uuid.Parse(r.PathValue("token"))
	if err != nil {
		http.Error(w, "invalid token", http.StatusBadRequest)
		return
	}
	room, err := h.svc.GetRoomByAccessToken(r.Context(), tok)
	if err != nil {
		writeChatError(w, err)
		return
	}
	// Return access token to caller so the frontend can re-attach it on subsequent requests.
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"id":                    room.ID,
		"type":                  room.Type,
		"appointmentId":         room.AppointmentID,
		"status":                room.Status,
		"lockedUntilFirstReply": room.LockedUntilFirstReply,
		"accessToken":           room.AccessToken,
		"createdAt":             room.CreatedAt,
		"updatedAt":             room.UpdatedAt,
	})
}

func (h *ChatController) MarkRead(w http.ResponseWriter, r *http.Request) {
	roomID, err := uuid.Parse(r.PathValue("roomId"))
	if err != nil {
		http.Error(w, "invalid roomId", http.StatusBadRequest)
		return
	}
	uid, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		http.Error(w, "auth required", http.StatusUnauthorized)
		return
	}
	if err := h.svc.MarkRoomRead(r.Context(), roomID, uid); err != nil {
		writeChatError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func writeChatError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrChatRoomNotFound):
		http.Error(w, err.Error(), http.StatusNotFound)
	case errors.Is(err, service.ErrChatNotParticipant):
		http.Error(w, err.Error(), http.StatusForbidden)
	case errors.Is(err, service.ErrChatRoomReadonly):
		http.Error(w, err.Error(), http.StatusConflict)
	case errors.Is(err, service.ErrChatGuestLocked):
		http.Error(w, err.Error(), http.StatusTooManyRequests)
	case errors.Is(err, service.ErrChatInvalidParams):
		http.Error(w, err.Error(), http.StatusBadRequest)
	default:
		http.Error(w, "internal", http.StatusInternalServerError)
	}
}
