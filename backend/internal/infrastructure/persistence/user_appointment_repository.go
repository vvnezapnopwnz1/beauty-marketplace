package persistence

import (
	"context"
	"strings"

	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

type userAppointmentRepository struct {
	db *gorm.DB
}

// NewUserAppointmentRepository constructs UserAppointmentRepository.
func NewUserAppointmentRepository(db *gorm.DB) repository.UserAppointmentRepository {
	return &userAppointmentRepository{db: db}
}

func (r *userAppointmentRepository) ListUserAppointments(
	ctx context.Context,
	f repository.UserAppointmentFilter,
) ([]repository.UserAppointmentRow, int64, error) {
	if f.PageSize <= 0 {
		f.PageSize = 20
	}
	if f.PageSize > 100 {
		f.PageSize = 100
	}
	if f.Page <= 0 {
		f.Page = 1
	}
	offset := (f.Page - 1) * f.PageSize

	var total int64
	if err := r.db.WithContext(ctx).
		Model(&model.Appointment{}).
		Where("client_user_id = ?", f.UserID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if total == 0 {
		return nil, 0, nil
	}

	var raw []struct {
		model.Appointment
		SalonName   string  `gorm:"column:salon_name"`
		ServiceName string  `gorm:"column:service_name"`
		StaffName   *string `gorm:"column:staff_name"`
		TotalPrice  *int64  `gorm:"column:total_price"`
	}

	err := r.db.WithContext(ctx).
		Table("appointments").
		Select(`
			appointments.*,
			COALESCE(salons.name_override, '') AS salon_name,
			COALESCE(
				(SELECT string_agg(ali.service_name, ', ' ORDER BY ali.sort_order)
				 FROM appointment_line_items ali
				 WHERE ali.appointment_id = appointments.id),
				services.name,
				''
			) AS service_name,
			salon_masters.display_name AS staff_name,
			(SELECT SUM(ali.price_cents)
			 FROM appointment_line_items ali
			 WHERE ali.appointment_id = appointments.id) AS total_price
		`).
		Joins("JOIN salons ON salons.id = appointments.salon_id").
		Joins("JOIN services ON services.id = appointments.service_id").
		Joins("LEFT JOIN salon_masters ON salon_masters.id = appointments.salon_master_id").
		Where("appointments.client_user_id = ?", f.UserID).
		Order("appointments.starts_at DESC").
		Limit(f.PageSize).
		Offset(offset).
		Scan(&raw).Error
	if err != nil {
		return nil, 0, err
	}

	rows := make([]repository.UserAppointmentRow, 0, len(raw))
	for _, r := range raw {
		salonName := strings.TrimSpace(r.SalonName)
		if salonName == "" {
			salonName = "Салон"
		}
		serviceName := strings.TrimSpace(r.ServiceName)
		if serviceName == "" {
			serviceName = "Услуга"
		}

		rows = append(rows, repository.UserAppointmentRow{
			ID:          r.Appointment.ID,
			SalonID:     r.Appointment.SalonID,
			SalonName:   salonName,
			ServiceName: serviceName,
			MasterName:  r.StaffName,
			StartsAt:    r.Appointment.StartsAt,
			EndsAt:      r.Appointment.EndsAt,
			Status:      r.Appointment.Status,
			PriceCents:  r.TotalPrice,
			ClientNote:  r.Appointment.ClientNote,
		})
	}

	return rows, total, nil
}

