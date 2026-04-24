package repository

import (
	"context"

	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
)

type TelegramLinkRepository interface {
	FindByPhone(ctx context.Context, phone string) (*model.TelegramPhoneLink, error)
	Save(ctx context.Context, link *model.TelegramPhoneLink) error
}
