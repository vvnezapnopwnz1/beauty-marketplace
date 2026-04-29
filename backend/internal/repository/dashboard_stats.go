package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// DashboardStatsRepository handles aggregate queries for dashboard analytics.
type DashboardStatsRepository interface {
	StaffAvgRating(ctx context.Context, salonID, staffID uuid.UUID) (avg *float64, n int64, err error)
	CountStaffAppointments(ctx context.Context, salonID, staffID uuid.UUID, from, to *time.Time, statuses []string) (int64, error)
	SumStaffRevenueCents(ctx context.Context, salonID, staffID uuid.UUID, from, to time.Time) (int64, error)
	CountAppointments(ctx context.Context, salonID uuid.UUID, from, to *time.Time, status string) (int64, error)
}
