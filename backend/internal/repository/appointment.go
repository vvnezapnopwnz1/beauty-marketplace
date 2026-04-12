package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
)

// AppointmentRepository persists booking rows.
type AppointmentRepository interface {
	Create(ctx context.Context, a *model.Appointment) error
	// FindServiceForSalon returns the service row if it belongs to the salon and is active.
	FindServiceForSalon(ctx context.Context, salonID, serviceID uuid.UUID) (*model.SalonService, error)
}
