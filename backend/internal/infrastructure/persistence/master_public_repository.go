package persistence

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/beauty-marketplace/backend/internal/repository"
	"gorm.io/gorm"
)

type masterPublicRepository struct {
	db *gorm.DB
}

// NewMasterPublicRepository returns a GORM-backed MasterPublicRepository.
func NewMasterPublicRepository(db *gorm.DB) repository.MasterPublicRepository {
	return &masterPublicRepository{db: db}
}

type salonMasterPublicScan struct {
	SMID         uuid.UUID      `gorm:"column:sm_id"`
	SMDisplay    string         `gorm:"column:sm_display_name"`
	SMColor      *string        `gorm:"column:sm_color"`
	SMMasterID   *uuid.UUID     `gorm:"column:sm_master_id"`
	MPID         *uuid.UUID     `gorm:"column:mp_id"`
	MPBio        *string        `gorm:"column:mp_bio"`
	MPSpecs      pq.StringArray `gorm:"column:mp_specs;type:text[]"`
	MPAvatar     *string        `gorm:"column:mp_avatar"`
	MPYears      *int           `gorm:"column:mp_years"`
	MPRating   *float64 `gorm:"column:mp_rating"`
	MPRevCount *int     `gorm:"column:mp_rev_count"`
}

func (r *masterPublicRepository) ListSalonMastersPublic(ctx context.Context, salonID uuid.UUID) ([]repository.SalonMasterPublicRow, []repository.SalonMasterServiceLinkRow, error) {
	var scans []salonMasterPublicScan
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			sm.id AS sm_id,
			sm.display_name AS sm_display_name,
			sm.color AS sm_color,
			sm.master_id AS sm_master_id,
			mp.id AS mp_id,
			mp.bio AS mp_bio,
			mp.specializations AS mp_specs,
			mp.avatar_url AS mp_avatar,
			mp.years_experience AS mp_years,
			mp.cached_rating AS mp_rating,
			mp.cached_review_count AS mp_rev_count
		FROM salon_masters sm
		LEFT JOIN master_profiles mp ON mp.id = sm.master_id AND mp.is_active = true
		WHERE sm.salon_id = ?
			AND sm.status = 'active'
			AND sm.is_active = true
		ORDER BY sm.display_name ASC
	`, salonID).Scan(&scans).Error
	if err != nil {
		return nil, nil, err
	}

	masters := make([]repository.SalonMasterPublicRow, 0, len(scans))
	for _, s := range scans {
		row := repository.SalonMasterPublicRow{
			SalonMasterID: s.SMID,
			DisplayName:   s.SMDisplay,
			Color:         s.SMColor,
			MasterID:      s.SMMasterID,
			Specs:         nil,
		}
		if s.MPID != nil {
			specs := []string(s.MPSpecs)
			if specs == nil {
				specs = []string{}
			}
			rc := 0
			if s.MPRevCount != nil {
				rc = *s.MPRevCount
			}
			row.ProfileID = s.MPID
			row.Bio = s.MPBio
			row.Specs = specs
			row.AvatarURL = s.MPAvatar
			row.YearsExp = s.MPYears
			row.CachedRating = s.MPRating
			row.CachedReviews = rc
		}
		masters = append(masters, row)
	}

	var links []repository.SalonMasterServiceLinkRow
	err = r.db.WithContext(ctx).Raw(`
		SELECT
			sms.staff_id AS salon_master_id,
			sms.service_id,
			s.name AS service_name,
			s.price_cents AS salon_price_cents,
			s.duration_minutes AS salon_duration_minutes,
			sms.price_override_cents,
			sms.duration_override_minutes
		FROM salon_master_services sms
		INNER JOIN services s ON s.id = sms.service_id AND s.salon_id = ?
		WHERE s.is_active = true
		ORDER BY sms.staff_id, s.name ASC
	`, salonID).Scan(&links).Error
	if err != nil {
		return nil, nil, err
	}

	return masters, links, nil
}

type masterProfileScan struct {
	ID          uuid.UUID      `gorm:"column:id"`
	DisplayName string         `gorm:"column:display_name"`
	Bio         *string        `gorm:"column:bio"`
	Specs       pq.StringArray `gorm:"column:specializations;type:text[]"`
	AvatarURL   *string        `gorm:"column:avatar_url"`
	YearsExp    *int           `gorm:"column:years_experience"`
	Rating      *float64       `gorm:"column:cached_rating"`
	RevCount    int            `gorm:"column:cached_review_count"`
}

type membershipScan struct {
	SalonMasterID        uuid.UUID  `gorm:"column:salon_master_id"`
	SalonID              uuid.UUID  `gorm:"column:salon_id"`
	DisplayNameInSalon   string     `gorm:"column:display_name_in_salon"`
	JoinedAt             *time.Time `gorm:"column:joined_at"`
	Color                *string    `gorm:"column:sm_color"`
	SalonNameOverride    *string    `gorm:"column:name_override"`
	SalonAddress         *string    `gorm:"column:address"`
	SalonAddressOverride *string    `gorm:"column:address_override"`
}

func (r *masterPublicRepository) GetMasterProfilePublic(ctx context.Context, masterProfileID uuid.UUID) (*repository.MasterProfilePublicRow, []repository.MasterSalonMembershipRow, []repository.SalonMasterServiceLinkRow, error) {
	var prof masterProfileScan
	err := r.db.WithContext(ctx).Raw(`
		SELECT id, display_name, bio, specializations, avatar_url, years_experience,
			cached_rating, cached_review_count
		FROM master_profiles
		WHERE id = ? AND is_active = true
	`, masterProfileID).Scan(&prof).Error
	if err != nil {
		return nil, nil, nil, err
	}
	if prof.ID == uuid.Nil {
		return nil, nil, nil, nil
	}

	var memScans []membershipScan
	err = r.db.WithContext(ctx).Raw(`
		SELECT
			sm.id AS salon_master_id,
			sm.salon_id,
			sm.display_name AS display_name_in_salon,
			sm.joined_at,
			sm.color AS sm_color,
			s.name_override,
			s.address,
			s.address_override
		FROM salon_masters sm
		INNER JOIN salons s ON s.id = sm.salon_id
		WHERE sm.master_id = ?
			AND sm.status = 'active'
			AND sm.is_active = true
		ORDER BY sm.joined_at ASC NULLS LAST, sm.created_at ASC
	`, masterProfileID).Scan(&memScans).Error
	if err != nil {
		return nil, nil, nil, err
	}

	memberships := make([]repository.MasterSalonMembershipRow, 0, len(memScans))
	staffIDs := make([]uuid.UUID, 0, len(memScans))
	for _, m := range memScans {
		staffIDs = append(staffIDs, m.SalonMasterID)
		memberships = append(memberships, repository.MasterSalonMembershipRow{
			SalonMasterID:        m.SalonMasterID,
			SalonID:              m.SalonID,
			DisplayNameInSalon:   m.DisplayNameInSalon,
			JoinedAt:             m.JoinedAt,
			Color:                m.Color,
			SalonNameOverride:    m.SalonNameOverride,
			SalonAddress:         m.SalonAddress,
			SalonAddressOverride: m.SalonAddressOverride,
		})
	}

	var links []repository.SalonMasterServiceLinkRow
	if len(staffIDs) > 0 {
		err = r.db.WithContext(ctx).Raw(`
			SELECT
				sms.staff_id AS salon_master_id,
				sms.service_id,
				s.name AS service_name,
				s.price_cents AS salon_price_cents,
				s.duration_minutes AS salon_duration_minutes,
				sms.price_override_cents,
				sms.duration_override_minutes
			FROM salon_master_services sms
			INNER JOIN salon_masters sm2 ON sm2.id = sms.staff_id
			INNER JOIN services s ON s.id = sms.service_id AND s.salon_id = sm2.salon_id
			WHERE sms.staff_id IN ?
				AND s.is_active = true
			ORDER BY sms.staff_id, s.name ASC
		`, staffIDs).Scan(&links).Error
		if err != nil {
			return nil, nil, nil, err
		}
	}

	outProf := &repository.MasterProfilePublicRow{
		ID:                prof.ID,
		DisplayName:       prof.DisplayName,
		Bio:               prof.Bio,
		Specs:             []string(prof.Specs),
		AvatarURL:         prof.AvatarURL,
		YearsExp:          prof.YearsExp,
		CachedRating:      prof.Rating,
		CachedReviewCount: prof.RevCount,
	}
	return outProf, memberships, links, nil
}
