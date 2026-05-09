package repository

import (
	"context"

	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
	"github.com/google/uuid"
)

// MasterScheduleRepository manages master personal working hours.
type MasterScheduleRepository interface {
	ListMasterWorkingHours(ctx context.Context, masterProfileID uuid.UUID) ([]model.MasterWorkingHour, error)
	ReplaceMasterWorkingHours(ctx context.Context, masterProfileID uuid.UUID, rows []model.MasterWorkingHour) error
}
