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

// AppointmentListFilter filters dashboard appointment list.
type AppointmentListFilter struct {
	SalonID  uuid.UUID
	From     *time.Time
	To       *time.Time
	Status   string
	StaffID  *uuid.UUID
	Page     int
	PageSize int
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
	CreateService(ctx context.Context, s *model.SalonService) error
	UpdateService(ctx context.Context, s *model.SalonService) error
	SoftDeleteService(ctx context.Context, salonID, serviceID uuid.UUID) error
	GetService(ctx context.Context, salonID, serviceID uuid.UUID) (*model.SalonService, error)

	ListStaff(ctx context.Context, salonID uuid.UUID) ([]model.Staff, error)
	CreateStaff(ctx context.Context, s *model.Staff) error
	UpdateStaff(ctx context.Context, s *model.Staff) error
	SoftDeleteStaff(ctx context.Context, salonID, staffID uuid.UUID) error
	GetStaff(ctx context.Context, salonID, staffID uuid.UUID) (*model.Staff, error)

	ListWorkingHours(ctx context.Context, salonID uuid.UUID) ([]model.WorkingHour, error)
	ReplaceWorkingHours(ctx context.Context, salonID uuid.UUID, rows []model.WorkingHour) error

	ListStaffWorkingHours(ctx context.Context, staffID, salonID uuid.UUID) ([]model.StaffWorkingHour, error)
	ReplaceStaffWorkingHours(ctx context.Context, staffID, salonID uuid.UUID, rows []model.StaffWorkingHour) error

	UpdateSalonProfile(ctx context.Context, salon *model.Salon) error
	FindSalonModel(ctx context.Context, salonID uuid.UUID) (*model.Salon, error)

	// CountAppointments counts rows for stats (status empty = all).
	CountAppointments(ctx context.Context, salonID uuid.UUID, from, to *time.Time, status string) (int64, error)
}
