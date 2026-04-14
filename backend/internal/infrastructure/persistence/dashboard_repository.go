package persistence

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

type dashboardRepository struct {
	db *gorm.DB
}

// NewDashboardRepository constructs DashboardRepository.
func NewDashboardRepository(db *gorm.DB) repository.DashboardRepository {
	return &dashboardRepository{db: db}
}

func (r *dashboardRepository) FindMembershipForUser(ctx context.Context, userID uuid.UUID) (*repository.SalonMembership, error) {
	var m model.SalonMember
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND role IN ?", userID, []string{"owner", "admin"}).
		First(&m).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &repository.SalonMembership{SalonID: m.SalonID, Role: m.Role}, nil
}

func (r *dashboardRepository) ListAppointments(ctx context.Context, f repository.AppointmentListFilter) ([]repository.AppointmentListRow, int64, error) {
	countQ := r.db.WithContext(ctx).Model(&model.Appointment{}).Where("salon_id = ?", f.SalonID)
	if f.From != nil {
		countQ = countQ.Where("starts_at >= ?", *f.From)
	}
	if f.To != nil {
		countQ = countQ.Where("starts_at < ?", *f.To)
	}
	if f.Status != "" {
		countQ = countQ.Where("status = ?", f.Status)
	}
	if f.StaffID != nil {
		countQ = countQ.Where("staff_id = ?", *f.StaffID)
	}
	if f.ServiceID != nil {
		countQ = countQ.Where("service_id = ?", *f.ServiceID)
	}
	var total int64
	if err := countQ.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	page := f.Page
	if page < 1 {
		page = 1
	}
	ps := f.PageSize
	if ps < 1 {
		ps = 20
	}
	if ps > 500 {
		ps = 500
	}
	offset := (page - 1) * ps

	q := r.db.WithContext(ctx).Table("appointments").
		Select(`appointments.*, services.name AS service_name, staff.display_name AS staff_name,
			COALESCE(NULLIF(TRIM(appointments.guest_name), ''), users.display_name, 'Гость') AS client_label,
			appointments.guest_phone_e164 AS client_phone`).
		Joins("JOIN services ON services.id = appointments.service_id AND services.salon_id = appointments.salon_id").
		Joins("LEFT JOIN staff ON staff.id = appointments.staff_id").
		Joins("LEFT JOIN users ON users.id = appointments.client_user_id").
		Where("appointments.salon_id = ?", f.SalonID)
	if f.From != nil {
		q = q.Where("appointments.starts_at >= ?", *f.From)
	}
	if f.To != nil {
		q = q.Where("appointments.starts_at < ?", *f.To)
	}
	if f.Status != "" {
		q = q.Where("appointments.status = ?", f.Status)
	}
	if f.StaffID != nil {
		q = q.Where("appointments.staff_id = ?", *f.StaffID)
	}
	if f.ServiceID != nil {
		q = q.Where("appointments.service_id = ?", *f.ServiceID)
	}

	var raw []struct {
		model.Appointment
		ServiceName string  `gorm:"column:service_name"`
		StaffName   *string `gorm:"column:staff_name"`
		ClientLabel string  `gorm:"column:client_label"`
		ClientPhone *string `gorm:"column:client_phone"`
	}
	if err := q.Order("appointments.starts_at ASC").Offset(offset).Limit(ps).Scan(&raw).Error; err != nil {
		return nil, 0, err
	}
	out := make([]repository.AppointmentListRow, len(raw))
	for i := range raw {
		out[i] = repository.AppointmentListRow{
			Appointment: raw[i].Appointment,
			ServiceName: raw[i].ServiceName,
			StaffName:   raw[i].StaffName,
			ClientLabel: raw[i].ClientLabel,
			ClientPhone: raw[i].ClientPhone,
		}
	}
	return out, total, nil
}

func (r *dashboardRepository) GetAppointment(ctx context.Context, salonID, appointmentID uuid.UUID) (*model.Appointment, error) {
	var a model.Appointment
	err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", appointmentID, salonID).First(&a).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &a, nil
}

func (r *dashboardRepository) CreateAppointment(ctx context.Context, a *model.Appointment) error {
	return r.db.WithContext(ctx).Create(a).Error
}

func (r *dashboardRepository) UpdateAppointment(ctx context.Context, a *model.Appointment) error {
	return r.db.WithContext(ctx).Model(&model.Appointment{}).
		Where("id = ? AND salon_id = ?", a.ID, a.SalonID).
		Updates(map[string]any{
			"starts_at":         a.StartsAt,
			"ends_at":           a.EndsAt,
			"staff_id":          a.StaffID,
			"service_id":        a.ServiceID,
			"client_note":       a.ClientNote,
			"guest_name":        a.GuestName,
			"guest_phone_e164":  a.GuestPhoneE164,
			"updated_at":        time.Now().UTC(),
		}).Error
}

