package persistence

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

type masterDashboardRepository struct {
	db *gorm.DB
}

// NewMasterDashboardRepository constructs MasterDashboardRepository.
func NewMasterDashboardRepository(db *gorm.DB) repository.MasterDashboardRepository {
	return &masterDashboardRepository{db: db}
}

func (r *masterDashboardRepository) FindShadowMasterProfileIDByPhone(ctx context.Context, phoneE164 string) (*uuid.UUID, error) {
	var row struct {
		ID uuid.UUID `gorm:"column:id"`
	}
	err := r.db.WithContext(ctx).Raw(`
		SELECT id FROM master_profiles
		WHERE phone_e164 = ? AND user_id IS NULL AND is_active = true
		ORDER BY created_at ASC
		LIMIT 1
	`, phoneE164).Scan(&row).Error
	if err != nil {
		return nil, err
	}
	if row.ID == uuid.Nil {
		return nil, nil
	}
	return &row.ID, nil
}

func (r *masterDashboardRepository) ClaimMasterProfile(ctx context.Context, profileID, userID uuid.UUID, phoneE164 string) error {
	phone := phoneE164
	res := r.db.WithContext(ctx).Model(&model.MasterProfile{}).
		Where("id = ? AND user_id IS NULL", profileID).
		Updates(map[string]any{
			"user_id":    userID,
			"phone_e164": &phone,
		})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *masterDashboardRepository) FindMasterProfileIDByUserID(ctx context.Context, userID uuid.UUID) (*uuid.UUID, error) {
	var row struct {
		ID uuid.UUID `gorm:"column:id"`
	}
	err := r.db.WithContext(ctx).Raw(`
		SELECT id FROM master_profiles
		WHERE user_id = ? AND is_active = true
		LIMIT 1
	`, userID).Scan(&row).Error
	if err != nil {
		return nil, err
	}
	if row.ID == uuid.Nil {
		return nil, nil
	}
	return &row.ID, nil
}

func (r *masterDashboardRepository) GetMasterProfileByUserID(ctx context.Context, userID uuid.UUID) (*model.MasterProfile, error) {
	var mp model.MasterProfile
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND is_active = true", userID).
		First(&mp).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &mp, nil
}

func (r *masterDashboardRepository) UpdateMasterProfileByUserID(ctx context.Context, userID uuid.UUID, displayName string, bio *string, specs []string, years *int, avatar *string) error {
	arr := pq.StringArray(specs)
	if arr == nil {
		arr = pq.StringArray{}
	}
	res := r.db.WithContext(ctx).Model(&model.MasterProfile{}).
		Where("user_id = ?", userID).
		Updates(map[string]any{
			"display_name":     displayName,
			"bio":              bio,
			"specializations":  arr,
			"years_experience": years,
			"avatar_url":       avatar,
		})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

type inviteScan struct {
	SMID      uuid.UUID `gorm:"column:salon_master_id"`
	SalonID   uuid.UUID `gorm:"column:salon_id"`
	SalonName string    `gorm:"column:salon_name"`
	SalonAddr *string   `gorm:"column:salon_address"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

func (r *masterDashboardRepository) ListPendingInvites(ctx context.Context, masterProfileID uuid.UUID) ([]repository.MasterInviteRow, error) {
	var scans []inviteScan
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			sm.id AS salon_master_id,
			sm.salon_id,
			COALESCE(NULLIF(TRIM(s.name_override), ''), 'Салон') AS salon_name,
			COALESCE(NULLIF(TRIM(s.address_override), ''), NULLIF(TRIM(s.address), '')) AS salon_address,
			sm.created_at
		FROM salon_masters sm
		INNER JOIN salons s ON s.id = sm.salon_id
		WHERE sm.master_id = ?
			AND sm.status = 'pending'
		ORDER BY sm.created_at DESC
	`, masterProfileID).Scan(&scans).Error
	if err != nil {
		return nil, err
	}
	out := make([]repository.MasterInviteRow, len(scans))
	for i, s := range scans {
		out[i] = repository.MasterInviteRow{
			SalonMasterID: s.SMID,
			SalonID:       s.SalonID,
			SalonName:     s.SalonName,
			SalonAddress:  s.SalonAddr,
			CreatedAt:     s.CreatedAt,
		}
	}
	return out, nil
}

type activeSalonScan struct {
	SMID      uuid.UUID  `gorm:"column:salon_master_id"`
	SalonID   uuid.UUID  `gorm:"column:salon_id"`
	SalonName string     `gorm:"column:salon_name"`
	SalonAddr *string    `gorm:"column:salon_address"`
	JoinedAt  *time.Time `gorm:"column:joined_at"`
}

