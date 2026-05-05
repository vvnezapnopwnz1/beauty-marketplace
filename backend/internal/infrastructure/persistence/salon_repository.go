package persistence

import (
	"context"
	"strings"

	"github.com/google/uuid"
	dbmodel "github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
	appmodel "github.com/beauty-marketplace/backend/internal/model"
	"github.com/beauty-marketplace/backend/internal/repository"
	"gorm.io/gorm"
)

type salonRepository struct {
	db *gorm.DB
}

// NewSalonRepository returns a GORM-backed SalonRepository.
func NewSalonRepository(db *gorm.DB) repository.SalonRepository {
	return &salonRepository{db: db}
}

func (r *salonRepository) FindAll(ctx context.Context) ([]appmodel.Salon, error) {
	var rows []dbmodel.Salon
	err := r.db.WithContext(ctx).Preload("ExternalIDs").Find(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]appmodel.Salon, len(rows))
	for i := range rows {
		out[i] = dbSalonToDomain(rows[i])
	}
	return out, nil
}

func (r *salonRepository) FindByID(ctx context.Context, id uuid.UUID) (*appmodel.Salon, error) {
	var row dbmodel.Salon
	err := r.db.WithContext(ctx).Preload("ExternalIDs").Where("id = ?", id).First(&row).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	s := dbSalonToDomain(row)
	return &s, nil
}

func trimTimeHHMM(v string) string {
	if len(v) >= 5 {
		return v[:5]
	}
	return v
}

func (r *salonRepository) GetWorkingHours(ctx context.Context, salonID uuid.UUID) ([]appmodel.WorkingHourDTO, error) {
	var rows []dbmodel.WorkingHour
	err := r.db.WithContext(ctx).Where("salon_id = ?", salonID).Order("day_of_week ASC").Find(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]appmodel.WorkingHourDTO, 0, len(rows))
	for _, row := range rows {
		var breakStartsAt *string
		if row.BreakStartsAt != nil {
			v := trimTimeHHMM(strings.TrimSpace(*row.BreakStartsAt))
			breakStartsAt = &v
		}
		var breakEndsAt *string
		if row.BreakEndsAt != nil {
			v := trimTimeHHMM(strings.TrimSpace(*row.BreakEndsAt))
			breakEndsAt = &v
		}
		out = append(out, appmodel.WorkingHourDTO{
			DayOfWeek:     int(row.DayOfWeek),
			OpensAt:       trimTimeHHMM(strings.TrimSpace(row.OpensAt)),
			ClosesAt:      trimTimeHHMM(strings.TrimSpace(row.ClosesAt)),
			IsClosed:      row.IsClosed,
			BreakStartsAt: breakStartsAt,
			BreakEndsAt:   breakEndsAt,
		})
	}
	return out, nil
}

func (r *salonRepository) FindServicesBySalonID(ctx context.Context, salonID uuid.UUID) ([]appmodel.ServiceLine, error) {
	var rows []dbmodel.SalonService
	err := r.db.WithContext(ctx).Where("salon_id = ?", salonID).Order("sort_order asc").Find(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]appmodel.ServiceLine, len(rows))
	for i := range rows {
		out[i] = dbServiceToDomain(rows[i])
	}
	return out, nil
}

func (r *salonRepository) FindByExternalIDs(ctx context.Context, source string, ids []string) ([]appmodel.Salon, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var rows []dbmodel.Salon
	err := r.db.WithContext(ctx).
		Joins("JOIN salon_external_ids sei ON sei.salon_id = salons.id AND sei.source = ? AND sei.external_id IN ?", source, ids).
		Preload("ExternalIDs").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]appmodel.Salon, len(rows))
	for i := range rows {
		out[i] = dbSalonToDomain(rows[i])
	}
	return out, nil
}

func (r *salonRepository) FindByExternalID(ctx context.Context, source, externalID string) (*appmodel.Salon, error) {
	var row dbmodel.Salon
	err := r.db.WithContext(ctx).
		Joins("JOIN salon_external_ids sei ON sei.salon_id = salons.id AND sei.source = ? AND sei.external_id = ?", source, externalID).
		Preload("ExternalIDs").
		Limit(1).
		First(&row).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	salon := dbSalonToDomain(row)
	return &salon, nil
}

func (r *salonRepository) FindServicesBySalonIDs(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID][]appmodel.ServiceLine, error) {
	if len(ids) == 0 {
		return map[uuid.UUID][]appmodel.ServiceLine{}, nil
	}
	var rows []dbmodel.SalonService
	err := r.db.WithContext(ctx).
		Where("salon_id IN ? AND is_active = ?", ids, true).
		Order("sort_order ASC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make(map[uuid.UUID][]appmodel.ServiceLine)
	for _, row := range rows {
		sid := row.SalonID
		out[sid] = append(out[sid], dbServiceToDomain(row))
	}
	return out, nil
}
