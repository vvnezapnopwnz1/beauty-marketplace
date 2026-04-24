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
	var rows []struct {
		SalonID uuid.UUID `gorm:"column:salon_id"`
		Role    string    `gorm:"column:role"`
	}
	if err := r.db.WithContext(ctx).
		Table("salon_members").
		Select("salon_id, role").
		Where("user_id = ?", userID).
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]repository.UserRoleMembership, len(rows))
	for i := range rows {
		out[i] = repository.UserRoleMembership{
			SalonID: rows[i].SalonID,
			Role:    rows[i].Role,
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
