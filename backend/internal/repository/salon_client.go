package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
)

// SalonClientListFilter filters the salon client list.
type SalonClientListFilter struct {
	Search         string
	TagIDs         []uuid.UUID
	Page           int
	PageSize       int
	IncludeDeleted bool
}

// SalonClientRow is one client with computed visit stats.
type SalonClientRow struct {
	Client      model.SalonClient
	Tags        []model.SalonClientTag
	VisitCount  int64
	LastVisitAt *time.Time
	// Populated when user_id is set.
	UserPhone       *string
	UserDisplayName *string
}

// SalonClientRepository reads/writes salon client data.
type SalonClientRepository interface {
	ListBysalon(ctx context.Context, salonID uuid.UUID, f SalonClientListFilter) ([]SalonClientRow, int64, error)
	GetByID(ctx context.Context, salonID, clientID uuid.UUID) (*SalonClientRow, error)
	Create(ctx context.Context, c *model.SalonClient) error
	Update(ctx context.Context, c *model.SalonClient) error
	SoftDelete(ctx context.Context, salonID, clientID uuid.UUID) error
	Restore(ctx context.Context, salonID, clientID uuid.UUID) (*SalonClientRow, error)

	GetOrCreateByPhone(ctx context.Context, salonID uuid.UUID, phone, displayName string) (*model.SalonClient, error)
	GetOrCreateByUserID(ctx context.Context, salonID, userID uuid.UUID, displayName string) (*model.SalonClient, error)
	MergeGuestToUser(ctx context.Context, salonID, clientID, userID uuid.UUID) (*model.SalonClient, error)

	ListTags(ctx context.Context, salonID uuid.UUID) ([]model.SalonClientTag, error)
	CreateTag(ctx context.Context, t *model.SalonClientTag) error
	AssignTag(ctx context.Context, salonClientID, tagID uuid.UUID) error
	RemoveTag(ctx context.Context, salonClientID, tagID uuid.UUID) error

	ListClientAppointments(ctx context.Context, salonID, clientID uuid.UUID, page, pageSize int) ([]AppointmentListRow, int64, error)
}
