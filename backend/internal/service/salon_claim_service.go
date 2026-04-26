package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
)

var (
	ErrClaimAlreadyClaimed   = errors.New("salon already claimed by platform")
	ErrClaimAlreadySubmitted = errors.New("active claim already submitted")
	ErrClaimNotFound         = errors.New("claim not found")
	ErrClaimNotPending       = errors.New("claim is not in pending state")
)

// SubmitClaimInput is the payload for Submit.
type SubmitClaimInput struct {
	UserID          uuid.UUID
	Source          string
	ExternalID      string
	RelationType    string
	Comment         *string
	SnapshotName    string
	SnapshotAddress *string
	SnapshotPhone   *string
	SnapshotPhoto   *string
}

// SalonClaimService handles salon claim business logic.
type SalonClaimService interface {
	// Submit validates and persists a new claim. Returns ErrClaimAlreadyClaimed if
	// the external place is already linked to a platform salon, or ErrClaimAlreadySubmitted
	// if this user already has an active claim for this place.
	Submit(ctx context.Context, in SubmitClaimInput) (*model.SalonClaim, error)
	// GetStatus returns the caller's active claim for a given place, or nil if none.
	GetStatus(ctx context.Context, userID uuid.UUID, source, externalID string) (*model.SalonClaim, error)
	// ListForAdmin returns paginated claims filtered by status for the admin page.
	ListForAdmin(ctx context.Context, status string, page, pageSize int) ([]repository.SalonClaimRow, int64, error)
	// Approve approves a pending claim and creates the salon+members atomically.
	// Returns the new salon UUID.
	Approve(ctx context.Context, claimID, reviewerID uuid.UUID) (uuid.UUID, error)
	// Reject marks a pending claim rejected with a reason.
	Reject(ctx context.Context, claimID, reviewerID uuid.UUID, reason string) error
}

type salonClaimService struct {
	claimRepo repository.SalonClaimRepository
	salonRepo repository.SalonRepository
}

// NewSalonClaimService constructs SalonClaimService.
func NewSalonClaimService(claimRepo repository.SalonClaimRepository, salonRepo repository.SalonRepository) SalonClaimService {
	return &salonClaimService{claimRepo: claimRepo, salonRepo: salonRepo}
}

func (s *salonClaimService) Submit(ctx context.Context, in SubmitClaimInput) (*model.SalonClaim, error) {
	existing, err := s.salonRepo.FindByExternalID(ctx, in.Source, in.ExternalID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrClaimAlreadyClaimed
	}

	active, err := s.claimRepo.FindActiveByUserAndPlace(ctx, in.UserID, in.Source, in.ExternalID)
	if err != nil {
		return nil, err
	}
	if active != nil {
		return nil, ErrClaimAlreadySubmitted
	}

	relType := in.RelationType
	if relType == "" {
		relType = "owner"
	}

	c := &model.SalonClaim{
		UserID:          in.UserID,
		RelationType:    relType,
		Comment:         in.Comment,
		Source:          in.Source,
		ExternalID:      in.ExternalID,
		SnapshotName:    in.SnapshotName,
		SnapshotAddress: in.SnapshotAddress,
		SnapshotPhone:   in.SnapshotPhone,
		SnapshotPhoto:   in.SnapshotPhoto,
		Status:          "pending",
	}
	if err := s.claimRepo.Create(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *salonClaimService) GetStatus(ctx context.Context, userID uuid.UUID, source, externalID string) (*model.SalonClaim, error) {
	return s.claimRepo.FindActiveByUserAndPlace(ctx, userID, source, externalID)
}

func (s *salonClaimService) ListForAdmin(ctx context.Context, status string, page, pageSize int) ([]repository.SalonClaimRow, int64, error) {
	return s.claimRepo.ListByStatus(ctx, status, page, pageSize)
}

func (s *salonClaimService) Approve(ctx context.Context, claimID, reviewerID uuid.UUID) (uuid.UUID, error) {
	claim, err := s.claimRepo.GetByID(ctx, claimID)
	if err != nil {
		return uuid.Nil, err
	}
	if claim == nil {
		return uuid.Nil, ErrClaimNotFound
	}
	if claim.Status != "pending" {
		return uuid.Nil, ErrClaimNotPending
	}
	return s.claimRepo.ApproveClaim(ctx, claimID, reviewerID)
}

func (s *salonClaimService) Reject(ctx context.Context, claimID, reviewerID uuid.UUID, reason string) error {
	claim, err := s.claimRepo.GetByID(ctx, claimID)
	if err != nil {
		return err
	}
	if claim == nil {
		return ErrClaimNotFound
	}
	if claim.Status != "pending" {
		return ErrClaimNotPending
	}
	return s.claimRepo.RejectClaim(ctx, claimID, reviewerID, reason)
}
