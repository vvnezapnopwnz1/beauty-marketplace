package persistence

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
)

func (r *dashboardRepository) StaffAvgRating(ctx context.Context, salonID, staffID uuid.UUID) (*float64, int64, error) {
	var avg sql.NullFloat64
	var n int64
	err := r.db.WithContext(ctx).Raw(`
		SELECT AVG(reviews.rating::float8), COUNT(*)
		FROM reviews
		INNER JOIN appointments ON appointments.id = reviews.appointment_id
		WHERE appointments.salon_id = ? AND appointments.salon_master_id = ?
	`, salonID, staffID).Row().Scan(&avg, &n)
	if err != nil {
		return nil, 0, err
	}
	if !avg.Valid {
		return nil, n, nil
	}
	v := avg.Float64
	return &v, n, nil
}

func (r *dashboardRepository) CountStaffAppointments(ctx context.Context, salonID, staffID uuid.UUID, from, to *time.Time, statuses []string) (int64, error) {
	q := r.db.WithContext(ctx).Model(&model.Appointment{}).
		Where("salon_id = ? AND salon_master_id = ?", salonID, staffID)
	if from != nil {
		q = q.Where("starts_at >= ?", *from)
	}
	if to != nil {
		q = q.Where("starts_at < ?", *to)
	}
	if len(statuses) > 0 {
		q = q.Where("status IN ?", statuses)
	}
	var c int64
	err := q.Count(&c).Error
	return c, err
}

func (r *dashboardRepository) SumStaffRevenueCents(ctx context.Context, salonID, staffID uuid.UUID, from, to time.Time) (int64, error) {
	var sum int64
	err := r.db.WithContext(ctx).Table("appointments").
		Select("COALESCE(SUM(services.price_cents), 0)").
		Joins("JOIN services ON services.id = appointments.service_id AND services.salon_id = appointments.salon_id").
		Where("appointments.salon_id = ? AND appointments.salon_master_id = ?", salonID, staffID).
		Where("appointments.starts_at >= ? AND appointments.starts_at < ?", from, to).
		Where("appointments.status = ?", "completed").
		Scan(&sum).Error
	return sum, err
}

func (r *dashboardRepository) CountAppointments(ctx context.Context, salonID uuid.UUID, from, to *time.Time, status string) (int64, error) {
	q := r.db.WithContext(ctx).Model(&model.Appointment{}).Where("salon_id = ?", salonID)
	if from != nil {
		q = q.Where("starts_at >= ?", *from)
	}
	if to != nil {
		q = q.Where("starts_at < ?", *to)
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	var c int64
	err := q.Count(&c).Error
	return c, err
}
