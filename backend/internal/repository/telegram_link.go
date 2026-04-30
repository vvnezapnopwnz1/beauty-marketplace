package repository

import (
	"context"

	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
)

type TelegramLinkRepository interface {
	FindByPhone(ctx context.Context, phone string) (*model.TelegramPhoneLink, error)
	Save(ctx context.Context, link *model.TelegramPhoneLink) error
}

// TelegramOutboxWriter enqueues a plain-text message for a Telegram chat.
// The Telegram bot worker polls telegram_outbox and delivers pending messages.
type TelegramOutboxWriter interface {
	QueueMessage(ctx context.Context, chatID int64, text string) error
}
