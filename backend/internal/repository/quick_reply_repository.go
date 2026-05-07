package repository

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/beauty-marketplace/backend/internal/model"
)

type QuickReplyRepository interface {
	GetBySalon(ctx context.Context, salonID uuid.UUID) ([]model.ChatQuickReply, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.ChatQuickReply, error)
	Create(ctx context.Context, reply *model.ChatQuickReply) error
	Update(ctx context.Context, reply *model.ChatQuickReply) error
	Delete(ctx context.Context, id uuid.UUID) error
	Reorder(ctx context.Context, salonID uuid.UUID, replyIDs []uuid.UUID) error
}

type quickReplyRepository struct {
	db *gorm.DB
}

func NewQuickReplyRepository(db *gorm.DB) QuickReplyRepository {
	return &quickReplyRepository{db: db}
}

func (r *quickReplyRepository) GetBySalon(ctx context.Context, salonID uuid.UUID) ([]model.ChatQuickReply, error) {
	var replies []model.ChatQuickReply
	if err := r.db.WithContext(ctx).
		Where("salon_id = ? AND is_active = ?", salonID, true).
		Order("sort_order ASC, created_at ASC").
		Find(&replies).Error; err != nil {
		return nil, err
	}
	return replies, nil
}

func (r *quickReplyRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.ChatQuickReply, error) {
	var reply model.ChatQuickReply
	if err := r.db.WithContext(ctx).First(&reply, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &reply, nil
}

func (r *quickReplyRepository) Create(ctx context.Context, reply *model.ChatQuickReply) error {
	return r.db.WithContext(ctx).Create(reply).Error
}

func (r *quickReplyRepository) Update(ctx context.Context, reply *model.ChatQuickReply) error {
	return r.db.WithContext(ctx).Save(reply).Error
}

func (r *quickReplyRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&model.ChatQuickReply{}, "id = ?", id).Error
}

func (r *quickReplyRepository) Reorder(ctx context.Context, salonID uuid.UUID, replyIDs []uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for i, id := range replyIDs {
			if err := tx.Model(&model.ChatQuickReply{}).
				Where("id = ? AND salon_id = ?", id, salonID).
				Update("sort_order", i).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
