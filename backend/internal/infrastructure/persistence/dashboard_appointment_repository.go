package persistence

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

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
