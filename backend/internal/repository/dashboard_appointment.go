package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
)

// AppointmentListFilter filters dashboard appointment list.
type AppointmentListFilter struct {
	SalonID   uuid.UUID
	From      *time.Time
	To        *time.Time
	Statuses  []string
	StaffID   *uuid.UUID
	ServiceID *uuid.UUID
	SortBy    string
	SortDir   string
	Search    string
	Page      int
	PageSize  int
}

// AppointmentListRow is one appointment with joined labels for API.
type AppointmentListRow struct {
	Appointment  model.Appointment
	ServiceName  string
	ServiceNames []string
	ServiceIDs   []uuid.UUID
	StaffName    *string
	ClientLabel  string
	ClientPhone  *string
}

// DashboardAppointmentRepository handles appointment persistence for the dashboard.
type DashboardAppointmentRepository interface {
	ListAppointments(ctx context.Context, f AppointmentListFilter) ([]AppointmentListRow, int64, error)
	GetAppointment(ctx context.Context, salonID, appointmentID uuid.UUID) (*model.Appointment, error)
	CreateAppointment(ctx context.Context, a *model.Appointment) error
	UpdateAppointment(ctx context.Context, a *model.Appointment) error
	UpdateAppointmentStatus(ctx context.Context, salonID, appointmentID uuid.UUID, status string) error
	ListAppointmentLineItems(ctx context.Context, appointmentID uuid.UUID) ([]model.AppointmentLineItem, error)
	ReplaceAppointmentLineItems(ctx context.Context, appointmentID uuid.UUID, items []model.AppointmentLineItem) error
}
