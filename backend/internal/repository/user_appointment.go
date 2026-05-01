package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// UserAppointmentRow is a single appointment as seen by the client in their profile.
type UserAppointmentRow struct {
	ID           uuid.UUID
	SalonID      *uuid.UUID
	SalonName    string
	ServiceName  string  // primary or concatenated line-item names
	MasterName   *string // nil when no master assigned
	StartsAt     time.Time
	EndsAt       time.Time
	Status       string
	PriceCents   *int64 // nil when price is not set
	ClientNote   *string
}

// UserAppointmentFilter paginates the client's own appointment history.
type UserAppointmentFilter struct {
	UserID   uuid.UUID
	Page     int // 1-based
	PageSize int
}

// UserAppointmentRepository reads appointments owned by a registered user.
type UserAppointmentRepository interface {
	ListUserAppointments(ctx context.Context, f UserAppointmentFilter) ([]UserAppointmentRow, int64, error)
}
