package service

import (
	"context"
	"math"
	"sort"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
)

// SalonFilter holds optional constraints for GetAllSalons.
type SalonFilter struct {
	Lat        *float64
	Lon        *float64
	Category   string
	OnlineOnly bool
}

// SalonService loads salons from persistence and maps them to API DTOs.
type SalonService interface {
	GetAllSalons(ctx context.Context, f SalonFilter) ([]model.SalonDTO, error)
	GetSalonByID(ctx context.Context, id uuid.UUID) (*model.SalonDTO, error)
	FindIDByExternal(ctx context.Context, source, externalID string) (*FindByExternalResult, error)
}

type FindByExternalResult struct {
	SalonID       uuid.UUID `json:"salonId"`
	OnlineBooking bool      `json:"onlineBooking"`
}

type salonService struct {
	repo repository.SalonRepository
}

// NewSalonService constructs SalonService.
func NewSalonService(repo repository.SalonRepository) SalonService {
	return &salonService{repo: repo}
}

func (s *salonService) mapToDTO(salon model.Salon, services []model.ServiceLine) model.SalonDTO {
	dto := model.SalonDTO{
		ID:             salon.ID,
		Name:           "Unknown Salon",
		Category:       "all",
		BusinessType:   "venue",
		Rating:         0,
		ReviewCount:    0,
		DistanceKm:     0.0,
		Address:        "",
		District:       "",
		Services:       make([]model.ServiceDTO, 0, len(services)),
		AvailableToday: true,
		OnlineBooking:  salon.OnlineBookingEnabled,
		PhotoURL:       nil,
		Photos:         []string{},
		Description:    "",
		PhonePublic:    "",
		Timezone:       salon.Timezone,
		WorkingHours:   []model.WorkingHourDTO{},
		Badge:          nil,
		CardGradient:   "bg1",
		Emoji:          "💅",
	}

	if salon.NameOverride != nil {
		dto.Name = *salon.NameOverride
	}
	if salon.CategoryID != nil {
		dto.Category = *salon.CategoryID
	}
	if salon.BusinessType != nil {
		dto.BusinessType = *salon.BusinessType
	}
	if salon.CachedRating != nil {
		dto.Rating = *salon.CachedRating
	}
	if salon.CachedReviewCount != nil {
		dto.ReviewCount = *salon.CachedReviewCount
	}
	if salon.Address != nil {
		dto.Address = *salon.Address
	} else if salon.AddressOverride != nil {
		dto.Address = *salon.AddressOverride
	}
	if salon.District != nil {
		dto.District = *salon.District
	}
	if salon.PhotoURL != nil {
		dto.PhotoURL = salon.PhotoURL
		dto.Photos = []string{*salon.PhotoURL}
	}
	if salon.Description != nil {
		dto.Description = *salon.Description
	}
	if salon.PhonePublic != nil {
		dto.PhonePublic = *salon.PhonePublic
	}
	if salon.Badge != nil {
		dto.Badge = salon.Badge
	}
	if salon.CardGradient != nil {
		dto.CardGradient = *salon.CardGradient
	}
	if salon.Emoji != nil {
		dto.Emoji = *salon.Emoji
	}

	for _, srv := range services {
		price := 0
		if srv.PriceCents != nil {
			price = int(*srv.PriceCents)
		}
		dto.Services = append(dto.Services, model.ServiceDTO{
			ID:              srv.ID,
			Name:            srv.Name,
			DurationMinutes: srv.DurationMinutes,
			PriceCents:      price,
		})
	}

	return dto
}

type salonWithKey struct {
	dto     model.SalonDTO
	sortKey float64 // effective distance for sorting; math.MaxFloat64 when unknown
}

func (s *salonService) GetAllSalons(ctx context.Context, f SalonFilter) ([]model.SalonDTO, error) {
	salons, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	withKeys := make([]salonWithKey, 0, len(salons))
	for _, salon := range salons {
		// Category filter
		if f.Category != "" && f.Category != "all" {
			if salon.CategoryID == nil || *salon.CategoryID != f.Category {
				continue
			}
		}
		// Online-only filter
		if f.OnlineOnly && !salon.OnlineBookingEnabled {
			continue
		}

		services, err := s.repo.FindServicesBySalonID(ctx, salon.ID)
		if err != nil {
			services = []model.ServiceLine{}
		}
		dto := s.mapToDTO(salon, services)

		sortKey := math.MaxFloat64
		if f.Lat != nil && f.Lon != nil && salon.Lat != nil && salon.Lng != nil {
			dist := HaversineKm(*f.Lat, *f.Lon, *salon.Lat, *salon.Lng)
			// Round to 1 decimal place for display
			dto.DistanceKm = math.Round(dist*10) / 10
			sortKey = dist
		}

		withKeys = append(withKeys, salonWithKey{dto: dto, sortKey: sortKey})
	}

	// Sort: nearest first; among equal distances — higher rating first
	sort.Slice(withKeys, func(i, j int) bool {
		si, sj := withKeys[i].sortKey, withKeys[j].sortKey
		if si != sj {
			return si < sj
		}
		return withKeys[i].dto.Rating > withKeys[j].dto.Rating
	})

	dtos := make([]model.SalonDTO, len(withKeys))
	for i, w := range withKeys {
		dtos[i] = w.dto
	}
	return dtos, nil
}

func (s *salonService) GetSalonByID(ctx context.Context, id uuid.UUID) (*model.SalonDTO, error) {
	salon, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if salon == nil {
		return nil, nil
	}

	services, err := s.repo.FindServicesBySalonID(ctx, salon.ID)
	if err != nil {
		services = []model.ServiceLine{}
	}

	dto := s.mapToDTO(*salon, services)
	workingHours, err := s.repo.GetWorkingHours(ctx, salon.ID)
	if err == nil {
		dto.WorkingHours = workingHours
	}
	return &dto, nil
}

func (s *salonService) FindIDByExternal(ctx context.Context, source, externalID string) (*FindByExternalResult, error) {
	salon, err := s.repo.FindByExternalID(ctx, source, externalID)
	if err != nil {
		return nil, err
	}
	if salon == nil {
		return nil, nil
	}
	return &FindByExternalResult{
		SalonID:       salon.ID,
		OnlineBooking: salon.OnlineBookingEnabled,
	}, nil
}
