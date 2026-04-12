package persistence

import (
	dbmodel "github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/model"
)

func dbSalonToDomain(s dbmodel.Salon) model.Salon {
	extIDs := make(map[string]string, len(s.ExternalIDs))
	for _, e := range s.ExternalIDs {
		extIDs[e.Source] = e.ExternalID
	}
	return model.Salon{
		ID:                   s.ID,
		ExternalIDs:          extIDs,
		NameOverride:         s.NameOverride,
		AddressOverride:      s.AddressOverride,
		Timezone:             s.Timezone,
		Description:          s.Description,
		PhonePublic:          s.PhonePublic,
		OnlineBookingEnabled: s.OnlineBookingEnabled,
		CategoryID:           s.CategoryID,
		BusinessType:         s.BusinessType,
		Lat:                  s.Lat,
		Lng:                  s.Lng,
		Address:              s.Address,
		District:             s.District,
		PhotoURL:             s.PhotoURL,
		Badge:                s.Badge,
		CardGradient:         s.CardGradient,
		Emoji:                s.Emoji,
		CachedRating:         s.CachedRating,
		CachedReviewCount:    s.CachedReviewCount,
		CreatedAt:            s.CreatedAt,
	}
}

func dbServiceToDomain(s dbmodel.SalonService) model.ServiceLine {
	return model.ServiceLine{
		ID:              s.ID,
		Name:            s.Name,
		DurationMinutes: s.DurationMinutes,
		PriceCents:      s.PriceCents,
	}
}
