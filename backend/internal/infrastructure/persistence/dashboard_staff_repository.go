package persistence

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
	"github.com/beauty-marketplace/backend/internal/repository"
	"gorm.io/gorm"
)

func (r *dashboardRepository) ListStaff(ctx context.Context, salonID uuid.UUID) ([]model.SalonMaster, error) {
	var rows []model.SalonMaster
	err := r.db.WithContext(ctx).Where("salon_id = ?", salonID).Order("display_name ASC").Find(&rows).Error
	return rows, err
}

func (r *dashboardRepository) CreateStaff(ctx context.Context, s *model.SalonMaster) error {
	return r.db.WithContext(ctx).Create(s).Error
}

func (r *dashboardRepository) UpdateStaff(ctx context.Context, s *model.SalonMaster) error {
	return r.db.WithContext(ctx).Model(&model.SalonMaster{}).
		Where("id = ? AND salon_id = ?", s.ID, s.SalonID).
		Updates(map[string]any{
			"display_name":           s.DisplayName,
			"master_id":              s.MasterID,
			"role":                   s.Role,
			"level":                  s.Level,
			"bio":                    s.Bio,
			"phone":                  s.Phone,
			"telegram_username":      s.TelegramUsername,
			"email":                  s.Email,
			"color":                  s.Color,
			"joined_at":              s.JoinedAt,
			"left_at":                s.LeftAt,
			"dashboard_access":       s.DashboardAccess,
			"telegram_notifications": s.TelegramNotifications,
			"is_active":              s.IsActive,
			"status":                 s.Status,
		}).Error
}

func (r *dashboardRepository) SoftDeleteStaff(ctx context.Context, salonID, staffID uuid.UUID) error {
	res := r.db.WithContext(ctx).Model(&model.SalonMaster{}).
		Where("id = ? AND salon_id = ?", staffID, salonID).
		Updates(map[string]any{"is_active": false, "status": "inactive"})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *dashboardRepository) GetStaff(ctx context.Context, salonID, staffID uuid.UUID) (*model.SalonMaster, error) {
	var s model.SalonMaster
	err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", staffID, salonID).First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *dashboardRepository) ListStaffServiceIDs(ctx context.Context, salonID, staffID uuid.UUID) ([]uuid.UUID, error) {
	var st model.SalonMaster
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", staffID, salonID).First(&st).Error; err != nil {
		return nil, err
	}
	var ids []uuid.UUID
	err := r.db.WithContext(ctx).Model(&model.SalonMasterService{}).
		Where("staff_id = ?", staffID).
		Pluck("service_id", &ids).Error
	return ids, err
}

