package persistence

import (
	"context"

	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
	"github.com/beauty-marketplace/backend/internal/repository"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type telegramLinkRepository struct {
	db *gorm.DB
}

func NewTelegramLinkRepository(db *gorm.DB) repository.TelegramLinkRepository {
	return &telegramLinkRepository{db: db}
}

func (r *telegramLinkRepository) FindByPhone(ctx context.Context, phone string) (*model.TelegramPhoneLink, error) {
	var link model.TelegramPhoneLink
	if err := r.db.WithContext(ctx).Where("phone_e164 = ?", phone).First(&link).Error; err != nil {
		return nil, err
	}
	return &link, nil
}

func (r *telegramLinkRepository) Save(ctx context.Context, link *model.TelegramPhoneLink) error {
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "phone_e164"}},
		DoUpdates: clause.AssignmentColumns([]string{"chat_id", "telegram_id", "first_name", "updated_at"}),
	}).Create(link).Error
}

// telegramOutboxWriter implements TelegramOutboxWriter backed by the same DB.
type telegramOutboxWriter struct {
	db *gorm.DB
}

func NewTelegramOutboxWriter(db *gorm.DB) repository.TelegramOutboxWriter {
	return &telegramOutboxWriter{db: db}
}

func (w *telegramOutboxWriter) QueueMessage(ctx context.Context, chatID int64, text string) error {
	return w.db.WithContext(ctx).Create(&model.TelegramOutbox{
		ChatID: chatID,
		Text:   text,
	}).Error
}
