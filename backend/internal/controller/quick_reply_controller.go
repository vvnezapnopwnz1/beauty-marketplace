package controller

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/beauty-marketplace/backend/internal/service"
)

type QuickReplyController struct {
	service service.QuickReplyService
	log     *zap.Logger
}

func NewQuickReplyController(service service.QuickReplyService, log *zap.Logger) *QuickReplyController {
	return &QuickReplyController{service: service, log: log}
}

type createQuickReplyRequest struct {
	Title     string `json:"title"`
	Message   string `json:"message"`
	SortOrder int    `json:"sortOrder"`
}

type updateQuickReplyRequest struct {
	Title     *string `json:"title,omitempty"`
	Message   *string `json:"message,omitempty"`
	SortOrder *int    `json:"sortOrder,omitempty"`
}

type reorderQuickRepliesRequest struct {
	ReplyIDs []string `json:"replyIds"`
}

// GetQuickReplies returns quick replies for a salon
func (h *QuickReplyController) GetQuickReplies(w http.ResponseWriter, r *http.Request) {
	salonID, err := uuid.Parse(r.PathValue("salonId"))
	if err != nil {
		http.Error(w, "invalid salonId", http.StatusBadRequest)
		return
	}

	replies, err := h.service.GetQuickRepliesBySalon(r.Context(), salonID)
	if err != nil {
		h.log.Error("failed to get quick replies", zap.Error(err))
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(replies)
}

// CreateQuickReply creates a new quick reply
func (h *QuickReplyController) CreateQuickReply(w http.ResponseWriter, r *http.Request) {
	salonID, err := uuid.Parse(r.PathValue("salonId"))
	if err != nil {
		http.Error(w, "invalid salonId", http.StatusBadRequest)
		return
	}

	var req createQuickReplyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if req.Title == "" || req.Message == "" {
		http.Error(w, "title and message required", http.StatusBadRequest)
		return
	}

	reply, err := h.service.CreateQuickReply(r.Context(), salonID, req.Title, req.Message, req.SortOrder)
	if err != nil {
		h.log.Error("failed to create quick reply", zap.Error(err))
		if err == service.ErrInvalidParams {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "internal error", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(reply)
}

// UpdateQuickReply updates an existing quick reply
func (h *QuickReplyController) UpdateQuickReply(w http.ResponseWriter, r *http.Request) {
	replyID, err := uuid.Parse(r.PathValue("replyId"))
	if err != nil {
		http.Error(w, "invalid replyId", http.StatusBadRequest)
		return
	}

	salonID, err := uuid.Parse(r.PathValue("salonId"))
	if err != nil {
		http.Error(w, "invalid salonId", http.StatusBadRequest)
		return
	}

	var req updateQuickReplyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	reply, err := h.service.UpdateQuickReply(r.Context(), replyID, salonID, req.Title, req.Message, req.SortOrder)
	if err != nil {
		h.log.Error("failed to update quick reply", zap.Error(err))
		if err == service.ErrQuickReplyNotFound {
			http.Error(w, err.Error(), http.StatusNotFound)
		} else if err == service.ErrQuickReplyAccess {
			http.Error(w, err.Error(), http.StatusForbidden)
		} else {
			http.Error(w, "internal error", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(reply)
}

// DeleteQuickReply deletes a quick reply
func (h *QuickReplyController) DeleteQuickReply(w http.ResponseWriter, r *http.Request) {
	replyID, err := uuid.Parse(r.PathValue("replyId"))
	if err != nil {
		http.Error(w, "invalid replyId", http.StatusBadRequest)
		return
	}

	salonID, err := uuid.Parse(r.PathValue("salonId"))
	if err != nil {
		http.Error(w, "invalid salonId", http.StatusBadRequest)
		return
	}

	if err := h.service.DeleteQuickReply(r.Context(), replyID, salonID); err != nil {
		h.log.Error("failed to delete quick reply", zap.Error(err))
		if err == service.ErrQuickReplyNotFound {
			http.Error(w, err.Error(), http.StatusNotFound)
		} else if err == service.ErrQuickReplyAccess {
			http.Error(w, err.Error(), http.StatusForbidden)
		} else {
			http.Error(w, "internal error", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ReorderQuickReplies reorders quick replies
func (h *QuickReplyController) ReorderQuickReplies(w http.ResponseWriter, r *http.Request) {
	salonID, err := uuid.Parse(r.PathValue("salonId"))
	if err != nil {
		http.Error(w, "invalid salonId", http.StatusBadRequest)
		return
	}

	var req reorderQuickRepliesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	replyIDs := make([]uuid.UUID, len(req.ReplyIDs))
	for i, idStr := range req.ReplyIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			http.Error(w, "invalid replyId in list", http.StatusBadRequest)
			return
		}
		replyIDs[i] = id
	}

	if err := h.service.ReorderQuickReplies(r.Context(), salonID, replyIDs); err != nil {
		h.log.Error("failed to reorder quick replies", zap.Error(err))
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
