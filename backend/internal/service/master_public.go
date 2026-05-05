package service

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/repository"
)

// MasterProfilePublicNested is nested master_profiles on public salon masters list.
type MasterProfilePublicNested struct {
	ID                uuid.UUID `json:"id"`
	Bio               *string   `json:"bio"`
	Specializations   []string  `json:"specializations"`
	AvatarURL         *string   `json:"avatarUrl"`
	YearsExperience   *int      `json:"yearsExperience"`
	CachedRating      *float64  `json:"cachedRating"`
	CachedReviewCount int       `json:"cachedReviewCount"`
}

// SalonMasterServicePublicDTO is one service line on public salon masters list.
type SalonMasterServicePublicDTO struct {
	ServiceID            uuid.UUID `json:"serviceId"`
	ServiceName          string    `json:"serviceName"`
	DurationMinutes      int       `json:"durationMinutes"`
	PriceCents           int64     `json:"priceCents"`
	PriceOverrideCents   *int64    `json:"priceOverrideCents"`
	EffectivePriceCents  int64     `json:"effectivePriceCents"`
}

// SalonMasterPublicDTO is one row of GET /api/v1/salons/:id/masters.
type SalonMasterPublicDTO struct {
	ID              uuid.UUID                  `json:"id"`
	DisplayName     string                     `json:"displayName"`
	Color           *string                    `json:"color,omitempty"`
	MasterProfile   *MasterProfilePublicNested `json:"masterProfile,omitempty"`
	Services        []SalonMasterServicePublicDTO `json:"services"`
}

// MasterSalonCardDTO is one salon block on GET /api/v1/masters/:id.
type MasterSalonCardDTO struct {
	SalonMasterID       uuid.UUID `json:"salonMasterId"`
	SalonID             uuid.UUID `json:"salonId"`
	SalonName           string    `json:"salonName"`
	SalonAddress        string    `json:"salonAddress"`
	DisplayNameInSalon  string    `json:"displayNameInSalon"`
	Services            []string  `json:"services"`
	JoinedAt            *string   `json:"joinedAt,omitempty"`
}

// MasterProfilePageDTO is GET /api/v1/masters/:id response body.
type MasterProfilePageDTO struct {
	ID                  uuid.UUID            `json:"id"`
	DisplayName         string               `json:"displayName"`
	Bio                 *string              `json:"bio,omitempty"`
	Specializations     []string             `json:"specializations"`
	AvatarURL           *string              `json:"avatarUrl"`
	YearsExperience     *int                 `json:"yearsExperience,omitempty"`
	CachedRating        *float64             `json:"cachedRating,omitempty"`
	CachedReviewCount   int                  `json:"cachedReviewCount"`
	HeaderCalendarColor *string              `json:"headerCalendarColor,omitempty"`
	Salons              []MasterSalonCardDTO `json:"salons"`
}

// MasterPublicService exposes read-only master data for the marketplace (no JWT).
type MasterPublicService interface {
	ListSalonMastersPublic(ctx context.Context, salonID uuid.UUID) ([]SalonMasterPublicDTO, error)
	GetMasterProfilePublic(ctx context.Context, masterProfileID uuid.UUID) (*MasterProfilePageDTO, error)
}

type masterPublicService struct {
	repo repository.MasterPublicRepository
}

// NewMasterPublicService constructs MasterPublicService.
func NewMasterPublicService(repo repository.MasterPublicRepository) MasterPublicService {
	return &masterPublicService{repo: repo}
}

func effectivePriceCents(salonPrice *int64, override *int) int64 {
	if override != nil {
		return int64(*override)
	}
	if salonPrice != nil {
		return *salonPrice
	}
	return 0
}

func effectiveDurationMinutes(salonDur int, override *int) int {
	if override != nil {
		return *override
	}
	return salonDur
}

func ptrInt64FromInt(p *int) *int64 {
	if p == nil {
		return nil
	}
	v := int64(*p)
	return &v
}

func salonLineName(override *string) string {
	if override != nil {
		if t := strings.TrimSpace(*override); t != "" {
			return t
		}
	}
	return "Unknown Salon"
}

func salonLineAddress(addr, addrOverride *string) string {
	if addrOverride != nil {
		if t := strings.TrimSpace(*addrOverride); t != "" {
			return t
		}
	}
	if addr != nil {
		return strings.TrimSpace(*addr)
	}
	return ""
}

