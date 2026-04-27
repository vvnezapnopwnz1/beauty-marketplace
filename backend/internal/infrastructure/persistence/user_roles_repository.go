package persistence

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

type UserRolesRepository struct {
	db *gorm.DB
}

func NewUserRolesRepository(db *gorm.DB) *UserRolesRepository {
	return &UserRolesRepository{db: db}
}

func (r *UserRolesRepository) GetGlobalRoleByUserID(ctx context.Context, userID uuid.UUID) (string, error) {
	var out struct {
		GlobalRole string `gorm:"column:global_role"`
	}
	if err := r.db.WithContext(ctx).
		Table("users").
		Select("global_role").
		Where("id = ?", userID).
		Scan(&out).Error; err != nil {
		return "", err
	}
	return out.GlobalRole, nil
}

func (r *UserRolesRepository) ListSalonMembershipsByUserID(ctx context.Context, userID uuid.UUID) ([]repository.UserRoleMembership, error) {
	var scans []struct {
		SalonID   uuid.UUID `gorm:"column:salon_id"`
		SalonName string    `gorm:"column:salon_name"`
		Role      string    `gorm:"column:role"`
	}
	if err := r.db.WithContext(ctx).
		Table("salon_members sm").
		Select("sm.salon_id, COALESCE(s.name_override, '') AS salon_name, sm.role").
		Joins("JOIN salons s ON s.id = sm.salon_id").
		Where("sm.user_id = ?", userID).
		Scan(&scans).Error; err != nil {
		return nil, err
	}
	out := make([]repository.UserRoleMembership, len(scans))
	for i, s := range scans {
		out[i] = repository.UserRoleMembership{
			SalonID: s.SalonID, SalonName: s.SalonName, Role: s.Role,
		}
	}
	return out, nil
}

func (r *UserRolesRepository) HasMasterProfileByUserID(ctx context.Context, userID uuid.UUID) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&model.MasterProfile{}).
		Where("user_id = ?", userID).
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *UserRolesRepository) CountPendingInvitesByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Table("salon_member_invites").
		Where("user_id = ? AND status = 'pending'", userID).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return int(count), nil
}
