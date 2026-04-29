package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
)

// DashboardScheduleRepository handles working hours, overrides, and absences.
type DashboardScheduleRepository interface {
	ListWorkingHours(ctx context.Context, salonID uuid.UUID) ([]model.WorkingHour, error)
	ReplaceWorkingHours(ctx context.Context, salonID uuid.UUID, rows []model.WorkingHour) error

	ListStaffWorkingHours(ctx context.Context, staffID, salonID uuid.UUID) ([]model.SalonMasterHour, error)
	ReplaceStaffWorkingHours(ctx context.Context, staffID, salonID uuid.UUID, rows []model.SalonMasterHour) error

	ListSalonDateOverrides(ctx context.Context, salonID uuid.UUID) ([]model.SalonDateOverride, error)
	ReplaceSalonDateOverrides(ctx context.Context, salonID uuid.UUID, rows []model.SalonDateOverride) error

	ListStaffAbsences(ctx context.Context, salonID, staffID uuid.UUID) ([]model.SalonMasterAbsence, error)
	ReplaceStaffAbsences(ctx context.Context, salonID, staffID uuid.UUID, rows []model.SalonMasterAbsence) error

	UpdateSalonSlotDuration(ctx context.Context, salonID uuid.UUID, minutes int) error
}
