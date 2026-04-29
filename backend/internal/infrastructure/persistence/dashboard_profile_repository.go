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

func (r *dashboardRepository) FindMembershipForUserAndSalon(ctx context.Context, userID, salonID uuid.UUID) (*repository.SalonMembership, error) {
	var m model.SalonMember
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND salon_id = ?", userID, salonID).
		First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &repository.SalonMembership{SalonID: m.SalonID, Role: m.Role}, nil
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
		"onboarding_completed":   salon.OnboardingCompleted,
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

func (r *dashboardRepository) ListSalonMemberUsers(ctx context.Context, salonID uuid.UUID) ([]repository.SalonMemberUserRow, error) {
	var rows []repository.SalonMemberUserRow
	err := r.db.WithContext(ctx).Raw(`
		SELECT sm.user_id, u.phone_e164, u.display_name, sm.role::text AS role
		FROM salon_members sm
		INNER JOIN users u ON u.id = sm.user_id
		WHERE sm.salon_id = ?
		ORDER BY
			CASE sm.role::text WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
			u.display_name NULLS LAST`, salonID).Scan(&rows).Error
	return rows, err
}

func (r *dashboardRepository) DeleteSalonMember(ctx context.Context, salonID, targetUserID uuid.UUID) (bool, error) {
	res := r.db.WithContext(ctx).
		Where("salon_id = ? AND user_id = ? AND role::text <> ?", salonID, targetUserID, "owner").
		Delete(&model.SalonMember{})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

func (r *dashboardRepository) UpdateSalonMemberRole(ctx context.Context, salonID, targetUserID uuid.UUID, role string) (bool, error) {
	res := r.db.WithContext(ctx).Model(&model.SalonMember{}).
		Where("salon_id = ? AND user_id = ? AND role::text <> ?", salonID, targetUserID, "owner").
		Update("role", role)
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}
