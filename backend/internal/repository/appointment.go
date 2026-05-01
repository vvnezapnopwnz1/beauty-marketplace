package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
)

// AppointmentRepository persists booking rows.
type AppointmentRepository interface {
	Create(ctx context.Context, a *model.Appointment) error
	// CreateWithLineItems inserts an appointment and its line items in one transaction.
	CreateWithLineItems(ctx context.Context, a *model.Appointment, lines []model.AppointmentLineItem) error
	// FindServiceForSalon returns the service row if it belongs to the salon and is active.
	FindServiceForSalon(ctx context.Context, salonID, serviceID uuid.UUID) (*model.SalonService, error)
	// FindByMasterInRange returns active (non-cancelled/no_show) appointments for a master within [from, to).
	FindByMasterInRange(ctx context.Context, salonMasterID uuid.UUID, from, to time.Time) ([]model.Appointment, error)
	// FindByID returns any appointment by ID.
	FindByID(ctx context.Context, id uuid.UUID) (*model.Appointment, error)
	// Update saves any changes to the appointment.
	Update(ctx context.Context, a *model.Appointment) error
	// ReplaceAppointmentLineItems replaces all line items for an appointment.
	ReplaceAppointmentLineItems(ctx context.Context, appointmentID uuid.UUID, items []model.AppointmentLineItem) error
	// SetSalonClientID links an appointment to a salon_clients row.
	SetSalonClientID(ctx context.Context, appointmentID, salonClientID uuid.UUID) error
}