func (r *dashboardRepository) ReplaceStaffServices(ctx context.Context, salonID, staffID uuid.UUID, serviceIDs []uuid.UUID) error {
	var st model.SalonMaster
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", staffID, salonID).First(&st).Error; err != nil {
		return err
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("staff_id = ?", staffID).Delete(&model.SalonMasterService{}).Error; err != nil {
			return err
		}
		for _, sid := range serviceIDs {
			var n int64
			if err := tx.Model(&model.SalonService{}).Where("id = ? AND salon_id = ?", sid, salonID).Count(&n).Error; err != nil {
				return err
			}
			if n == 0 {
				return gorm.ErrRecordNotFound
			}
			row := model.SalonMasterService{SalonMasterID: staffID, ServiceID: sid}
			if err := tx.Create(&row).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *dashboardRepository) ReplaceSalonMasterServiceAssignments(ctx context.Context, salonID, salonMasterID uuid.UUID, rows []repository.SalonMasterServiceAssignment) error {
	var st model.SalonMaster
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", salonMasterID, salonID).First(&st).Error; err != nil {
		return err
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("staff_id = ?", salonMasterID).Delete(&model.SalonMasterService{}).Error; err != nil {
			return err
		}
		for _, row := range rows {
			var n int64
			if err := tx.Model(&model.SalonService{}).Where("id = ? AND salon_id = ?", row.ServiceID, salonID).Count(&n).Error; err != nil {
				return err
			}
			if n == 0 {
				return gorm.ErrRecordNotFound
			}
			link := model.SalonMasterService{
				SalonMasterID:           salonMasterID,
				ServiceID:               row.ServiceID,
				PriceOverrideCents:      row.PriceOverrideCents,
				DurationOverrideMinutes: row.DurationOverrideMinutes,
			}
			if err := tx.Create(&link).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *dashboardRepository) ListSalonMasterServiceDetails(ctx context.Context, salonID, salonMasterID uuid.UUID) ([]repository.SalonMasterServiceDetail, error) {
	var st model.SalonMaster
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", salonMasterID, salonID).First(&st).Error; err != nil {
		return nil, err
	}
	var out []repository.SalonMasterServiceDetail
	err := r.db.WithContext(ctx).Raw(`
		SELECT sms.staff_id AS salon_master_id,
			sms.service_id,
			s.name AS service_name,
			s.price_cents AS salon_price_cents,
			s.duration_minutes AS salon_duration_minutes,
			sms.price_override_cents,
			sms.duration_override_minutes
		FROM salon_master_services sms
		INNER JOIN services s ON s.id = sms.service_id AND s.salon_id = ?
		WHERE sms.staff_id = ?
		ORDER BY s.name ASC
	`, salonID, salonMasterID).Scan(&out).Error
	return out, err
}

func (r *dashboardRepository) ListSalonMasterServiceDetailsForSalon(ctx context.Context, salonID uuid.UUID) ([]repository.SalonMasterServiceDetail, error) {
	var out []repository.SalonMasterServiceDetail
	err := r.db.WithContext(ctx).Raw(`
		SELECT sms.staff_id AS salon_master_id,
			sms.service_id,
			s.name AS service_name,
			s.price_cents AS salon_price_cents,
			s.duration_minutes AS salon_duration_minutes,
			sms.price_override_cents,
			sms.duration_override_minutes
		FROM salon_master_services sms
		INNER JOIN services s ON s.id = sms.service_id AND s.salon_id = ?
		INNER JOIN salon_masters sm ON sm.id = sms.staff_id AND sm.salon_id = ?
		ORDER BY sm.display_name ASC, s.name ASC
	`, salonID, salonID).Scan(&out).Error
	return out, err
}

func (r *dashboardRepository) ReplaceServiceStaff(ctx context.Context, salonID, serviceID uuid.UUID, staffIDs []uuid.UUID) error {
	var svc model.SalonService
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", serviceID, salonID).First(&svc).Error; err != nil {
		return err
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("service_id = ?", serviceID).Delete(&model.SalonMasterService{}).Error; err != nil {
			return err
		}
		for _, sid := range staffIDs {
			var n int64
			if err := tx.Model(&model.SalonMaster{}).Where("id = ? AND salon_id = ?", sid, salonID).Count(&n).Error; err != nil {
				return err
			}
			if n == 0 {
				return gorm.ErrRecordNotFound
			}
			row := model.SalonMasterService{SalonMasterID: sid, ServiceID: serviceID}
			if err := tx.Create(&row).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *dashboardRepository) StaffServiceLines(ctx context.Context, salonID uuid.UUID) ([]repository.StaffServiceLine, error) {
	var raw []repository.StaffServiceLine
	err := r.db.WithContext(ctx).Raw(`
		SELECT ss.staff_id, ss.service_id, s.name AS service_name
		FROM salon_master_services ss
		INNER JOIN services s ON s.id = ss.service_id AND s.salon_id = ?
		INNER JOIN salon_masters st ON st.id = ss.staff_id AND st.salon_id = ?
		ORDER BY s.name ASC
	`, salonID, salonID).Scan(&raw).Error
	return raw, err
}

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