func (r *dashboardRepository) UpdateAppointmentStatus(ctx context.Context, salonID, appointmentID uuid.UUID, status string) error {
	res := r.db.WithContext(ctx).Model(&model.Appointment{}).
		Where("id = ? AND salon_id = ?", appointmentID, salonID).
		Update("status", status)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *dashboardRepository) ListServices(ctx context.Context, salonID uuid.UUID) ([]model.SalonService, error) {
	var rows []model.SalonService
	err := r.db.WithContext(ctx).Where("salon_id = ?", salonID).Order("sort_order ASC, name ASC").Find(&rows).Error
	return rows, err
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

func (r *dashboardRepository) ListStaff(ctx context.Context, salonID uuid.UUID) ([]model.Staff, error) {
	var rows []model.Staff
	err := r.db.WithContext(ctx).Where("salon_id = ?", salonID).Order("display_name ASC").Find(&rows).Error
	return rows, err
}

func (r *dashboardRepository) CreateStaff(ctx context.Context, s *model.Staff) error {
	return r.db.WithContext(ctx).Create(s).Error
}

func (r *dashboardRepository) UpdateStaff(ctx context.Context, s *model.Staff) error {
	return r.db.WithContext(ctx).Model(&model.Staff{}).
		Where("id = ? AND salon_id = ?", s.ID, s.SalonID).
		Updates(map[string]any{
			"display_name":           s.DisplayName,
			"role":                   s.Role,
			"level":                  s.Level,
			"bio":                    s.Bio,
			"phone":                  s.Phone,
			"telegram_username":      s.TelegramUsername,
			"email":                  s.Email,
			"color":                  s.Color,
			"joined_at":              s.JoinedAt,
			"dashboard_access":       s.DashboardAccess,
			"telegram_notifications": s.TelegramNotifications,
			"is_active":              s.IsActive,
		}).Error
}

func (r *dashboardRepository) SoftDeleteStaff(ctx context.Context, salonID, staffID uuid.UUID) error {
	res := r.db.WithContext(ctx).Model(&model.Staff{}).
		Where("id = ? AND salon_id = ?", staffID, salonID).
		Update("is_active", false)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *dashboardRepository) GetStaff(ctx context.Context, salonID, staffID uuid.UUID) (*model.Staff, error) {
	var s model.Staff
	err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", staffID, salonID).First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

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

func (r *dashboardRepository) ListStaffWorkingHours(ctx context.Context, staffID, salonID uuid.UUID) ([]model.StaffWorkingHour, error) {
	var st model.Staff
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", staffID, salonID).First(&st).Error; err != nil {
		return nil, err
	}
	var rows []model.StaffWorkingHour
	err := r.db.WithContext(ctx).Where("staff_id = ?", staffID).Order("day_of_week ASC").Find(&rows).Error
	return rows, err
}

func (r *dashboardRepository) ReplaceStaffWorkingHours(ctx context.Context, staffID, salonID uuid.UUID, rows []model.StaffWorkingHour) error {
	var st model.Staff
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", staffID, salonID).First(&st).Error; err != nil {
		return err
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("staff_id = ?", staffID).Delete(&model.StaffWorkingHour{}).Error; err != nil {
			return err
		}
		for i := range rows {
			rows[i].StaffID = staffID
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

func (r *dashboardRepository) UpdateSalonProfile(ctx context.Context, salon *model.Salon) error {
	return r.db.WithContext(ctx).Model(&model.Salon{}).Where("id = ?", salon.ID).Updates(map[string]any{
		"name_override":          salon.NameOverride,
		"description":          salon.Description,
		"phone_public":           salon.PhonePublic,
		"category_id":            salon.CategoryID,
		"salon_type":             salon.SalonType,
		"business_type":          salon.BusinessType,
		"online_booking_enabled": salon.OnlineBookingEnabled,
		"address_override":       salon.AddressOverride,
		"district":               salon.District,
		"address":                salon.Address,
		"lat":                    salon.Lat,
		"lng":                    salon.Lng,
		"photo_url":              salon.PhotoURL,
		"timezone":               salon.Timezone,
	}).Error
}

func (r *dashboardRepository) FindSalonModel(ctx context.Context, salonID uuid.UUID) (*model.Salon, error) {
	var s model.Salon
	err := r.db.WithContext(ctx).Where("id = ?", salonID).First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *dashboardRepository) ListStaffServiceIDs(ctx context.Context, salonID, staffID uuid.UUID) ([]uuid.UUID, error) {
	var st model.Staff
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", staffID, salonID).First(&st).Error; err != nil {
		return nil, err
	}
	var ids []uuid.UUID
	err := r.db.WithContext(ctx).Model(&model.StaffService{}).
		Where("staff_id = ?", staffID).
		Pluck("service_id", &ids).Error
	return ids, err
}

func (r *dashboardRepository) ReplaceStaffServices(ctx context.Context, salonID, staffID uuid.UUID, serviceIDs []uuid.UUID) error {
	var st model.Staff
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", staffID, salonID).First(&st).Error; err != nil {
		return err
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("staff_id = ?", staffID).Delete(&model.StaffService{}).Error; err != nil {
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
			row := model.StaffService{StaffID: staffID, ServiceID: sid}
			if err := tx.Create(&row).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *dashboardRepository) ReplaceServiceStaff(ctx context.Context, salonID, serviceID uuid.UUID, staffIDs []uuid.UUID) error {
	var svc model.SalonService
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", serviceID, salonID).First(&svc).Error; err != nil {
		return err
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("service_id = ?", serviceID).Delete(&model.StaffService{}).Error; err != nil {
			return err
		}
		for _, sid := range staffIDs {
			var n int64
			if err := tx.Model(&model.Staff{}).Where("id = ? AND salon_id = ?", sid, salonID).Count(&n).Error; err != nil {
				return err
			}
			if n == 0 {
				return gorm.ErrRecordNotFound
			}
			row := model.StaffService{StaffID: sid, ServiceID: serviceID}
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
		FROM staff_services ss
		INNER JOIN services s ON s.id = ss.service_id AND s.salon_id = ?
		INNER JOIN staff st ON st.id = ss.staff_id AND st.salon_id = ?
		ORDER BY s.name ASC
	`, salonID, salonID).Scan(&raw).Error
	return raw, err
}

func (r *dashboardRepository) ServiceStaffNamesMap(ctx context.Context, salonID uuid.UUID) (map[uuid.UUID][]string, error) {
	type row struct {
		ServiceID uuid.UUID `gorm:"column:service_id"`
		Name      string    `gorm:"column:display_name"`
	}
	var raw []row
	err := r.db.WithContext(ctx).Table("staff_services").
		Select("staff_services.service_id, staff.display_name").
		Joins("JOIN staff ON staff.id = staff_services.staff_id AND staff.salon_id = ?", salonID).
		Where("staff.salon_id = ?", salonID).
		Order("staff.display_name ASC").
		Scan(&raw).Error
	if err != nil {
		return nil, err
	}
	out := make(map[uuid.UUID][]string)
	for _, r0 := range raw {
		out[r0.ServiceID] = append(out[r0.ServiceID], r0.Name)
	}
	return out, nil
}

func (r *dashboardRepository) StaffAvgRating(ctx context.Context, salonID, staffID uuid.UUID) (*float64, int64, error) {
	var avg sql.NullFloat64
	var n int64
	err := r.db.WithContext(ctx).Raw(`
		SELECT AVG(reviews.rating::float8), COUNT(*)
		FROM reviews
		INNER JOIN appointments ON appointments.id = reviews.appointment_id
		WHERE appointments.salon_id = ? AND appointments.staff_id = ?
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
		Where("salon_id = ? AND staff_id = ?", salonID, staffID)
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
		Where("appointments.salon_id = ? AND appointments.staff_id = ?", salonID, staffID).
		Where("appointments.starts_at >= ? AND appointments.starts_at < ?", from, to).
		Where("appointments.status = ?", "completed").
		Scan(&sum).Error
	return sum, err
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

func (r *dashboardRepository) ListStaffAbsences(ctx context.Context, salonID, staffID uuid.UUID) ([]model.StaffAbsence, error) {
	var st model.Staff
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", staffID, salonID).First(&st).Error; err != nil {
		return nil, err
	}
	var rows []model.StaffAbsence
	err := r.db.WithContext(ctx).Where("staff_id = ?", staffID).Order("starts_on ASC").Find(&rows).Error
	return rows, err
}

func (r *dashboardRepository) ReplaceStaffAbsences(ctx context.Context, salonID, staffID uuid.UUID, rows []model.StaffAbsence) error {
	var st model.Staff
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", staffID, salonID).First(&st).Error; err != nil {
		return err
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("staff_id = ?", staffID).Delete(&model.StaffAbsence{}).Error; err != nil {
			return err
		}
		for i := range rows {
			rows[i].StaffID = staffID
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
