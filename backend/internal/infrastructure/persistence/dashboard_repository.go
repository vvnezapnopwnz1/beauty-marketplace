package persistence

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/repository"

	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"gorm.io/gorm"
)

type dashboardRepository struct {
	db *gorm.DB
}

func NewDashboardRepository(db *gorm.DB) repository.DashboardRepository {
	return &dashboardRepository{db: db}
}

func (r *dashboardRepository) FindMembershipForUserAndSalon(ctx context.Context, userID, salonID uuid.UUID) (*repository.SalonMembership, error) {
	var m model.SalonMember
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND salon_id = ?", userID, salonID).
		First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &repository.SalonMembership{SalonID: m.SalonID, Role: m.Role}, nil
}
