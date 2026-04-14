package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
)

// SalonMembership is a row in salon_members (owner/admin).
type SalonMembership struct {
	SalonID uuid.UUID
	Role    string
}

// StaffServiceLine is one staff–service link with service name for dashboard lists.
type StaffServiceLine struct {
	StaffID     uuid.UUID `gorm:"column:staff_id" db:"staff_id"`
	ServiceID   uuid.UUID `gorm:"column:service_id" db:"service_id"`
	ServiceName string    `gorm:"column:service_name" db:"service_name"`
}

// AppointmentListFilter filters dashboard appointment list.
type AppointmentListFilter struct {
	SalonID   uuid.UUID
	From      *time.Time
	To        *time.Time
	Status    string
	StaffID   *uuid.UUID
	ServiceID *uuid.UUID
	Page      int
	PageSize  int
}

// AppointmentListRow is one appointment with joined labels for API.
type AppointmentListRow struct {
	Appointment model.Appointment
	ServiceName string
	StaffName   *string
	ClientLabel string
	ClientPhone *string
}

// DashboardRepository reads/writes salon-owner dashboard data (scoped by salon_id).
type DashboardRepository interface {
	FindMembershipForUser(ctx context.Context, userID uuid.UUID) (*SalonMembership, error)

	ListAppointments(ctx context.Context, f AppointmentListFilter) ([]AppointmentListRow, int64, error)
	GetAppointment(ctx context.Context, salonID, appointmentID uuid.UUID) (*model.Appointment, error)
	CreateAppointment(ctx context.Context, a *model.Appointment) error
	UpdateAppointment(ctx context.Context, a *model.Appointment) error
	UpdateAppointmentStatus(ctx context.Context, salonID, appointmentID uuid.UUID, status string) error

	ListServices(ctx context.Context, salonID uuid.UUID) ([]model.SalonService, error)
	ListSystemServiceCategories(ctx context.Context) ([]model.ServiceCategory, error)
	GetSystemServiceCategoryBySlug(ctx context.Context, slug string) (*model.ServiceCategory, error)
	CreateService(ctx context.Context, s *model.SalonService) error
	UpdateService(ctx context.Context, s *model.SalonService) error
	SoftDeleteService(ctx context.Context, salonID, serviceID uuid.UUID) error
	GetService(ctx context.Context, salonID, serviceID uuid.UUID) (*model.SalonService, error)

	ListStaff(ctx context.Context, salonID uuid.UUID) ([]model.Staff, error)
	CreateStaff(ctx context.Context, s *model.Staff) error
	UpdateStaff(ctx context.Context, s *model.Staff) error
	SoftDeleteStaff(ctx context.Context, salonID, staffID uuid.UUID) error
	GetStaff(ctx context.Context, salonID, staffID uuid.UUID) (*model.Staff, error)

	ListStaffServiceIDs(ctx context.Context, salonID, staffID uuid.UUID) ([]uuid.UUID, error)
	ReplaceStaffServices(ctx context.Context, salonID, staffID uuid.UUID, serviceIDs []uuid.UUID) error
	ReplaceServiceStaff(ctx context.Context, salonID, serviceID uuid.UUID, staffIDs []uuid.UUID) error
	ServiceStaffNamesMap(ctx context.Context, salonID uuid.UUID) (map[uuid.UUID][]string, error)
	StaffServiceLines(ctx context.Context, salonID uuid.UUID) ([]StaffServiceLine, error)

	StaffAvgRating(ctx context.Context, salonID, staffID uuid.UUID) (avg *float64, n int64, err error)
	CountStaffAppointments(ctx context.Context, salonID, staffID uuid.UUID, from, to *time.Time, statuses []string) (int64, error)
	SumStaffRevenueCents(ctx context.Context, salonID, staffID uuid.UUID, from, to time.Time) (int64, error)

	ListSalonDateOverrides(ctx context.Context, salonID uuid.UUID) ([]model.SalonDateOverride, error)
	ReplaceSalonDateOverrides(ctx context.Context, salonID uuid.UUID, rows []model.SalonDateOverride) error

	ListStaffAbsences(ctx context.Context, salonID, staffID uuid.UUID) ([]model.StaffAbsence, error)
	ReplaceStaffAbsences(ctx context.Context, salonID, staffID uuid.UUID, rows []model.StaffAbsence) error

	UpdateSalonSlotDuration(ctx context.Context, salonID uuid.UUID, minutes int) error

	ListWorkingHours(ctx context.Context, salonID uuid.UUID) ([]model.WorkingHour, error)
	ReplaceWorkingHours(ctx context.Context, salonID uuid.UUID, rows []model.WorkingHour) error

	ListStaffWorkingHours(ctx context.Context, staffID, salonID uuid.UUID) ([]model.StaffWorkingHour, error)
	ReplaceStaffWorkingHours(ctx context.Context, staffID, salonID uuid.UUID, rows []model.StaffWorkingHour) error

	UpdateSalonProfile(ctx context.Context, salon *model.Salon) error
	FindSalonModel(ctx context.Context, salonID uuid.UUID) (*model.Salon, error)

	// CountAppointments counts rows for stats (status empty = all).
	CountAppointments(ctx context.Context, salonID uuid.UUID, from, to *time.Time, status string) (int64, error)
}
