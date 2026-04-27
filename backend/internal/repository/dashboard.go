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

// SalonMemberUserRow is one salon member with user fields for personnel UI.
type SalonMemberUserRow struct {
	UserID      uuid.UUID `json:"userId" gorm:"column:user_id"`
	PhoneE164   string    `json:"phoneE164" gorm:"column:phone_e164"`
	DisplayName *string   `json:"displayName,omitempty" gorm:"column:display_name"`
	Role        string    `json:"role" gorm:"column:role"`
}

// StaffServiceLine is one master–service link with service name for dashboard lists.
type StaffServiceLine struct {
	SalonMasterID uuid.UUID `gorm:"column:staff_id" db:"staff_id"`
	ServiceID     uuid.UUID `gorm:"column:service_id" db:"service_id"`
	ServiceName   string    `gorm:"column:service_name" db:"service_name"`
}

// SalonMasterServiceAssignment is one row for PUT .../salon-masters/:id/services.
type SalonMasterServiceAssignment struct {
	ServiceID               uuid.UUID
	PriceOverrideCents      *int
	DurationOverrideMinutes *int
}

// SalonMasterServiceDetail is a linked salon service with optional overrides.
type SalonMasterServiceDetail struct {
	SalonMasterID           uuid.UUID `gorm:"column:salon_master_id"`
	ServiceID               uuid.UUID `gorm:"column:service_id"`
	ServiceName             string    `gorm:"column:service_name"`
	SalonPriceCents         *int64    `gorm:"column:salon_price_cents"`
	SalonDurationMinutes    int       `gorm:"column:salon_duration_minutes"`
	PriceOverrideCents      *int      `gorm:"column:price_override_cents"`
	DurationOverrideMinutes *int      `gorm:"column:duration_override_minutes"`
}

