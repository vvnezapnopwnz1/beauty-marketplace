package persistence

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"gorm.io/gorm"
)

func (r *dashboardRepository) ListServices(ctx context.Context, salonID uuid.UUID) ([]model.SalonService, error) {
	var rows []model.SalonService
	err := r.db.WithContext(ctx).Where("salon_id = ? AND is_active = true", salonID).Order("sort_order ASC, name ASC").Find(&rows).Error
	return rows, err
}

func (r *dashboardRepository) ListSalonCategoryScopes(ctx context.Context, salonID uuid.UUID) ([]string, error) {
	var rows []model.SalonCategoryScope
	if err := r.db.WithContext(ctx).
		Where("salon_id = ?", salonID).
		Order("parent_slug ASC").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]string, 0, len(rows))
	for _, row := range rows {
		out = append(out, row.ParentSlug)
	}
	return out, nil
}

func (r *dashboardRepository) ReplaceSalonCategoryScopes(ctx context.Context, salonID uuid.UUID, parentSlugs []string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("salon_id = ?", salonID).Delete(&model.SalonCategoryScope{}).Error; err != nil {
			return err
		}
		for _, slug := range parentSlugs {
			row := model.SalonCategoryScope{
				SalonID:    salonID,
				ParentSlug: slug,
			}
			if err := tx.Create(&row).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *dashboardRepository) ListSystemServiceCategories(ctx context.Context) ([]model.ServiceCategory, error) {
	var rows []model.ServiceCategory
	err := r.db.WithContext(ctx).Where("salon_id IS NULL").Order("parent_slug ASC, sort_order ASC, slug ASC").Find(&rows).Error
	return rows, err
}

func (r *dashboardRepository) GetSystemServiceCategoryBySlug(ctx context.Context, slug string) (*model.ServiceCategory, error) {
	var row model.ServiceCategory
	err := r.db.WithContext(ctx).Where("salon_id IS NULL AND slug = ?", slug).First(&row).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &row, nil
}

func (r *dashboardRepository) CreateService(ctx context.Context, s *model.SalonService) error {
	return r.db.WithContext(ctx).Create(s).Error
}

func (r *dashboardRepository) UpdateService(ctx context.Context, s *model.SalonService) error {
	return r.db.WithContext(ctx).Model(&model.SalonService{}).
		Where("id = ? AND salon_id = ?", s.ID, s.SalonID).
		Updates(map[string]any{
			"name":             s.Name,
			"category":         s.Category,
			"category_slug":    s.CategorySlug,
			"description":      s.Description,
			"duration_minutes": s.DurationMinutes,
			"price_cents":      s.PriceCents,
			"is_active":        s.IsActive,
			"sort_order":       s.SortOrder,
		}).Error
}

func (r *dashboardRepository) SoftDeleteService(ctx context.Context, salonID, serviceID uuid.UUID) error {
	res := r.db.WithContext(ctx).Model(&model.SalonService{}).
		Where("id = ? AND salon_id = ?", serviceID, salonID).
		Update("is_active", false)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *dashboardRepository) GetService(ctx context.Context, salonID, serviceID uuid.UUID) (*model.SalonService, error) {
	var s model.SalonService
	err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", serviceID, salonID).First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}
