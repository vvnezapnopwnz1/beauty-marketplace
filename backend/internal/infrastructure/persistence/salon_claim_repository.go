package persistence

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
	"github.com/beauty-marketplace/backend/internal/repository"
	"gorm.io/gorm"
)

type salonClaimRepository struct {
	db *gorm.DB
}

// NewSalonClaimRepository constructs SalonClaimRepository.
func NewSalonClaimRepository(db *gorm.DB) repository.SalonClaimRepository {
	return &salonClaimRepository{db: db}
}

func (r *salonClaimRepository) FindActiveByUserAndPlace(ctx context.Context, userID uuid.UUID, source, externalID string) (*model.SalonClaim, error) {
	var c model.SalonClaim
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND source = ? AND external_id = ? AND status IN ('pending','approved')", userID, source, externalID).
		First(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &c, err
}

func (r *salonClaimRepository) Create(ctx context.Context, c *model.SalonClaim) error {
	return r.db.WithContext(ctx).Create(c).Error
}

func (r *salonClaimRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.SalonClaim, error) {
	var c model.SalonClaim
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &c, err
}

func (r *salonClaimRepository) ListByStatus(ctx context.Context, status string, page, pageSize int) ([]repository.SalonClaimRow, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	type scanRow struct {
		model.SalonClaim
		UserPhone       string  `gorm:"column:user_phone"`
		UserDisplayName *string `gorm:"column:user_display_name"`
	}

	q := r.db.WithContext(ctx).Table("salon_claims sc").
		Select("sc.*, u.phone_e164 AS user_phone, u.display_name AS user_display_name").
		Joins("JOIN users u ON u.id = sc.user_id")
	if status != "" {
		q = q.Where("sc.status = ?", status)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []scanRow
	if err := q.Order("sc.created_at DESC").Offset(offset).Limit(pageSize).Scan(&rows).Error; err != nil {
		return nil, 0, err
	}

	result := make([]repository.SalonClaimRow, len(rows))
	for i, row := range rows {
		result[i] = repository.SalonClaimRow{
			Claim:           row.SalonClaim,
			UserPhone:       row.UserPhone,
			UserDisplayName: row.UserDisplayName,
		}
	}
	return result, total, nil
}

func (r *salonClaimRepository) ApproveClaim(ctx context.Context, claimID, reviewerID uuid.UUID) (uuid.UUID, error) {
	var salonID uuid.UUID

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var claim model.SalonClaim
		if err := tx.Where("id = ?", claimID).First(&claim).Error; err != nil {
			return err
		}
		if claim.Status != "pending" {
			return errors.New("claim is not pending")
		}

		// 1. Create salon
		salon := model.Salon{
			NameOverride: &claim.SnapshotName,
			Address:      claim.SnapshotAddress,
			PhonePublic:  claim.SnapshotPhone,
			PhotoURL:     claim.SnapshotPhoto,
			Timezone:     "Europe/Moscow",
		}
		if err := tx.Create(&salon).Error; err != nil {
			return err
		}
		salonID = salon.ID

		// 2. Link external ID
		extID := model.SalonExternalID{
			SalonID:    salon.ID,
			Source:     claim.Source,
			ExternalID: claim.ExternalID,
			Meta:       map[string]any{},
		}
		if err := tx.Create(&extID).Error; err != nil {
			return err
		}

		// 3. Add owner membership
		member := model.SalonMember{
			SalonID: salon.ID,
			UserID:  claim.UserID,
			Role:    "owner",
		}
		if err := tx.Create(&member).Error; err != nil {
			return err
		}

		// 4. Create subscription (free trial)
		sub := model.SalonSubscription{
			SalonID: salon.ID,
			Plan:    "free",
			Status:  "trial",
		}
		if err := tx.Create(&sub).Error; err != nil {
			return err
		}

		// 5. Mark this claim approved
		now := time.Now()
		if err := tx.Model(&model.SalonClaim{}).Where("id = ?", claimID).Updates(map[string]any{
			"status":      "approved",
			"salon_id":    salon.ID,
			"reviewed_by": reviewerID,
			"reviewed_at": now,
			"updated_at":  now,
		}).Error; err != nil {
			return err
		}

		// 6. Mark competing pending claims as duplicate
		dupReason := "Другая заявка на этот салон была одобрена"
		return tx.Model(&model.SalonClaim{}).
			Where("id <> ? AND source = ? AND external_id = ? AND status = 'pending'",
				claimID, claim.Source, claim.ExternalID).
			Updates(map[string]any{
				"status":           "duplicate",
				"rejection_reason": dupReason,
				"updated_at":       now,
			}).Error
	})

	return salonID, err
}

func (r *salonClaimRepository) RejectClaim(ctx context.Context, claimID, reviewerID uuid.UUID, reason string) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&model.SalonClaim{}).
		Where("id = ? AND status = 'pending'", claimID).
		Updates(map[string]any{
			"status":           "rejected",
			"rejection_reason": reason,
			"reviewed_by":      reviewerID,
			"reviewed_at":      now,
			"updated_at":       now,
		}).Error
}
