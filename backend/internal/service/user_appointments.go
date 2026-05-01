package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/repository"
)

// UserAppointmentItem is a single appointment DTO for the client's profile view.
type UserAppointmentItem struct {
	ID          uuid.UUID  `json:"id"`
	SalonID     *uuid.UUID `json:"salonId,omitempty"`
	SalonName   string     `json:"salonName"`
	ServiceName string    `json:"serviceName"`
	MasterName  *string   `json:"masterName"`
	StartsAt    string    `json:"startsAt"` // RFC3339
	EndsAt      string    `json:"endsAt"`   // RFC3339
	Status      string    `json:"status"`
	PriceCents  *int64    `json:"priceCents"`
	ClientNote  *string   `json:"clientNote"`
}

// UserAppointmentsResult is the paginated response for GET /api/v1/me/appointments.
type UserAppointmentsResult struct {
	Items    []UserAppointmentItem `json:"items"`
	Total    int64                 `json:"total"`
	Page     int                   `json:"page"`
	PageSize int                   `json:"pageSize"`
}

// UserAppointmentService exposes read-only appointment data to authenticated clients.
type UserAppointmentService interface {
	ListMyAppointments(ctx context.Context, userID uuid.UUID, page, pageSize int) (*UserAppointmentsResult, error)
}

type userAppointmentService struct {
	repo repository.UserAppointmentRepository
}

// NewUserAppointmentService constructs UserAppointmentService.
func NewUserAppointmentService(repo repository.UserAppointmentRepository) UserAppointmentService {
	return &userAppointmentService{repo: repo}
}

func (s *userAppointmentService) ListMyAppointments(
	ctx context.Context,
	userID uuid.UUID,
	page, pageSize int,
) (*UserAppointmentsResult, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}

	rows, total, err := s.repo.ListUserAppointments(ctx, repository.UserAppointmentFilter{
		UserID:   userID,
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		return nil, err
	}

	items := make([]UserAppointmentItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, UserAppointmentItem{
			ID:          r.ID,
			SalonID:     r.SalonID,
			SalonName:   r.SalonName,
			ServiceName: r.ServiceName,
			MasterName:  r.MasterName,
			StartsAt:    r.StartsAt.UTC().Format("2006-01-02T15:04:05Z"),
			EndsAt:      r.EndsAt.UTC().Format("2006-01-02T15:04:05Z"),
			Status:      r.Status,
			PriceCents:  r.PriceCents,
			ClientNote:  r.ClientNote,
		})
	}

	return &UserAppointmentsResult{
		Items:    items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}
