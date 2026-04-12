package persistence

import (
	"context"
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
	if ps > 100 {
		ps = 100
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
			"starts_at":    a.StartsAt,
			"ends_at":      a.EndsAt,
			"staff_id":     a.StaffID,
			"service_id":   a.ServiceID,
			"client_note":  a.ClientNote,
			"updated_at":   time.Now().UTC(),
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

func (r *dashboardRepository) CreateService(ctx context.Context, s *model.SalonService) error {
	return r.db.WithContext(ctx).Create(s).Error
}

func (r *dashboardRepository) UpdateService(ctx context.Context, s *model.SalonService) error {
	return r.db.WithContext(ctx).Model(&model.SalonService{}).
		Where("id = ? AND salon_id = ?", s.ID, s.SalonID).
		Updates(map[string]any{
			"name":             s.Name,
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
			"display_name": s.DisplayName,
			"is_active":    s.IsActive,
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
