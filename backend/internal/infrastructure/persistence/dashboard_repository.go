package persistence

import (
	"context"
	"database/sql"
	"errors"
	"strings"
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
	applyFilters := func(q *gorm.DB, tablePrefix bool) *gorm.DB {
		prefix := ""
		if tablePrefix {
			prefix = "appointments."
		}
		if f.From != nil {
			q = q.Where(prefix+"starts_at >= ?", *f.From)
		}
		if f.To != nil {
			q = q.Where(prefix+"starts_at < ?", *f.To)
		}
		if len(f.Statuses) > 0 {
			q = q.Where(prefix+"status IN ?", f.Statuses)
		}
		if f.StaffID != nil {
			q = q.Where(prefix+"salon_master_id = ?", *f.StaffID)
		}
		return q
	}

	countQ := r.db.WithContext(ctx).Model(&model.Appointment{}).Where("salon_id = ?", f.SalonID)
	countQ = applyFilters(countQ, false)
	if f.ServiceID != nil {
		sid := *f.ServiceID
		countQ = countQ.Where(
			"(service_id = ? OR EXISTS (SELECT 1 FROM appointment_line_items ali WHERE ali.appointment_id = appointments.id AND ali.service_id = ?))",
			sid, sid,
		)
	}
	if f.Search != "" {
		s := "%" + f.Search + "%"
		countQ = countQ.Where(
			"(guest_name ILIKE ? OR guest_phone_e164 LIKE ? OR EXISTS (SELECT 1 FROM users u WHERE u.id = client_user_id AND u.display_name ILIKE ?))",
			s, s, s,
		)
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
		ps = 25
	}
	if ps > 500 {
		ps = 500
	}
	offset := (page - 1) * ps

	sortColMap := map[string]string{
		"starts_at":    "appointments.starts_at",
		"service_name": "service_name",
		"status":       "appointments.status",
		"client_name":  "client_label",
	}
	sortCol, ok := sortColMap[f.SortBy]
	if !ok {
		sortCol = "appointments.starts_at"
	}
	sortDir := "DESC"
	if strings.ToLower(f.SortDir) == "asc" {
		sortDir = "ASC"
	}

	q := r.db.WithContext(ctx).Table("appointments").
		Select(`appointments.*,
			COALESCE(
				(SELECT string_agg(ali.service_name, ', ' ORDER BY ali.sort_order)
				 FROM appointment_line_items ali
				 WHERE ali.appointment_id = appointments.id),
				services.name
			) AS service_name,
			salon_masters.display_name AS staff_name,
			COALESCE(NULLIF(TRIM(appointments.guest_name), ''), users.display_name, 'Гость') AS client_label,
			appointments.guest_phone_e164 AS client_phone`).
		Joins("JOIN services ON services.id = appointments.service_id AND services.salon_id = appointments.salon_id").
		Joins("LEFT JOIN salon_masters ON salon_masters.id = appointments.salon_master_id").
		Joins("LEFT JOIN users ON users.id = appointments.client_user_id").
		Where("appointments.salon_id = ?", f.SalonID)
	q = applyFilters(q, true)
	if f.ServiceID != nil {
		sid := *f.ServiceID
		q = q.Where(
			"(appointments.service_id = ? OR EXISTS (SELECT 1 FROM appointment_line_items ali WHERE ali.appointment_id = appointments.id AND ali.service_id = ?))",
			sid, sid,
		)
	}
	if f.Search != "" {
		s := "%" + f.Search + "%"
		q = q.Where(
			"(appointments.guest_name ILIKE ? OR appointments.guest_phone_e164 LIKE ? OR users.display_name ILIKE ?)",
			s, s, s,
		)
	}

	var raw []struct {
		model.Appointment
		ServiceName string  `gorm:"column:service_name"`
		StaffName   *string `gorm:"column:staff_name"`
		ClientLabel string  `gorm:"column:client_label"`
		ClientPhone *string `gorm:"column:client_phone"`
	}
	if err := q.Order(sortCol + " " + sortDir).Offset(offset).Limit(ps).Scan(&raw).Error; err != nil {
		return nil, 0, err
	}
	type lineItemRow struct {
		AppointmentID uuid.UUID `gorm:"column:appointment_id"`
		ServiceID     uuid.UUID `gorm:"column:service_id"`
		ServiceName   string    `gorm:"column:service_name"`
		SortOrder     int       `gorm:"column:sort_order"`
	}
	lineItemsByAppointment := make(map[uuid.UUID][]lineItemRow, len(raw))
	if len(raw) > 0 {
		apptIDs := make([]uuid.UUID, 0, len(raw))
		for i := range raw {
			apptIDs = append(apptIDs, raw[i].Appointment.ID)
		}
		var lineRows []lineItemRow
		if err := r.db.WithContext(ctx).
			Table("appointment_line_items").
			Select("appointment_id, service_id, service_name, sort_order").
			Where("appointment_id IN ?", apptIDs).
			Order("appointment_id ASC, sort_order ASC").
			Scan(&lineRows).Error; err != nil {
			return nil, 0, err
		}
		for _, line := range lineRows {
			lineItemsByAppointment[line.AppointmentID] = append(lineItemsByAppointment[line.AppointmentID], line)
		}
	}
	out := make([]repository.AppointmentListRow, len(raw))
	for i := range raw {
		serviceNames := make([]string, 0, 4)
		serviceIDs := make([]uuid.UUID, 0, 4)
		lineRows := lineItemsByAppointment[raw[i].Appointment.ID]
		if len(lineRows) > 0 {
			for _, line := range lineRows {
				serviceNames = append(serviceNames, line.ServiceName)
				serviceIDs = append(serviceIDs, line.ServiceID)
			}
		} else {
			// Legacy appointments may not have line-items yet.
			serviceNames = append(serviceNames, raw[i].ServiceName)
			serviceIDs = append(serviceIDs, raw[i].Appointment.ServiceID)
		}
		out[i] = repository.AppointmentListRow{
			Appointment:  raw[i].Appointment,
			ServiceName:  raw[i].ServiceName,
			ServiceNames: serviceNames,
			ServiceIDs:   serviceIDs,
			StaffName:    raw[i].StaffName,
			ClientLabel:  raw[i].ClientLabel,
			ClientPhone:  raw[i].ClientPhone,
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
			"starts_at":        a.StartsAt,
			"ends_at":          a.EndsAt,
			"salon_master_id":  a.SalonMasterID,
			"service_id":       a.ServiceID,
			"client_note":      a.ClientNote,
			"guest_name":       a.GuestName,
			"guest_phone_e164": a.GuestPhoneE164,
			"updated_at":       time.Now().UTC(),
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

func (r *dashboardRepository) ListAppointmentLineItems(ctx context.Context, appointmentID uuid.UUID) ([]model.AppointmentLineItem, error) {
	var rows []model.AppointmentLineItem
	err := r.db.WithContext(ctx).Where("appointment_id = ?", appointmentID).Order("sort_order ASC").Find(&rows).Error
	return rows, err
}

func (r *dashboardRepository) ReplaceAppointmentLineItems(ctx context.Context, appointmentID uuid.UUID, items []model.AppointmentLineItem) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("appointment_id = ?", appointmentID).Delete(&model.AppointmentLineItem{}).Error; err != nil {
			return err
		}
		for i := range items {
			items[i].AppointmentID = appointmentID
			if items[i].ID == uuid.Nil {
				items[i].ID = uuid.New()
			}
			if err := tx.Create(&items[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

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

func (r *dashboardRepository) ListStaffWorkingHours(ctx context.Context, staffID, salonID uuid.UUID) ([]model.SalonMasterHour, error) {
	var st model.SalonMaster
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", staffID, salonID).First(&st).Error; err != nil {
		return nil, err
	}
	var rows []model.SalonMasterHour
	err := r.db.WithContext(ctx).Where("staff_id = ?", staffID).Order("day_of_week ASC").Find(&rows).Error
	return rows, err
}

func (r *dashboardRepository) ReplaceStaffWorkingHours(ctx context.Context, staffID, salonID uuid.UUID, rows []model.SalonMasterHour) error {
	var st model.SalonMaster
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", staffID, salonID).First(&st).Error; err != nil {
		return err
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("staff_id = ?", staffID).Delete(&model.SalonMasterHour{}).Error; err != nil {
			return err
		}
		for i := range rows {
			rows[i].SalonMasterID = staffID
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
		"description":            salon.Description,
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

func (r *dashboardRepository) ServiceStaffNamesMap(ctx context.Context, salonID uuid.UUID) (map[uuid.UUID][]string, error) {
	type row struct {
		ServiceID uuid.UUID `gorm:"column:service_id"`
		Name      string    `gorm:"column:display_name"`
	}
	var raw []row
	err := r.db.WithContext(ctx).Table("salon_master_services").
		Select("salon_master_services.service_id, salon_masters.display_name").
		Joins("JOIN salon_masters ON salon_masters.id = salon_master_services.staff_id AND salon_masters.salon_id = ?", salonID).
		Where("salon_masters.salon_id = ?", salonID).
		Order("salon_masters.display_name ASC").
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

func (r *dashboardRepository) ListStaffAbsences(ctx context.Context, salonID, staffID uuid.UUID) ([]model.SalonMasterAbsence, error) {
	var st model.SalonMaster
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", staffID, salonID).First(&st).Error; err != nil {
		return nil, err
	}
	var rows []model.SalonMasterAbsence
	err := r.db.WithContext(ctx).Where("staff_id = ?", staffID).Order("starts_on ASC").Find(&rows).Error
	return rows, err
}

func (r *dashboardRepository) ReplaceStaffAbsences(ctx context.Context, salonID, staffID uuid.UUID, rows []model.SalonMasterAbsence) error {
	var st model.SalonMaster
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", staffID, salonID).First(&st).Error; err != nil {
		return err
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("staff_id = ?", staffID).Delete(&model.SalonMasterAbsence{}).Error; err != nil {
			return err
		}
		for i := range rows {
			rows[i].SalonMasterID = staffID
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

func (r *dashboardRepository) GetMasterProfile(ctx context.Context, masterID uuid.UUID) (*model.MasterProfile, error) {
	var profile model.MasterProfile
	err := r.db.WithContext(ctx).First(&profile, "id = ?", masterID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &profile, err
}

func (r *dashboardRepository) GetMasterProfileBySalonMaster(ctx context.Context, salonMasterID uuid.UUID) (*model.MasterProfile, error) {
	var sm model.SalonMaster
	if err := r.db.WithContext(ctx).First(&sm, "id = ?", salonMasterID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	if sm.MasterID == nil {
		return nil, nil
	}
	return r.GetMasterProfile(ctx, *sm.MasterID)
}

func (r *dashboardRepository) GetMasterProfileByPhoneE164(ctx context.Context, phoneE164 string) (*model.MasterProfile, error) {
	var p model.MasterProfile
	err := r.db.WithContext(ctx).Where("phone_e164 = ?", phoneE164).First(&p).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

func (r *dashboardRepository) CreateMasterProfile(ctx context.Context, p *model.MasterProfile) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(p).Error
}

func (r *dashboardRepository) UpdateMasterProfile(ctx context.Context, p *model.MasterProfile) error {
	return r.db.WithContext(ctx).Model(&model.MasterProfile{}).
		Where("id = ?", p.ID).
		Updates(map[string]any{
			"display_name":     p.DisplayName,
			"avatar_url":       p.AvatarURL,
			"bio":              p.Bio,
			"specializations":  p.Specializations,
			"years_experience": p.YearsExperience,
			"phone_e164":       p.PhoneE164,
			"is_active":        p.IsActive,
			"updated_at":       time.Now().UTC(),
		}).Error
}
