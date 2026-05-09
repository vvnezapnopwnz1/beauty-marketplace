package persistence

import (
	"context"

	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
	"github.com/beauty-marketplace/backend/internal/repository"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type masterScheduleRepository struct{ db *gorm.DB }

// NewMasterScheduleRepository constructs MasterScheduleRepository.
func NewMasterScheduleRepository(db *gorm.DB) repository.MasterScheduleRepository {
	return &masterScheduleRepository{db: db}
}

func (r *masterScheduleRepository) ListMasterWorkingHours(ctx context.Context, masterProfileID uuid.UUID) ([]model.MasterWorkingHour, error) {
	var rows []model.MasterWorkingHour
	err := r.db.WithContext(ctx).
		Where("master_profile_id = ?", masterProfileID).
		Order("day_of_week").
		Find(&rows).Error
	return rows, err
}

func (r *masterScheduleRepository) ReplaceMasterWorkingHours(ctx context.Context, masterProfileID uuid.UUID, rows []model.MasterWorkingHour) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("master_profile_id = ?", masterProfileID).Delete(&model.MasterWorkingHour{}).Error; err != nil {
			return err
		}
		for i := range rows {
			rows[i].MasterProfileID = masterProfileID
		}
		if len(rows) == 0 {
			return nil
		}
		return tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&rows).Error
	})
}
