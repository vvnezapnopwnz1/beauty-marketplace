package persistence

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

type appointmentRepository struct {
	db *gorm.DB
}

// NewAppointmentRepository constructs AppointmentRepository.
func NewAppointmentRepository(db *gorm.DB) repository.AppointmentRepository {
	return &appointmentRepository{db: db}
}

func (r *appointmentRepository) Create(ctx context.Context, a *model.Appointment) error {
	return r.db.WithContext(ctx).Create(a).Error
}

func (r *appointmentRepository) CreateWithLineItems(ctx context.Context, a *model.Appointment, lines []model.AppointmentLineItem) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(a).Error; err != nil {
			return err
		}
		if len(lines) == 0 {
			return nil
		}
		for i := range lines {
			lines[i].AppointmentID = a.ID
			if lines[i].ID == uuid.Nil {
				lines[i].ID = uuid.New()
			}
		}
		return tx.Create(&lines).Error
	})
}

func (r *appointmentRepository) FindServiceForSalon(ctx context.Context, salonID, serviceID uuid.UUID) (*model.SalonService, error) {
	var s model.SalonService
	err := r.db.WithContext(ctx).
		Where("id = ? AND salon_id = ? AND is_active = true", serviceID, salonID).
		First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *appointmentRepository) FindByMasterInRange(ctx context.Context, salonMasterID uuid.UUID, from, to time.Time) ([]model.Appointment, error) {
	var rows []model.Appointment
	excluded := []string{"cancelled_by_client", "cancelled_by_salon", "no_show"}
	err := r.db.WithContext(ctx).
		Where("salon_master_id = ?", salonMasterID).
		Where("starts_at < ? AND ends_at > ?", to, from).
		Where("status NOT IN ?", excluded).
		Order("starts_at ASC").
		Find(&rows).Error
	return rows, err
}
