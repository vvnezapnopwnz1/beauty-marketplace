package model

import (
	"time"

	"github.com/google/uuid"
)

// Salon is a domain aggregate loaded from persistence (no ORM tags).
type Salon struct {
	ID                   uuid.UUID
	ExternalIDs          map[string]string // source -> external_id, e.g. {"2gis": "...", "yandex": "..."}
	NameOverride         *string
	AddressOverride      *string
	Timezone             string
	Description          *string
	PhonePublic          *string
	OnlineBookingEnabled bool
	CategoryID           *string
	BusinessType         *string
	Lat                  *float64
	Lng                  *float64
	Address              *string
	District             *string
	PhotoURL             *string
	Badge                *string
	CardGradient         *string
	Emoji                *string
	CachedRating         *float64
	CachedReviewCount    *int
	CreatedAt            time.Time
}

// ServiceLine is one bookable/offered service row for a salon.
type ServiceLine struct {
	ID              uuid.UUID
	Name            string
	DurationMinutes int
	PriceCents      *int64
}

// ServiceDTO represents a service as expected by the frontend.
type ServiceDTO struct {
	ID              uuid.UUID `json:"id"`
	Name            string    `json:"name"`
	DurationMinutes int       `json:"durationMinutes"`
	PriceCents      int       `json:"priceCents"`
}

type WorkingHourDTO struct {
	DayOfWeek     int     `json:"dayOfWeek"`
	OpensAt       string  `json:"opensAt"`
	ClosesAt      string  `json:"closesAt"`
	IsClosed      bool    `json:"isClosed"`
	BreakStartsAt *string `json:"breakStartsAt,omitempty"`
	BreakEndsAt   *string `json:"breakEndsAt,omitempty"`
}

// SalonDTO represents a salon as expected by the frontend.
type SalonDTO struct {
	ID             uuid.UUID        `json:"id"`
	Name           string           `json:"name"`
	Category       string           `json:"category"`
	BusinessType   string           `json:"businessType"`
	Rating         float64          `json:"rating"`
	ReviewCount    int              `json:"reviewCount"`
	DistanceKm     float64          `json:"distanceKm"`
	Address        string           `json:"address"`
	District       string           `json:"district"`
	Services       []ServiceDTO     `json:"services"`
	AvailableToday bool             `json:"availableToday"`
	OnlineBooking  bool             `json:"onlineBooking"`
	PhotoURL       *string          `json:"photoUrl"`
	Photos         []string         `json:"photos"`
	Description    string           `json:"description"`
	PhonePublic    string           `json:"phonePublic"`
	Timezone       string           `json:"timezone"`
	WorkingHours   []WorkingHourDTO `json:"workingHours"`
	Badge          *string          `json:"badge,omitempty"`
	CardGradient   string           `json:"cardGradient"`
	Emoji          string           `json:"emoji"`
}
