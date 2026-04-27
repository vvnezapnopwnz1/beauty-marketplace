package persistence

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

type salonMemberInviteRepository struct {
	db *gorm.DB
}

func NewSalonMemberInviteRepository(db *gorm.DB) repository.SalonMemberInviteRepository {
	return &salonMemberInviteRepository{db: db}
}

func (r *salonMemberInviteRepository) ListBySalon(ctx context.Context, salonID uuid.UUID) ([]repository.SalonMemberInviteListRow, error) {
	var rows []model.SalonMemberInvite
	if err := r.db.WithContext(ctx).
		Where("salon_id = ? AND (status = ? OR status = ?)", salonID, "pending", "accepted").
		Order("created_at DESC").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]repository.SalonMemberInviteListRow, 0, len(rows))
	for _, m := range rows {
		out = append(out, inviteRowFromModel(m, ""))
	}
	return out, nil
}

func inviteRowFromModel(m model.SalonMemberInvite, salonName string) repository.SalonMemberInviteListRow {
	return repository.SalonMemberInviteListRow{
		ID:        m.ID,
		SalonID:   m.SalonID,
		SalonName: salonName,
		PhoneE164: m.PhoneE164,
		Role:      m.Role,
		Status:    m.Status,
		InvitedBy: m.InvitedBy,
		UserID:    m.UserID,
		CreatedAt: m.CreatedAt,
		ExpiresAt: m.ExpiresAt,
	}
}

func (r *salonMemberInviteRepository) CreatePending(ctx context.Context, salonID, invitedBy uuid.UUID, phoneE164, role string) (*repository.SalonMemberInviteListRow, error) {
	var memberCount int64
	if err := r.db.WithContext(ctx).Raw(`
		SELECT COUNT(*) FROM salon_members sm
		INNER JOIN users u ON u.id = sm.user_id
		WHERE sm.salon_id = ? AND u.phone_e164 = ?`, salonID, phoneE164).Scan(&memberCount).Error; err != nil {
		return nil, err
	}
	if memberCount > 0 {
		return nil, repository.ErrSalonMemberInviteAlreadyMember
	}
	var invCount int64
	if err := r.db.WithContext(ctx).Model(&model.SalonMemberInvite{}).
		Where("salon_id = ? AND phone_e164 = ? AND status = ?", salonID, phoneE164, "pending").
		Count(&invCount).Error; err != nil {
		return nil, err
	}
	if invCount > 0 {
		return nil, repository.ErrSalonMemberInviteDuplicate
	}
	inv := model.SalonMemberInvite{
		SalonID:   salonID,
		PhoneE164: phoneE164,
		Role:      role,
		Status:    "pending",
		InvitedBy: invitedBy,
		ExpiresAt: time.Now().UTC().Add(30 * 24 * time.Hour),
	}
	if err := r.db.WithContext(ctx).Create(&inv).Error; err != nil {
		return nil, err
	}
	row := inviteRowFromModel(inv, "")
	return &row, nil
}

func (r *salonMemberInviteRepository) DeletePending(ctx context.Context, salonID, inviteID uuid.UUID) (bool, error) {
	res := r.db.WithContext(ctx).
		Where("id = ? AND salon_id = ? AND status = ?", inviteID, salonID, "pending").
		Delete(&model.SalonMemberInvite{})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

func (r *salonMemberInviteRepository) ListPendingForUser(ctx context.Context, userID uuid.UUID) ([]repository.SalonMemberInviteListRow, error) {
	now := time.Now().UTC()
	var out []repository.SalonMemberInviteListRow
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			i.id, i.salon_id,
			COALESCE(NULLIF(TRIM(s.name_override), ''), 'Салон') AS salon_name,
			i.phone_e164, i.role::text AS role, i.status::text AS status,
			i.invited_by, i.user_id, i.created_at, i.expires_at
		FROM salon_member_invites i
		INNER JOIN salons s ON s.id = i.salon_id
		WHERE i.user_id = ? AND i.status = 'pending' AND i.expires_at > ?
		ORDER BY i.created_at ASC`, userID, now).Scan(&out).Error
	return out, err
}

func (r *salonMemberInviteRepository) AcceptPending(ctx context.Context, userID, inviteID uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var inv model.SalonMemberInvite
		if err := tx.Where("id = ? AND status = ?", inviteID, "pending").First(&inv).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return repository.ErrSalonMemberInviteNotFound
			}
			return err
		}
		if inv.UserID == nil || *inv.UserID != userID {
			return repository.ErrSalonMemberInviteForbidden
		}
		if time.Now().UTC().After(inv.ExpiresAt) {
			return repository.ErrSalonMemberInviteExpired
		}
		var existing model.SalonMember
		err := tx.Where("salon_id = ? AND user_id = ?", inv.SalonID, userID).First(&existing).Error
		if err == nil {
			return repository.ErrSalonMemberInviteAlreadyMember
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		mem := model.SalonMember{SalonID: inv.SalonID, UserID: userID, Role: inv.Role}
		if err := tx.Create(&mem).Error; err != nil {
			return err
		}
		return tx.Model(&model.SalonMemberInvite{}).Where("id = ?", inviteID).Update("status", "accepted").Error
	})
}

func (r *salonMemberInviteRepository) DeclinePending(ctx context.Context, userID, inviteID uuid.UUID) (bool, error) {
	res := r.db.WithContext(ctx).Model(&model.SalonMemberInvite{}).
		Where("id = ? AND user_id = ? AND status = ?", inviteID, userID, "pending").
		Update("status", "declined")
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

func (r *salonMemberInviteRepository) LinkPendingByPhone(ctx context.Context, userID uuid.UUID, phoneE164 string) error {
	return r.db.WithContext(ctx).Model(&model.SalonMemberInvite{}).
		Where("phone_e164 = ? AND status = ? AND user_id IS NULL", phoneE164, "pending").
		Update("user_id", userID).Error
}
