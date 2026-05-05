package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
)

type StaffPhoneVerificationRepository interface {
	Create(ctx context.Context, v *model.StaffPhoneVerification) error
	FindActive(ctx context.Context, phoneE164 string, salonID uuid.UUID) (*model.StaffPhoneVerification, error)
	IncrementAttempts(ctx context.Context, id uuid.UUID) error
	MarkVerified(ctx context.Context, id uuid.UUID) error
	FindValidProof(ctx context.Context, proofID uuid.UUID, phoneE164 string, salonID uuid.UUID) (*model.StaffPhoneVerification, error)
	Consume(ctx context.Context, id uuid.UUID) error
}
