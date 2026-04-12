package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/model"
)

// SalonRepository loads salons and related service lines from persistence.
type SalonRepository interface {
	FindAll(ctx context.Context) ([]model.Salon, error)
	FindByID(ctx context.Context, id uuid.UUID) (*model.Salon, error)
	FindServicesBySalonID(ctx context.Context, salonID uuid.UUID) ([]model.ServiceLine, error)
	FindByExternalIDs(ctx context.Context, source string, ids []string) ([]model.Salon, error)
	FindServicesBySalonIDs(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID][]model.ServiceLine, error)
}
