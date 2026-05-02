package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
)

// MasterInviteRow is a pending salon_masters invite for the master cabinet.
type MasterInviteRow struct {
	SalonMasterID uuid.UUID
	SalonID       uuid.UUID
	SalonName     string
	SalonAddress  *string
	CreatedAt     time.Time
}

// MasterActiveSalonRow is an active salon membership for the master cabinet.
type MasterActiveSalonRow struct {
	SalonMasterID uuid.UUID
	SalonID       uuid.UUID
	SalonName     string
	SalonAddress  *string
	JoinedAt      *time.Time
}

// MasterAppointmentListRow is one appointment visible to the master across salons.
type MasterAppointmentListRow struct {
	Appointment model.Appointment
	ServiceName string
	SalonName   string
	ClientLabel string
	ClientPhone *string
}

// MasterAppointmentListFilter filters master cross-salon appointments.
type MasterAppointmentListFilter struct {
	MasterProfileID uuid.UUID
	From            *time.Time
	To              *time.Time
	Status          string
	Search          string
	Source          string // "personal", salon UUID, or "" for all
	SortBy          string
	SortDir         string
	Limit           int
	Offset          int
}

// MasterClientListFilter filters master personal clients.
type MasterClientListFilter struct {
	MasterProfileID uuid.UUID
	Search          string
	SortBy          string
	SortDir         string
	Limit           int
	Offset          int
}

// MasterDashboardRepository persists master cabinet reads/writes and OTP claiming helpers.
type MasterDashboardRepository interface {
	FindShadowMasterProfileIDByPhone(ctx context.Context, phoneE164 string) (*uuid.UUID, error)
	ClaimMasterProfile(ctx context.Context, profileID, userID uuid.UUID, phoneE164 string) error
	FindMasterProfileIDByUserID(ctx context.Context, userID uuid.UUID) (*uuid.UUID, error)
	GetMasterProfileByUserID(ctx context.Context, userID uuid.UUID) (*model.MasterProfile, error)
	UpdateMasterProfileByUserID(ctx context.Context, userID uuid.UUID, displayName string, bio *string, specs []string, years *int, avatar *string) error
	ListPendingInvites(ctx context.Context, masterProfileID uuid.UUID) ([]MasterInviteRow, error)
	ListActiveSalonMemberships(ctx context.Context, masterProfileID uuid.UUID) ([]MasterActiveSalonRow, error)
	AcceptPendingInvite(ctx context.Context, masterProfileID, salonMasterID uuid.UUID) (bool, error)
	DeclinePendingInvite(ctx context.Context, masterProfileID, salonMasterID uuid.UUID) (bool, error)
	ListMasterAppointments(ctx context.Context, f MasterAppointmentListFilter) ([]MasterAppointmentListRow, int64, error)

	// System service categories (global catalog; master cabinet picker).
	ListSystemServiceCategories(ctx context.Context) ([]model.ServiceCategory, error)

	// MasterServices
	ListMasterServices(ctx context.Context, masterProfileID uuid.UUID) ([]model.MasterService, error)
	GetMasterService(ctx context.Context, masterProfileID, serviceID uuid.UUID) (*model.MasterService, error)
	CreateMasterService(ctx context.Context, s *model.MasterService) error
	UpdateMasterService(ctx context.Context, s *model.MasterService) error
	DeleteMasterService(ctx context.Context, masterProfileID, serviceID uuid.UUID) error

	// MasterClients
	ListMasterClients(ctx context.Context, f MasterClientListFilter) ([]model.MasterClient, int64, error)
	GetMasterClient(ctx context.Context, masterProfileID, clientID uuid.UUID) (*model.MasterClient, error)
	CreateMasterClient(ctx context.Context, c *model.MasterClient) error
	UpdateMasterClient(ctx context.Context, c *model.MasterClient) error
	DeleteMasterClient(ctx context.Context, masterProfileID, clientID uuid.UUID) error
}
