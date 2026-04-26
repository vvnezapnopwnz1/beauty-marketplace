package persistence

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func parseTimestamp(s string) *time.Time {
	for _, layout := range []string{time.RFC3339Nano, "2006-01-02 15:04:05.999999999-07:00", "2006-01-02 15:04:05-07", "2006-01-02T15:04:05Z07:00"} {
		if t, err := time.Parse(layout, s); err == nil {
			return &t
		}
	}
	return nil
}

type salonClientRepository struct {
	db *gorm.DB
}

// NewSalonClientRepository constructs SalonClientRepository.
func NewSalonClientRepository(db *gorm.DB) repository.SalonClientRepository {
	return &salonClientRepository{db: db}
}

func (r *salonClientRepository) ListBysalon(ctx context.Context, salonID uuid.UUID, f repository.SalonClientListFilter) ([]repository.SalonClientRow, int64, error) {
	page := max(f.Page, 1)
	ps := f.PageSize
	if ps < 1 {
		ps = 50
	}
	if ps > 200 {
		ps = 200
	}
	offset := (page - 1) * ps

	q := r.db.WithContext(ctx).Model(&model.SalonClient{})
	if f.IncludeDeleted {
		q = q.Unscoped()
	}
	base := q.Where("salon_id = ?", salonID)
	if f.Search != "" {
		s := "%" + f.Search + "%"
		base = base.Where("(display_name ILIKE ? OR phone_e164 LIKE ?)", s, s)
	}
	if len(f.TagIDs) > 0 {
		base = base.Where(
			"EXISTS (SELECT 1 FROM salon_client_tag_assignments a WHERE a.salon_client_id = salon_clients.id AND a.tag_id IN ?)",
			f.TagIDs,
		)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var clients []model.SalonClient
	if err := base.Order("display_name ASC").Offset(offset).Limit(ps).Find(&clients).Error; err != nil {
		return nil, 0, err
	}
	if len(clients) == 0 {
		return nil, total, nil
	}

	ids := make([]uuid.UUID, len(clients))
	for i, c := range clients {
		ids[i] = c.ID
	}

	// Visit counts and last visit.
	type visitStat struct {
		SalonClientID uuid.UUID  `gorm:"column:salon_client_id"`
		Count         int64      `gorm:"column:cnt"`
		LastVisit     *string    `gorm:"column:last_visit"`
	}
	var stats []visitStat
	_ = r.db.WithContext(ctx).Raw(
		`SELECT salon_client_id, COUNT(*) AS cnt, MAX(starts_at)::text AS last_visit
		 FROM appointments
		 WHERE salon_client_id IN ? AND status IN ('completed','confirmed','pending')
		 GROUP BY salon_client_id`,
		ids,
	).Scan(&stats).Error

	statMap := map[uuid.UUID]visitStat{}
	for _, s := range stats {
		statMap[s.SalonClientID] = s
	}

	// Tags per client.
	type tagRow struct {
		SalonClientID uuid.UUID `gorm:"column:salon_client_id"`
		model.SalonClientTag
	}
	var tagRows []tagRow
	_ = r.db.WithContext(ctx).Raw(
		`SELECT a.salon_client_id, t.id, t.salon_id, t.name, t.color, t.created_at
		 FROM salon_client_tag_assignments a
		 JOIN salon_client_tags t ON t.id = a.tag_id
		 WHERE a.salon_client_id IN ?`,
		ids,
	).Scan(&tagRows).Error

	tagMap := map[uuid.UUID][]model.SalonClientTag{}
	for _, tr := range tagRows {
		tagMap[tr.SalonClientID] = append(tagMap[tr.SalonClientID], tr.SalonClientTag)
	}

	// User info for registered clients.
	type userRow struct {
		ID          uuid.UUID `gorm:"column:id"`
		PhoneE164   *string   `gorm:"column:phone_e164"`
		DisplayName *string   `gorm:"column:display_name"`
	}
	userIDSet := []uuid.UUID{}
	for _, c := range clients {
		if c.UserID != nil {
			userIDSet = append(userIDSet, *c.UserID)
		}
	}
	userMap := map[uuid.UUID]userRow{}
	if len(userIDSet) > 0 {
		var users []userRow
		_ = r.db.WithContext(ctx).Raw("SELECT id, phone_e164, display_name FROM users WHERE id IN ?", userIDSet).Scan(&users).Error
		for _, u := range users {
			userMap[u.ID] = u
		}
	}

	out := make([]repository.SalonClientRow, len(clients))
	for i, c := range clients {
		row := repository.SalonClientRow{
			Client: c,
			Tags:   tagMap[c.ID],
		}
		if s, ok := statMap[c.ID]; ok {
			row.VisitCount = s.Count
			if s.LastVisit != nil {
				t := parseTimestamp(*s.LastVisit)
				row.LastVisitAt = t
			}
		}
		if c.UserID != nil {
			if u, ok := userMap[*c.UserID]; ok {
				row.UserPhone = u.PhoneE164
				row.UserDisplayName = u.DisplayName
			}
		}
		out[i] = row
	}
	return out, total, nil
}

func (r *salonClientRepository) GetByID(ctx context.Context, salonID, clientID uuid.UUID) (*repository.SalonClientRow, error) {
	var c model.SalonClient
	err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", clientID, salonID).First(&c).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	row := &repository.SalonClientRow{Client: c}

	type visitStat struct {
		Count     int64  `gorm:"column:cnt"`
		LastVisit *string `gorm:"column:last_visit"`
	}
	var vs visitStat
	_ = r.db.WithContext(ctx).Raw(
		`SELECT COUNT(*) AS cnt, MAX(starts_at)::text AS last_visit
		 FROM appointments WHERE salon_client_id = ? AND status IN ('completed','confirmed','pending')`,
		clientID,
	).Scan(&vs).Error
	row.VisitCount = vs.Count
	if vs.LastVisit != nil {
		row.LastVisitAt = parseTimestamp(*vs.LastVisit)
	}

	type tagRow struct {
		model.SalonClientTag
	}
	var tagRows []tagRow
	_ = r.db.WithContext(ctx).Raw(
		`SELECT t.id, t.salon_id, t.name, t.color, t.created_at
		 FROM salon_client_tag_assignments a JOIN salon_client_tags t ON t.id = a.tag_id
		 WHERE a.salon_client_id = ?`,
		clientID,
	).Scan(&tagRows).Error
	for _, tr := range tagRows {
		row.Tags = append(row.Tags, tr.SalonClientTag)
	}

	if c.UserID != nil {
		type userRow struct {
			PhoneE164   *string `gorm:"column:phone_e164"`
			DisplayName *string `gorm:"column:display_name"`
		}
		var u userRow
		_ = r.db.WithContext(ctx).Raw("SELECT phone_e164, display_name FROM users WHERE id = ?", *c.UserID).Scan(&u).Error
		row.UserPhone = u.PhoneE164
		row.UserDisplayName = u.DisplayName
	}

	return row, nil
}

func (r *salonClientRepository) Create(ctx context.Context, c *model.SalonClient) error {
	return r.db.WithContext(ctx).Create(c).Error
}

func (r *salonClientRepository) Update(ctx context.Context, c *model.SalonClient) error {
	return r.db.WithContext(ctx).Save(c).Error
}

func (r *salonClientRepository) SoftDelete(ctx context.Context, salonID, clientID uuid.UUID) error {
	var c model.SalonClient
	err := r.db.WithContext(ctx).Unscoped().
		Where("id = ? AND salon_id = ?", clientID, salonID).
		First(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("client not found")
	}
	if err != nil {
		return err
	}
	if c.DeletedAt.Valid {
		return fmt.Errorf("client already deleted")
	}
	return r.db.WithContext(ctx).Delete(&c).Error
}

func (r *salonClientRepository) Restore(ctx context.Context, salonID, clientID uuid.UUID) (*repository.SalonClientRow, error) {
	var c model.SalonClient
	err := r.db.WithContext(ctx).Unscoped().
		Where("id = ? AND salon_id = ? AND deleted_at IS NOT NULL", clientID, salonID).
		First(&c).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("client not found or not deleted")
		}
		return nil, err
	}
	if err := r.db.WithContext(ctx).Unscoped().Model(&c).Update("deleted_at", nil).Error; err != nil {
		return nil, err
	}
	return r.GetByID(ctx, salonID, clientID)
}

