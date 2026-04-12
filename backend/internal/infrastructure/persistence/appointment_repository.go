package persistence

import (
	"context"

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
