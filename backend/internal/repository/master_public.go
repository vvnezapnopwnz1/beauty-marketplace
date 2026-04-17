package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// SalonMasterPublicRow is one active salon master for public salon page.
type SalonMasterPublicRow struct {
	SalonMasterID uuid.UUID
	DisplayName   string
	Color         *string
	MasterID      *uuid.UUID
	ProfileID     *uuid.UUID
	Bio           *string
	Specs         []string
	AvatarURL     *string
	YearsExp      *int
	CachedRating  *float64
	CachedReviews int
}

// SalonMasterServiceLinkRow is one linked service for a salon master (public).
type SalonMasterServiceLinkRow struct {
	SalonMasterID           uuid.UUID `gorm:"column:salon_master_id"`
	ServiceID               uuid.UUID `gorm:"column:service_id"`
	ServiceName             string    `gorm:"column:service_name"`
	SalonPriceCents         *int64    `gorm:"column:salon_price_cents"`
	SalonDurationMinutes    int       `gorm:"column:salon_duration_minutes"`
	PriceOverrideCents      *int      `gorm:"column:price_override_cents"`
	DurationOverrideMinutes *int      `gorm:"column:duration_override_minutes"`
}

// MasterProfilePublicRow is master_profiles for public master page.
type MasterProfilePublicRow struct {
	ID                uuid.UUID
	DisplayName       string
	Bio               *string
	Specs             []string
	AvatarURL         *string
	YearsExp          *int
	CachedRating      *float64
	CachedReviewCount int
}

// MasterSalonMembershipRow is one active salon_masters row with salon fields.
type MasterSalonMembershipRow struct {
	SalonMasterID        uuid.UUID
	SalonID              uuid.UUID
	DisplayNameInSalon   string
	JoinedAt             *time.Time
	Color                *string
	SalonNameOverride    *string
	SalonAddress         *string
	SalonAddressOverride *string
}

// MasterPublicRepository reads master/salon-master data for unauthenticated clients.
type MasterPublicRepository interface {
	ListSalonMastersPublic(ctx context.Context, salonID uuid.UUID) ([]SalonMasterPublicRow, []SalonMasterServiceLinkRow, error)
	GetMasterProfilePublic(ctx context.Context, masterProfileID uuid.UUID) (*MasterProfilePublicRow, []MasterSalonMembershipRow, []SalonMasterServiceLinkRow, error)
}
