package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
)

// SalonSlotMeta is the salon context needed to generate slots.
type SalonSlotMeta struct {
	Timezone            string
	SlotDurationMinutes int
}

// SalonMasterBasic is the minimal master info for slot listings.
type SalonMasterBasic struct {
	ID          uuid.UUID
	SalonID     uuid.UUID
	MasterID    *uuid.UUID
	DisplayName string
}

// BookingSlotsRepository reads calendar data for available-slot calculation.
type BookingSlotsRepository interface {
	GetSalonMeta(ctx context.Context, salonID uuid.UUID) (*SalonSlotMeta, error)
	ListActiveSalonMasters(ctx context.Context, salonID uuid.UUID) ([]SalonMasterBasic, error)
	GetSalonMaster(ctx context.Context, salonID, salonMasterID uuid.UUID) (*SalonMasterBasic, error)
	GetSalonMasterByProfileID(ctx context.Context, salonID, masterProfileID uuid.UUID) (*SalonMasterBasic, error)
	GetMasterWorkingHour(ctx context.Context, salonMasterID uuid.UUID, dayOfWeek int) (*model.SalonMasterHour, error)
	GetServiceDurationOverride(ctx context.Context, salonMasterID, serviceID uuid.UUID) (*int, error)
	// GetMasterServiceOverrides returns duration and price overrides from salon_master_services (nil if no row).
	GetMasterServiceOverrides(ctx context.Context, salonMasterID, serviceID uuid.UUID) (durationOverride *int, priceOverride *int, err error)
	// ListSalonMastersCoveringServices returns salon_masters.id that offer every listed active service.
	ListSalonMastersCoveringServices(ctx context.Context, salonID uuid.UUID, serviceIDs []uuid.UUID) ([]uuid.UUID, error)
}