// AppointmentListFilter filters dashboard appointment list.
type AppointmentListFilter struct {
	SalonID   uuid.UUID
	From      *time.Time
	To        *time.Time
	Statuses  []string // multi-status filter; empty = no status filter
	StaffID   *uuid.UUID
	ServiceID *uuid.UUID
	SortBy    string // allowlist-validated in repository: starts_at | service_name | status | client_name
	SortDir   string // "asc" | "desc"; default "desc"
	Search    string // ILIKE on guest_name, guest_phone_e164, users.display_name
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

// DashboardRepository reads/writes salon-owner dashboard data (scoped by salon_id).
type DashboardRepository interface {
	FindMembershipForUserAndSalon(ctx context.Context, userID, salonID uuid.UUID) (*SalonMembership, error)

	ListAppointments(ctx context.Context, f AppointmentListFilter) ([]AppointmentListRow, int64, error)
	GetAppointment(ctx context.Context, salonID, appointmentID uuid.UUID) (*model.Appointment, error)
	CreateAppointment(ctx context.Context, a *model.Appointment) error
	UpdateAppointment(ctx context.Context, a *model.Appointment) error
	UpdateAppointmentStatus(ctx context.Context, salonID, appointmentID uuid.UUID, status string) error
	ListAppointmentLineItems(ctx context.Context, appointmentID uuid.UUID) ([]model.AppointmentLineItem, error)
	ReplaceAppointmentLineItems(ctx context.Context, appointmentID uuid.UUID, items []model.AppointmentLineItem) error

	ListServices(ctx context.Context, salonID uuid.UUID) ([]model.SalonService, error)
	ListSalonCategoryScopes(ctx context.Context, salonID uuid.UUID) ([]string, error)
	ReplaceSalonCategoryScopes(ctx context.Context, salonID uuid.UUID, parentSlugs []string) error
	ListSystemServiceCategories(ctx context.Context) ([]model.ServiceCategory, error)
	GetSystemServiceCategoryBySlug(ctx context.Context, slug string) (*model.ServiceCategory, error)
	CreateService(ctx context.Context, s *model.SalonService) error
	UpdateService(ctx context.Context, s *model.SalonService) error
	SoftDeleteService(ctx context.Context, salonID, serviceID uuid.UUID) error
	GetService(ctx context.Context, salonID, serviceID uuid.UUID) (*model.SalonService, error)

	ListStaff(ctx context.Context, salonID uuid.UUID) ([]model.SalonMaster, error)
	CreateStaff(ctx context.Context, s *model.SalonMaster) error
	UpdateStaff(ctx context.Context, s *model.SalonMaster) error
	SoftDeleteStaff(ctx context.Context, salonID, staffID uuid.UUID) error
	GetStaff(ctx context.Context, salonID, staffID uuid.UUID) (*model.SalonMaster, error)

	ListStaffServiceIDs(ctx context.Context, salonID, staffID uuid.UUID) ([]uuid.UUID, error)
	ReplaceStaffServices(ctx context.Context, salonID, staffID uuid.UUID, serviceIDs []uuid.UUID) error
	ReplaceSalonMasterServiceAssignments(ctx context.Context, salonID, salonMasterID uuid.UUID, rows []SalonMasterServiceAssignment) error
	ListSalonMasterServiceDetails(ctx context.Context, salonID, salonMasterID uuid.UUID) ([]SalonMasterServiceDetail, error)
	ListSalonMasterServiceDetailsForSalon(ctx context.Context, salonID uuid.UUID) ([]SalonMasterServiceDetail, error)
	ReplaceServiceStaff(ctx context.Context, salonID, serviceID uuid.UUID, staffIDs []uuid.UUID) error
	ServiceStaffNamesMap(ctx context.Context, salonID uuid.UUID) (map[uuid.UUID][]string, error)
	StaffServiceLines(ctx context.Context, salonID uuid.UUID) ([]StaffServiceLine, error)

	StaffAvgRating(ctx context.Context, salonID, staffID uuid.UUID) (avg *float64, n int64, err error)
	CountStaffAppointments(ctx context.Context, salonID, staffID uuid.UUID, from, to *time.Time, statuses []string) (int64, error)
	SumStaffRevenueCents(ctx context.Context, salonID, staffID uuid.UUID, from, to time.Time) (int64, error)

	ListSalonDateOverrides(ctx context.Context, salonID uuid.UUID) ([]model.SalonDateOverride, error)
	ReplaceSalonDateOverrides(ctx context.Context, salonID uuid.UUID, rows []model.SalonDateOverride) error

	ListStaffAbsences(ctx context.Context, salonID, staffID uuid.UUID) ([]model.SalonMasterAbsence, error)
	ReplaceStaffAbsences(ctx context.Context, salonID, staffID uuid.UUID, rows []model.SalonMasterAbsence) error

	UpdateSalonSlotDuration(ctx context.Context, salonID uuid.UUID, minutes int) error

	ListWorkingHours(ctx context.Context, salonID uuid.UUID) ([]model.WorkingHour, error)
	ReplaceWorkingHours(ctx context.Context, salonID uuid.UUID, rows []model.WorkingHour) error

	ListStaffWorkingHours(ctx context.Context, staffID, salonID uuid.UUID) ([]model.SalonMasterHour, error)
	ReplaceStaffWorkingHours(ctx context.Context, staffID, salonID uuid.UUID, rows []model.SalonMasterHour) error

	// MasterProfile operations
	GetMasterProfile(ctx context.Context, masterID uuid.UUID) (*model.MasterProfile, error)
	GetMasterProfileBySalonMaster(ctx context.Context, salonMasterID uuid.UUID) (*model.MasterProfile, error)
	GetMasterProfileByPhoneE164(ctx context.Context, phoneE164 string) (*model.MasterProfile, error)
	CreateMasterProfile(ctx context.Context, p *model.MasterProfile) error
	UpdateMasterProfile(ctx context.Context, p *model.MasterProfile) error

	UpdateSalonProfile(ctx context.Context, salon *model.Salon) error
	FindSalonModel(ctx context.Context, salonID uuid.UUID) (*model.Salon, error)

	// CountAppointments counts rows for stats (status empty = all).
	CountAppointments(ctx context.Context, salonID uuid.UUID, from, to *time.Time, status string) (int64, error)

	ListSalonMemberUsers(ctx context.Context, salonID uuid.UUID) ([]SalonMemberUserRow, error)
	DeleteSalonMember(ctx context.Context, salonID, targetUserID uuid.UUID) (bool, error)
	UpdateSalonMemberRole(ctx context.Context, salonID, targetUserID uuid.UUID, role string) (bool, error)
}
