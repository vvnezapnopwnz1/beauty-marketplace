package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
)

// DashboardServiceRepository handles salon service persistence for the dashboard.
type DashboardServiceRepository interface {
	ListServices(ctx context.Context, salonID uuid.UUID) ([]model.SalonService, error)
	ListSalonCategoryScopes(ctx context.Context, salonID uuid.UUID) ([]string, error)
	ReplaceSalonCategoryScopes(ctx context.Context, salonID uuid.UUID, parentSlugs []string) error
	ListSystemServiceCategories(ctx context.Context) ([]model.ServiceCategory, error)
	GetSystemServiceCategoryBySlug(ctx context.Context, slug string) (*model.ServiceCategory, error)
	CreateService(ctx context.Context, s *model.SalonService) error
	UpdateService(ctx context.Context, s *model.SalonService) error
	SoftDeleteService(ctx context.Context, salonID, serviceID uuid.UUID) error
	GetService(ctx context.Context, salonID, serviceID uuid.UUID) (*model.SalonService, error)
}