func (r *masterDashboardRepository) ListActiveSalonMemberships(ctx context.Context, masterProfileID uuid.UUID) ([]repository.MasterActiveSalonRow, error) {
	var scans []activeSalonScan
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			sm.id AS salon_master_id,
			sm.salon_id,
			COALESCE(NULLIF(TRIM(s.name_override), ''), 'Салон') AS salon_name,
			COALESCE(NULLIF(TRIM(s.address_override), ''), NULLIF(TRIM(s.address), '')) AS salon_address,
			sm.joined_at
		FROM salon_masters sm
		INNER JOIN salons s ON s.id = sm.salon_id
		WHERE sm.master_id = ?
			AND sm.status = 'active'
			AND sm.is_active = true
		ORDER BY sm.joined_at ASC NULLS LAST, sm.created_at ASC
	`, masterProfileID).Scan(&scans).Error
	if err != nil {
		return nil, err
	}
	out := make([]repository.MasterActiveSalonRow, len(scans))
	for i, s := range scans {
		out[i] = repository.MasterActiveSalonRow{
			SalonMasterID: s.SMID,
			SalonID:       s.SalonID,
			SalonName:     s.SalonName,
			SalonAddress:  s.SalonAddr,
			JoinedAt:      s.JoinedAt,
		}
	}
	return out, nil
}

func (r *masterDashboardRepository) AcceptPendingInvite(ctx context.Context, masterProfileID, salonMasterID uuid.UUID) (bool, error) {
	res := r.db.WithContext(ctx).Model(&model.SalonMaster{}).
		Where("id = ? AND master_id = ? AND status = ?", salonMasterID, masterProfileID, "pending").
		Updates(map[string]any{
			"status":    "active",
			"joined_at": time.Now().UTC(),
			"is_active": true,
		})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

func (r *masterDashboardRepository) DeclinePendingInvite(ctx context.Context, masterProfileID, salonMasterID uuid.UUID) (bool, error) {
	now := time.Now().UTC()
	res := r.db.WithContext(ctx).Model(&model.SalonMaster{}).
		Where("id = ? AND master_id = ? AND status = ?", salonMasterID, masterProfileID, "pending").
		Updates(map[string]any{
			"status":    "inactive",
			"left_at":   now,
			"is_active": false,
		})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

func (r *masterDashboardRepository) ListMasterAppointments(ctx context.Context, f repository.MasterAppointmentListFilter) ([]repository.MasterAppointmentListRow, int64, error) {
	limit := f.Limit
	if limit < 1 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}

	countQ := r.db.WithContext(ctx).Table("appointments a").
		Joins("JOIN salon_masters sm ON a.salon_master_id = sm.id").
		Where("sm.master_id = ?", f.MasterProfileID)
	if f.From != nil {
		countQ = countQ.Where("a.starts_at >= ?", *f.From)
	}
	if f.To != nil {
		countQ = countQ.Where("a.starts_at < ?", *f.To)
	}
	if f.Status != "" {
		countQ = countQ.Where("a.status = ?", f.Status)
	}
	var total int64
	if err := countQ.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var raw []struct {
		model.Appointment
		ServiceName string  `gorm:"column:service_name"`
		SalonName   string  `gorm:"column:salon_name"`
		ClientLabel string  `gorm:"column:client_label"`
		ClientPhone *string `gorm:"column:client_phone"`
	}
	q := r.db.WithContext(ctx).Table("appointments a").
		Select(`a.*,
			COALESCE(
				(SELECT string_agg(ali.service_name, ', ' ORDER BY ali.sort_order)
				 FROM appointment_line_items ali
				 WHERE ali.appointment_id = a.id),
				s.name
			) AS service_name,
			COALESCE(NULLIF(TRIM(sal.name_override), ''), 'Салон') AS salon_name,
			COALESCE(NULLIF(TRIM(a.guest_name), ''), users.display_name, 'Гость') AS client_label,
			a.guest_phone_e164 AS client_phone`).
		Joins("JOIN salon_masters sm ON a.salon_master_id = sm.id AND sm.master_id = ?", f.MasterProfileID).
		Joins("JOIN services s ON s.id = a.service_id AND s.salon_id = a.salon_id").
		Joins("JOIN salons sal ON sal.id = a.salon_id").
		Joins("LEFT JOIN users ON users.id = a.client_user_id")
	if f.From != nil {
		q = q.Where("a.starts_at >= ?", *f.From)
	}
	if f.To != nil {
		q = q.Where("a.starts_at < ?", *f.To)
	}
	if f.Status != "" {
		q = q.Where("a.status = ?", f.Status)
	}
	if err := q.Order("a.starts_at DESC").Limit(limit).Scan(&raw).Error; err != nil {
		return nil, 0, err
	}
	out := make([]repository.MasterAppointmentListRow, len(raw))
	for i := range raw {
		out[i] = repository.MasterAppointmentListRow{
			Appointment: raw[i].Appointment,
			ServiceName: raw[i].ServiceName,
			SalonName:   raw[i].SalonName,
			ClientLabel: raw[i].ClientLabel,
			ClientPhone: raw[i].ClientPhone,
		}
	}
	return out, total, nil
}