func (r *salonClientRepository) GetOrCreateByPhone(ctx context.Context, salonID uuid.UUID, phone, displayName string) (*model.SalonClient, error) {
	var c model.SalonClient
	err := r.db.WithContext(ctx).
		Where("salon_id = ? AND phone_e164 = ? AND user_id IS NULL", salonID, phone).
		First(&c).Error
	if err == nil {
		return &c, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	c = model.SalonClient{
		SalonID:     salonID,
		PhoneE164:   &phone,
		DisplayName: displayName,
	}
	if err := r.db.WithContext(ctx).
		Clauses(clause.OnConflict{DoNothing: true}).
		Create(&c).Error; err != nil {
		return nil, err
	}
	// Re-fetch in case of concurrent insert.
	if err := r.db.WithContext(ctx).
		Where("salon_id = ? AND phone_e164 = ? AND user_id IS NULL", salonID, phone).
		First(&c).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *salonClientRepository) GetOrCreateByUserID(ctx context.Context, salonID, userID uuid.UUID, displayName string) (*model.SalonClient, error) {
	var c model.SalonClient
	err := r.db.WithContext(ctx).
		Where("salon_id = ? AND user_id = ?", salonID, userID).
		First(&c).Error
	if err == nil {
		return &c, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	c = model.SalonClient{
		SalonID:     salonID,
		UserID:      &userID,
		DisplayName: displayName,
	}
	if err := r.db.WithContext(ctx).
		Clauses(clause.OnConflict{DoNothing: true}).
		Create(&c).Error; err != nil {
		return nil, err
	}
	if err := r.db.WithContext(ctx).
		Where("salon_id = ? AND user_id = ?", salonID, userID).
		First(&c).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *salonClientRepository) MergeGuestToUser(ctx context.Context, salonID, clientID, userID uuid.UUID) (*model.SalonClient, error) {
	var c model.SalonClient
	if err := r.db.WithContext(ctx).Where("id = ? AND salon_id = ?", clientID, salonID).First(&c).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	c.UserID = &userID
	c.PhoneE164 = nil
	if err := r.db.WithContext(ctx).Save(&c).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *salonClientRepository) ListTags(ctx context.Context, salonID uuid.UUID) ([]model.SalonClientTag, error) {
	var tags []model.SalonClientTag
	err := r.db.WithContext(ctx).
		Where("salon_id IS NULL OR salon_id = ?", salonID).
		Order("name ASC").
		Find(&tags).Error
	return tags, err
}

func (r *salonClientRepository) CreateTag(ctx context.Context, t *model.SalonClientTag) error {
	return r.db.WithContext(ctx).Create(t).Error
}

func (r *salonClientRepository) AssignTag(ctx context.Context, salonClientID, tagID uuid.UUID) error {
	a := model.SalonClientTagAssignment{SalonClientID: salonClientID, TagID: tagID}
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{DoNothing: true}).
		Create(&a).Error
}

func (r *salonClientRepository) RemoveTag(ctx context.Context, salonClientID, tagID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("salon_client_id = ? AND tag_id = ?", salonClientID, tagID).
		Delete(&model.SalonClientTagAssignment{}).Error
}

func (r *salonClientRepository) ListClientAppointments(ctx context.Context, salonID, clientID uuid.UUID, page, pageSize int) ([]repository.AppointmentListRow, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 25
	}
	if pageSize > 200 {
		pageSize = 200
	}
	offset := (page - 1) * pageSize

	var total int64
	if err := r.db.WithContext(ctx).Model(&model.Appointment{}).
		Where("salon_id = ? AND salon_client_id = ?", salonID, clientID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var raw []struct {
		model.Appointment
		ServiceName string  `gorm:"column:service_name"`
		StaffName   *string `gorm:"column:staff_name"`
		ClientLabel string  `gorm:"column:client_label"`
		ClientPhone *string `gorm:"column:client_phone"`
	}
	err := r.db.WithContext(ctx).Table("appointments").
		Select(`appointments.*,
			COALESCE(
				(SELECT string_agg(ali.service_name, ', ' ORDER BY ali.sort_order)
				 FROM appointment_line_items ali WHERE ali.appointment_id = appointments.id),
				services.name
			) AS service_name,
			salon_masters.display_name AS staff_name,
			COALESCE(NULLIF(TRIM(appointments.guest_name), ''), users.display_name, 'Гость') AS client_label,
			appointments.guest_phone_e164 AS client_phone`).
		Joins("JOIN services ON services.id = appointments.service_id AND services.salon_id = appointments.salon_id").
		Joins("LEFT JOIN salon_masters ON salon_masters.id = appointments.salon_master_id").
		Joins("LEFT JOIN users ON users.id = appointments.client_user_id").
		Where("appointments.salon_id = ? AND appointments.salon_client_id = ?", salonID, clientID).
		Order("appointments.starts_at DESC").
		Offset(offset).Limit(pageSize).
		Scan(&raw).Error
	if err != nil {
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
