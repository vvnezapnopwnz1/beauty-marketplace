package persistence

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

type StaffPhoneVerificationRepository struct {
	db *gorm.DB
}

func NewStaffPhoneVerificationRepository(db *gorm.DB) repository.StaffPhoneVerificationRepository {
	return &StaffPhoneVerificationRepository{db: db}
}

func (r *StaffPhoneVerificationRepository) Create(ctx context.Context, v *model.StaffPhoneVerification) error {
	return r.db.WithContext(ctx).Create(v).Error
}

func (r *StaffPhoneVerificationRepository) FindActive(ctx context.Context, phoneE164 string, salonID uuid.UUID) (*model.StaffPhoneVerification, error) {
	var v model.StaffPhoneVerification
	err := r.db.WithContext(ctx).
		Where("phone_e164 = ? AND salon_id = ? AND verified_at IS NULL AND consumed_at IS NULL AND expires_at > ? AND attempts < 5",
			phoneE164, salonID, time.Now()).
		Order("created_at DESC").
		First(&v).Error
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *StaffPhoneVerificationRepository) IncrementAttempts(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&model.StaffPhoneVerification{}).
		Where("id = ?", id).
		UpdateColumn("attempts", gorm.Expr("attempts + 1")).Error
}

func (r *StaffPhoneVerificationRepository) MarkVerified(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&model.StaffPhoneVerification{}).
		Where("id = ?", id).
		Update("verified_at", time.Now()).Error
}

func (r *StaffPhoneVerificationRepository) FindValidProof(ctx context.Context, proofID uuid.UUID, phoneE164 string, salonID uuid.UUID) (*model.StaffPhoneVerification, error) {
	var v model.StaffPhoneVerification
	err := r.db.WithContext(ctx).
		Where("id = ? AND phone_e164 = ? AND salon_id = ? AND verified_at IS NOT NULL AND consumed_at IS NULL AND expires_at > ?",
			proofID, phoneE164, salonID, time.Now()).
		First(&v).Error
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *StaffPhoneVerificationRepository) Consume(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&model.StaffPhoneVerification{}).
		Where("id = ?", id).
		Update("consumed_at", time.Now()).Error
}
