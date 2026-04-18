package persistence

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

type bookingSlotsRepository struct {
	db *gorm.DB
}

// NewBookingSlotsRepository constructs BookingSlotsRepository.
func NewBookingSlotsRepository(db *gorm.DB) repository.BookingSlotsRepository {
	return &bookingSlotsRepository{db: db}
}

func (r *bookingSlotsRepository) GetSalonMeta(ctx context.Context, salonID uuid.UUID) (*repository.SalonSlotMeta, error) {
	var s model.Salon
	err := r.db.WithContext(ctx).Select("timezone", "slot_duration_minutes").
		Where("id = ?", salonID).First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &repository.SalonSlotMeta{Timezone: s.Timezone, SlotDurationMinutes: s.SlotDurationMinutes}, nil
}

func (r *bookingSlotsRepository) ListActiveSalonMasters(ctx context.Context, salonID uuid.UUID) ([]repository.SalonMasterBasic, error) {
	var rows []model.SalonMaster
	err := r.db.WithContext(ctx).
		Where("salon_id = ? AND is_active = true AND status = ?", salonID, "active").
		Order("display_name ASC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]repository.SalonMasterBasic, 0, len(rows))
	for _, m := range rows {
		out = append(out, repository.SalonMasterBasic{
			ID:          m.ID,
			SalonID:     m.SalonID,
			MasterID:    m.MasterID,
			DisplayName: m.DisplayName,
		})
	}
	return out, nil
}

func (r *bookingSlotsRepository) GetSalonMaster(ctx context.Context, salonID, salonMasterID uuid.UUID) (*repository.SalonMasterBasic, error) {
	var m model.SalonMaster
	err := r.db.WithContext(ctx).
		Where("id = ? AND salon_id = ? AND is_active = true AND status = ?", salonMasterID, salonID, "active").
		First(&m).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &repository.SalonMasterBasic{
		ID:          m.ID,
		SalonID:     m.SalonID,
		MasterID:    m.MasterID,
		DisplayName: m.DisplayName,
	}, nil
}

func (r *bookingSlotsRepository) GetSalonMasterByProfileID(ctx context.Context, salonID, masterProfileID uuid.UUID) (*repository.SalonMasterBasic, error) {
	var m model.SalonMaster
	err := r.db.WithContext(ctx).
		Where("salon_id = ? AND master_id = ? AND is_active = true AND status = ?", salonID, masterProfileID, "active").
		First(&m).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &repository.SalonMasterBasic{
		ID:          m.ID,
		SalonID:     m.SalonID,
		MasterID:    m.MasterID,
		DisplayName: m.DisplayName,
	}, nil
}

func (r *bookingSlotsRepository) GetMasterWorkingHour(ctx context.Context, salonMasterID uuid.UUID, dayOfWeek int) (*model.SalonMasterHour, error) {
	var h model.SalonMasterHour
	err := r.db.WithContext(ctx).
		Where("staff_id = ? AND day_of_week = ?", salonMasterID, dayOfWeek).
		First(&h).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &h, nil
}

func (r *bookingSlotsRepository) GetServiceDurationOverride(ctx context.Context, salonMasterID, serviceID uuid.UUID) (*int, error) {
	dur, _, err := r.GetMasterServiceOverrides(ctx, salonMasterID, serviceID)
	return dur, err
}

func (r *bookingSlotsRepository) GetMasterServiceOverrides(ctx context.Context, salonMasterID, serviceID uuid.UUID) (durationOverride *int, priceOverride *int, err error) {
	var row model.SalonMasterService
	e := r.db.WithContext(ctx).
		Where("staff_id = ? AND service_id = ?", salonMasterID, serviceID).
		First(&row).Error
	if e != nil {
		if errors.Is(e, gorm.ErrRecordNotFound) {
			return nil, nil, nil
		}
		return nil, nil, e
	}
	return row.DurationOverrideMinutes, row.PriceOverrideCents, nil
}

func (r *bookingSlotsRepository) ListSalonMastersCoveringServices(ctx context.Context, salonID uuid.UUID, serviceIDs []uuid.UUID) ([]uuid.UUID, error) {
	if len(serviceIDs) == 0 {
		return nil, nil
	}
	var staffIDs []uuid.UUID
	err := r.db.WithContext(ctx).Raw(`
		SELECT sms.staff_id
		FROM salon_master_services sms
		INNER JOIN services s ON s.id = sms.service_id AND s.salon_id = ? AND s.is_active = true
		WHERE sms.service_id = ANY(?::uuid[])
		GROUP BY sms.staff_id
		HAVING COUNT(DISTINCT sms.service_id) = ?
	`, salonID, pq.Array(serviceIDs), len(serviceIDs)).Scan(&staffIDs).Error
	return staffIDs, err
}
