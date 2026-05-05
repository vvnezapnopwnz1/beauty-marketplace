package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/model"
)

// SalonRepository loads salons and related service lines from persistence.
type SalonRepository interface {
	FindAll(ctx context.Context) ([]model.Salon, error)
	FindByID(ctx context.Context, id uuid.UUID) (*model.Salon, error)
	FindServicesBySalonID(ctx context.Context, salonID uuid.UUID) ([]model.ServiceLine, error)
	GetWorkingHours(ctx context.Context, salonID uuid.UUID) ([]model.WorkingHourDTO, error)
	FindByExternalID(ctx context.Context, source, externalID string) (*model.Salon, error)
	FindByExternalIDs(ctx context.Context, source string, ids []string) ([]model.Salon, error)
	FindServicesBySalonIDs(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID][]model.ServiceLine, error)
}
