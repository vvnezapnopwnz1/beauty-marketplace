package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
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

// DashboardSalonRepository handles salon membership, profile, and personnel.
type DashboardSalonRepository interface {
	FindMembershipForUserAndSalon(ctx context.Context, userID, salonID uuid.UUID) (*SalonMembership, error)

	UpdateSalonProfile(ctx context.Context, salon *model.Salon) error
	FindSalonModel(ctx context.Context, salonID uuid.UUID) (*model.Salon, error)

	ListSalonMemberUsers(ctx context.Context, salonID uuid.UUID) ([]SalonMemberUserRow, error)
	DeleteSalonMember(ctx context.Context, salonID, targetUserID uuid.UUID) (bool, error)
	UpdateSalonMemberRole(ctx context.Context, salonID, targetUserID uuid.UUID, role string) (bool, error)
}
