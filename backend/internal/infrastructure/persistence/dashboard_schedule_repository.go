package persistence

import (
	"context"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
	"gorm.io/gorm"
)

func (r *dashboardRepository) ListWorkingHours(ctx context.Context, salonID uuid.UUID) ([]model.WorkingHour, error) {
	var rows []model.WorkingHour
	err := r.db.WithContext(ctx).Where("salon_id = ?", salonID).Order("day_of_week ASC").Find(&rows).Error
	return rows, err
}

func (r *dashboardRepository) ReplaceWorkingHours(ctx context.Context, salonID uuid.UUID, rows []model.WorkingHour) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("salon_id = ?", salonID).Delete(&model.WorkingHour{}).Error; err != nil {
			return err
		}
		for i := range rows {
			rows[i].SalonID = salonID
			if rows[i].ID == uuid.Nil {
				rows[i].ID = uuid.New()
			}
			if err := tx.Create(&rows[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *dashboardRepository) ListStaffWorkingHours(ctx context.Context, staffID, salonID uuid.UUID) ([]model.SalonMasterHour, error) {
	var st model.SalonMaster
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", staffID, salonID).First(&st).Error; err != nil {
		return nil, err
	}
	var rows []model.SalonMasterHour
	err := r.db.WithContext(ctx).Where("staff_id = ?", staffID).Order("day_of_week ASC").Find(&rows).Error
	return rows, err
}

func (r *dashboardRepository) ReplaceStaffWorkingHours(ctx context.Context, staffID, salonID uuid.UUID, rows []model.SalonMasterHour) error {
	var st model.SalonMaster
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", staffID, salonID).First(&st).Error; err != nil {
		return err
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("staff_id = ?", staffID).Delete(&model.SalonMasterHour{}).Error; err != nil {
			return err
		}
		for i := range rows {
			rows[i].SalonMasterID = staffID
			if rows[i].ID == uuid.Nil {
				rows[i].ID = uuid.New()
			}
			if err := tx.Create(&rows[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *dashboardRepository) ListSalonDateOverrides(ctx context.Context, salonID uuid.UUID) ([]model.SalonDateOverride, error) {
	var rows []model.SalonDateOverride
	err := r.db.WithContext(ctx).Where("salon_id = ?", salonID).Order("on_date ASC").Find(&rows).Error
	return rows, err
}

func (r *dashboardRepository) ReplaceSalonDateOverrides(ctx context.Context, salonID uuid.UUID, rows []model.SalonDateOverride) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("salon_id = ?", salonID).Delete(&model.SalonDateOverride{}).Error; err != nil {
			return err
		}
		for i := range rows {
			rows[i].SalonID = salonID
			if rows[i].ID == uuid.Nil {
				rows[i].ID = uuid.New()
			}
			if err := tx.Create(&rows[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *dashboardRepository) ListStaffAbsences(ctx context.Context, salonID, staffID uuid.UUID) ([]model.SalonMasterAbsence, error) {
	var st model.SalonMaster
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", staffID, salonID).First(&st).Error; err != nil {
		return nil, err
	}
	var rows []model.SalonMasterAbsence
	err := r.db.WithContext(ctx).Where("staff_id = ?", staffID).Order("starts_on ASC").Find(&rows).Error
	return rows, err
}

func (r *dashboardRepository) ReplaceStaffAbsences(ctx context.Context, salonID, staffID uuid.UUID, rows []model.SalonMasterAbsence) error {
	var st model.SalonMaster
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", staffID, salonID).First(&st).Error; err != nil {
		return err
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("staff_id = ?", staffID).Delete(&model.SalonMasterAbsence{}).Error; err != nil {
			return err
		}
		for i := range rows {
			rows[i].SalonMasterID = staffID
			if rows[i].ID == uuid.Nil {
				rows[i].ID = uuid.New()
			}
			if err := tx.Create(&rows[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *dashboardRepository) UpdateSalonSlotDuration(ctx context.Context, salonID uuid.UUID, minutes int) error {
	res := r.db.WithContext(ctx).Model(&model.Salon{}).Where("id = ?", salonID).Update("slot_duration_minutes", minutes)
	return res.Error
}
