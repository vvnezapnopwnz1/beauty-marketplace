package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
)

// SalonClaimRow is a claim row enriched with user info for admin display.
type SalonClaimRow struct {
	Claim           model.SalonClaim
	UserPhone       string
	UserDisplayName *string
}

// SalonClaimRepository reads/writes salon claims.
type SalonClaimRepository interface {
	// FindActiveByUserAndPlace returns a pending or approved claim for user+place, or nil.
	FindActiveByUserAndPlace(ctx context.Context, userID uuid.UUID, source, externalID string) (*model.SalonClaim, error)
	// Create inserts a new claim.
	Create(ctx context.Context, c *model.SalonClaim) error
	// GetByID returns a claim by ID (any status), or nil if not found.
	GetByID(ctx context.Context, id uuid.UUID) (*model.SalonClaim, error)
	// ListByStatus returns paginated claims joined with user data for the admin page.
	ListByStatus(ctx context.Context, status string, page, pageSize int) ([]SalonClaimRow, int64, error)
	// ApproveClaim runs the approval transaction atomically:
	// creates salons + salon_external_ids + salon_members + salon_subscriptions,
	// marks the claim approved, marks competing pending claims as duplicate.
	ApproveClaim(ctx context.Context, claimID, reviewerID uuid.UUID) (salonID uuid.UUID, err error)
	// RejectClaim marks a claim as rejected with a reason.
	RejectClaim(ctx context.Context, claimID, reviewerID uuid.UUID, reason string) error
}
