---
title: entity prototype
updated: 2026-04-24
source_of_truth: mirror
code_pointers: []

> **Не источник правды по схеме БД.** Учебный набросок структур; актуальные модели — `backend/internal/infrastructure/persistence/model/models.go` и [`architecture/db-schema.md`](../architecture/db-schema.md).

---

package beautymarketplace

import (
	"time"

	"github.com/google/uuid"
)

// Salon — салон/студия
type Salon struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Address     string    `json:"address"`
	City        string    `json:"city"`
	Lat         float64   `json:"lat"`
	Lng         float64   `json:"lng"`
	DistanceKm  float64   `json:"distance_km"` // вычисляемое
	PhotoURL    string    `json:"photo_url"`
	Badge       string    `json:"badge"` // "popular" | "top_rated" | "new" | ""
	Rating      float32   `json:"rating"`
	ReviewCount int       `json:"review_count"`
	PriceFrom   int       `json:"price_from"` // в центах или минимальная цена
	IsOpen      bool      `json:"is_open"`
	Services    []Service `json:"services"`
	CreatedAt   time.Time `json:"created_at"`
}

// Service — услуга, которую предлагает салон
type Service struct {
	ID       uuid.UUID `json:"id"`
	SalonID  uuid.UUID `json:"salon_id"`
	Name     string    `json:"name"` // "Cut & Style", "Gel Nails"
	Category Category  `json:"category"`
	Duration int       `json:"duration"` // минуты
	Price    int       `json:"price"`    // в центах
}

// Category — категория услуг (вкладки фильтра)
type Category struct {
	ID   uuid.UUID `json:"id"`
	Slug string    `json:"slug"` // "hair" | "nails" | "spa" | "barber"
	Name string    `json:"name"`
	Icon string    `json:"icon"`
}

// Review — отзыв
type Review struct {
	ID        uuid.UUID `json:"id"`
	SalonID   uuid.UUID `json:"salon_id"`
	UserID    uuid.UUID `json:"user_id"`
	Rating    int       `json:"rating"` // 1–5
	Text      string    `json:"text"`
	CreatedAt time.Time `json:"created_at"`
}

// User — клиент
type User struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	CreatedAt time.Time `json:"created_at"`
}

// Booking — запись на услугу
type Booking struct {
	ID        uuid.UUID     `json:"id"`
	UserID    uuid.UUID     `json:"user_id"`
	ServiceID uuid.UUID     `json:"service_id"`
	SalonID   uuid.UUID     `json:"salon_id"`
	StartsAt  time.Time     `json:"starts_at"`
	EndsAt    time.Time     `json:"ends_at"`
	Status    BookingStatus `json:"status"`
	PromoCode string        `json:"promo_code,omitempty"`
	CreatedAt time.Time     `json:"created_at"`
}

type BookingStatus string

const (
	BookingPending   BookingStatus = "pending"
	BookingConfirmed BookingStatus = "confirmed"
	BookingCancelled BookingStatus = "cancelled"
	BookingCompleted BookingStatus = "completed"
)

// Promo — промо-баннер (баннер "First booking 20% off")
type Promo struct {
	ID          uuid.UUID `json:"id"`
	Code        string    `json:"code"`     // "FIRST20"
	Discount    int       `json:"discount"` // 20 (процент)
	Description string    `json:"description"`
	ValidUntil  time.Time `json:"valid_until"`
	IsActive    bool      `json:"is_active"`
}

// SearchFilter — параметры поиска/фильтрации
type SearchFilter struct {
	Query       string    `json:"query"` // строка поиска
	City        string    `json:"city"`
	Lat         float64   `json:"lat"`
	Lng         float64   `json:"lng"`
	CategoryID  uuid.UUID `json:"category_id"`
	MaxPrice    int       `json:"max_price"`
	AvailableAt time.Time `json:"available_at"` // "Available today"
	OpenNow     bool      `json:"open_now"`
	TopRated    bool      `json:"top_rated"`
	NewOnly     bool      `json:"new_only"`
	SortBy      string    `json:"sort_by"` // "recommended" | "rating" | "price" | "distance"
	Page        int       `json:"page"`
	Limit       int       `json:"limit"`
}