func (s *masterPublicService) ListSalonMastersPublic(ctx context.Context, salonID uuid.UUID) ([]SalonMasterPublicDTO, error) {
	masters, links, err := s.repo.ListSalonMastersPublic(ctx, salonID)
	if err != nil {
		return nil, err
	}
	byStaff := make(map[uuid.UUID][]repository.SalonMasterServiceLinkRow)
	for _, l := range links {
		byStaff[l.SalonMasterID] = append(byStaff[l.SalonMasterID], l)
	}

	out := make([]SalonMasterPublicDTO, 0, len(masters))
	for _, m := range masters {
		services := make([]SalonMasterServicePublicDTO, 0)
		for _, l := range byStaff[m.SalonMasterID] {
			eff := effectivePriceCents(l.SalonPriceCents, l.PriceOverrideCents)
			dur := effectiveDurationMinutes(l.SalonDurationMinutes, l.DurationOverrideMinutes)
			var base int64
			if l.SalonPriceCents != nil {
				base = *l.SalonPriceCents
			}
			services = append(services, SalonMasterServicePublicDTO{
				ServiceID:           l.ServiceID,
				ServiceName:         l.ServiceName,
				DurationMinutes:     dur,
				PriceCents:          base,
				PriceOverrideCents:  ptrInt64FromInt(l.PriceOverrideCents),
				EffectivePriceCents: eff,
			})
		}

		dto := SalonMasterPublicDTO{
			ID:          m.SalonMasterID,
			DisplayName: m.DisplayName,
			Color:       m.Color,
			Services:    services,
		}
		if m.ProfileID != nil {
			specs := m.Specs
			if specs == nil {
				specs = []string{}
			}
			dto.MasterProfile = &MasterProfilePublicNested{
				ID:                *m.ProfileID,
				Bio:               m.Bio,
				Specializations:   specs,
				AvatarURL:         m.AvatarURL,
				YearsExperience:   m.YearsExp,
				CachedRating:      m.CachedRating,
				CachedReviewCount: m.CachedReviews,
			}
		}
		out = append(out, dto)
	}
	return out, nil
}

func (s *masterPublicService) GetMasterProfilePublic(ctx context.Context, masterProfileID uuid.UUID) (*MasterProfilePageDTO, error) {
	prof, memberships, links, err := s.repo.GetMasterProfilePublic(ctx, masterProfileID)
	if err != nil {
		return nil, err
	}
	if prof == nil {
		return nil, nil
	}

	byStaff := make(map[uuid.UUID][]string)
	for _, l := range links {
		byStaff[l.SalonMasterID] = append(byStaff[l.SalonMasterID], l.ServiceName)
	}

	salons := make([]MasterSalonCardDTO, 0, len(memberships))
		for _, mem := range memberships {
		var joined *string
		if mem.JoinedAt != nil {
			s := mem.JoinedAt.UTC().Format("2006-01-02T15:04:05Z")
			joined = &s
		}
		svcNames := byStaff[mem.SalonMasterID]
		if svcNames == nil {
			svcNames = []string{}
		}
		salons = append(salons, MasterSalonCardDTO{
			SalonMasterID:      mem.SalonMasterID,
			SalonID:            mem.SalonID,
			SalonName:          salonLineName(mem.SalonNameOverride),
			SalonAddress:       salonLineAddress(mem.SalonAddress, mem.SalonAddressOverride),
			DisplayNameInSalon: mem.DisplayNameInSalon,
			Services:           svcNames,
			JoinedAt:           joined,
		})
	}

	specs := prof.Specs
	if specs == nil {
		specs = []string{}
	}
	var headerColor *string
	if len(memberships) > 0 && memberships[0].Color != nil && strings.TrimSpace(*memberships[0].Color) != "" {
		headerColor = memberships[0].Color
	}
	return &MasterProfilePageDTO{
		ID:                  prof.ID,
		DisplayName:         prof.DisplayName,
		Bio:                 prof.Bio,
		Specializations:     specs,
		AvatarURL:           prof.AvatarURL,
		YearsExperience:     prof.YearsExp,
		CachedRating:        prof.CachedRating,
		CachedReviewCount:   prof.CachedReviewCount,
		HeaderCalendarColor: headerColor,
		Salons:              salons,
	}, nil
}
