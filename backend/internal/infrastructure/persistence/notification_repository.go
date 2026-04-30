package persistence

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

type notificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) repository.NotificationRepository {
	return &notificationRepository{db: db}
}

func (r *notificationRepository) ListByUser(
	ctx context.Context,
	userID uuid.UUID,
	unreadOnly bool,
	limit,
	offset int,
) ([]repository.NotificationRow, error) {
	q := r.db.WithContext(ctx).Model(&model.Notification{}).Where("user_id = ?", userID)
	if unreadOnly {
		q = q.Where("is_read = FALSE")
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	type scanRow struct {
		ID        uuid.UUID  `gorm:"column:id"`
		Type      string     `gorm:"column:type"`
		Title     string     `gorm:"column:title"`
		Body      string     `gorm:"column:body"`
		Data      []byte     `gorm:"column:data"`
		SeenAt    *time.Time `gorm:"column:seen_at"`
		IsRead    bool       `gorm:"column:is_read"`
		ReadAt    *time.Time `gorm:"column:read_at"`
		CreatedAt time.Time  `gorm:"column:created_at"`
	}
	var scans []scanRow
	if err := q.Order("created_at DESC").Limit(limit).Offset(max(offset, 0)).Find(&scans).Error; err != nil {
		return nil, err
	}
	out := make([]repository.NotificationRow, 0, len(scans))
	for _, row := range scans {
		data := json.RawMessage("{}")
		if len(row.Data) > 0 {
			data = json.RawMessage(row.Data)
		}
		out = append(out, repository.NotificationRow{
			ID: row.ID, Type: row.Type, Title: row.Title, Body: row.Body,
			Data: data, SeenAt: row.SeenAt, IsRead: row.IsRead, ReadAt: row.ReadAt, CreatedAt: row.CreatedAt,
		})
	}
	return out, nil
}

func (r *notificationRepository) CountUnreadByUser(ctx context.Context, userID uuid.UUID) (int64, error) {
	var c int64
	err := r.db.WithContext(ctx).Model(&model.Notification{}).
		Where("user_id = ? AND is_read = FALSE", userID).
		Count(&c).Error
	return c, err
}

func (r *notificationRepository) CountUnseenByUser(ctx context.Context, userID uuid.UUID) (int64, error) {
	var c int64
	err := r.db.WithContext(ctx).Model(&model.Notification{}).
		Where("user_id = ? AND seen_at IS NULL", userID).
		Count(&c).Error
	return c, err
}

func (r *notificationRepository) CreateBulk(ctx context.Context, rows []repository.NotificationCreate) ([]repository.NotificationRow, error) {
	if len(rows) == 0 {
		return []repository.NotificationRow{}, nil
	}
	items := make([]model.Notification, 0, len(rows))
	for _, row := range rows {
		data := []byte("{}")
		if len(row.Data) > 0 {
			data = []byte(row.Data)
		}
		items = append(items, model.Notification{
			UserID: row.UserID, GuestPhone: row.GuestPhone, Type: row.Type,
			Title: row.Title, Body: row.Body, Data: data,
		})
	}
	if err := r.db.WithContext(ctx).Create(&items).Error; err != nil {
		return nil, err
	}
	out := make([]repository.NotificationRow, 0, len(items))
	for _, item := range items {
		data := json.RawMessage("{}")
		if len(item.Data) > 0 {
			data = json.RawMessage(item.Data)
		}
		out = append(out, repository.NotificationRow{
			ID: item.ID, Type: item.Type, Title: item.Title, Body: item.Body,
			Data: data, SeenAt: item.SeenAt, IsRead: item.IsRead, ReadAt: item.ReadAt, CreatedAt: item.CreatedAt,
		})
	}
	return out, nil
}

func (r *notificationRepository) MarkSeen(ctx context.Context, userID, notificationID uuid.UUID) (bool, error) {
	now := time.Now().UTC()
	tx := r.db.WithContext(ctx).Model(&model.Notification{}).
		Where("id = ? AND user_id = ? AND seen_at IS NULL", notificationID, userID).
		Updates(map[string]any{"seen_at": now})
	return tx.RowsAffected > 0, tx.Error
}

func (r *notificationRepository) MarkAllSeen(ctx context.Context, userID uuid.UUID) (int64, error) {
	now := time.Now().UTC()
	tx := r.db.WithContext(ctx).Model(&model.Notification{}).
		Where("user_id = ? AND seen_at IS NULL", userID).
		Updates(map[string]any{"seen_at": now})
	return tx.RowsAffected, tx.Error
}

func (r *notificationRepository) MarkRead(ctx context.Context, userID, notificationID uuid.UUID) (bool, error) {
	now := time.Now().UTC()
	tx := r.db.WithContext(ctx).Model(&model.Notification{}).
		Where("id = ? AND user_id = ? AND is_read = FALSE", notificationID, userID).
		Updates(map[string]any{
			"is_read": true,
			"read_at": now,
			"seen_at": gorm.Expr("COALESCE(seen_at, ?)", now),
		})
	return tx.RowsAffected > 0, tx.Error
}

func (r *notificationRepository) MarkAllRead(ctx context.Context, userID uuid.UUID) (int64, error) {
	now := time.Now().UTC()
	tx := r.db.WithContext(ctx).Model(&model.Notification{}).
		Where("user_id = ? AND is_read = FALSE", userID).
		Updates(map[string]any{
			"is_read": true,
			"read_at": now,
			"seen_at": gorm.Expr("COALESCE(seen_at, ?)", now),
		})
	return tx.RowsAffected, tx.Error
}

func max(v, floor int) int {
	if v < floor {
		return floor
	}
	return v
}
