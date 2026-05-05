package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
)

// StaffServiceLine is one master-service link with service name for dashboard lists.
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

// DashboardStaffRepository handles staff/master persistence for the dashboard.
type DashboardStaffRepository interface {
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

	GetMasterProfile(ctx context.Context, masterID uuid.UUID) (*model.MasterProfile, error)
	GetMasterProfileBySalonMaster(ctx context.Context, salonMasterID uuid.UUID) (*model.MasterProfile, error)
	GetMasterProfileByPhoneE164(ctx context.Context, phoneE164 string) (*model.MasterProfile, error)
	CreateMasterProfile(ctx context.Context, p *model.MasterProfile) error
	UpdateMasterProfile(ctx context.Context, p *model.MasterProfile) error
}
