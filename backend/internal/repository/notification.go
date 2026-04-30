package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type NotificationRow struct {
	ID        uuid.UUID       `json:"id"`
	Type      string          `json:"type"`
	Title     string          `json:"title"`
	Body      string          `json:"body"`
	Data      json.RawMessage `json:"data"`
	SeenAt    *time.Time      `json:"seenAt,omitempty"`
	IsRead    bool            `json:"isRead"`
	ReadAt    *time.Time      `json:"readAt,omitempty"`
	CreatedAt time.Time       `json:"createdAt"`
}

type NotificationCreate struct {
	UserID     *uuid.UUID
	GuestPhone *string
	Type       string
	Title      string
	Body       string
	Data       json.RawMessage
}

type NotificationRepository interface {
	ListByUser(ctx context.Context, userID uuid.UUID, unreadOnly bool, limit, offset int) ([]NotificationRow, error)
	CountUnreadByUser(ctx context.Context, userID uuid.UUID) (int64, error)
	CountUnseenByUser(ctx context.Context, userID uuid.UUID) (int64, error)
	CreateBulk(ctx context.Context, rows []NotificationCreate) ([]NotificationRow, error)
	MarkSeen(ctx context.Context, userID, notificationID uuid.UUID) (bool, error)
	MarkAllSeen(ctx context.Context, userID uuid.UUID) (int64, error)
	MarkRead(ctx context.Context, userID, notificationID uuid.UUID) (bool, error)
	MarkAllRead(ctx context.Context, userID uuid.UUID) (int64, error)
}
