package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
)

// SalonClientService is the business logic for salon client profiles.
type SalonClientService interface {
	ListClients(ctx context.Context, salonID uuid.UUID, f repository.SalonClientListFilter) ([]repository.SalonClientRow, int64, error)
	GetClient(ctx context.Context, salonID, clientID uuid.UUID) (*repository.SalonClientRow, error)
	CreateClient(ctx context.Context, salonID uuid.UUID, displayName, phoneE164 string) (*repository.SalonClientRow, error)
	UpdateClient(ctx context.Context, salonID, clientID uuid.UUID, displayName *string, notes *string, phoneE164 *string, extraContact *string) (*repository.SalonClientRow, error)
	DeleteClient(ctx context.Context, salonID, clientID uuid.UUID) error
	RestoreClient(ctx context.Context, salonID, clientID uuid.UUID) (*repository.SalonClientRow, error)
	MergeToUser(ctx context.Context, salonID, clientID, userID uuid.UUID) (*model.SalonClient, error)

	GetOrCreateByPhone(ctx context.Context, salonID uuid.UUID, phone, name string) (*model.SalonClient, error)
	GetOrCreateByUserID(ctx context.Context, salonID, userID uuid.UUID, displayName string) (*model.SalonClient, error)

	ListTags(ctx context.Context, salonID uuid.UUID) ([]model.SalonClientTag, error)
	CreateTag(ctx context.Context, salonID uuid.UUID, name, color string) (*model.SalonClientTag, error)
	AssignTag(ctx context.Context, salonID, clientID, tagID uuid.UUID) error
	RemoveTag(ctx context.Context, salonID, clientID, tagID uuid.UUID) error

	ListClientAppointments(ctx context.Context, salonID, clientID uuid.UUID, page, pageSize int) ([]repository.AppointmentListRow, int64, error)
}

type salonClientService struct {
	repo repository.SalonClientRepository
}

// NewSalonClientService constructs SalonClientService.
func NewSalonClientService(repo repository.SalonClientRepository) SalonClientService {
	return &salonClientService{repo: repo}
}

func (s *salonClientService) ListClients(ctx context.Context, salonID uuid.UUID, f repository.SalonClientListFilter) ([]repository.SalonClientRow, int64, error) {
	return s.repo.ListBysalon(ctx, salonID, f)
}

func (s *salonClientService) GetClient(ctx context.Context, salonID, clientID uuid.UUID) (*repository.SalonClientRow, error) {
	row, err := s.repo.GetByID(ctx, salonID, clientID)
	if err != nil {
		return nil, err
	}
	if row == nil {
		return nil, nil
	}
	return row, nil
}

func (s *salonClientService) CreateClient(ctx context.Context, salonID uuid.UUID, displayName, phoneE164 string) (*repository.SalonClientRow, error) {
	displayName = strings.TrimSpace(displayName)
	if displayName == "" {
		return nil, fmt.Errorf("display_name is required")
	}
	c := &model.SalonClient{
		SalonID:     salonID,
		DisplayName: displayName,
	}
	if p := strings.TrimSpace(phoneE164); p != "" {
		c.PhoneE164 = &p
	}
	if err := s.repo.Create(ctx, c); err != nil {
		return nil, err
	}
	return s.repo.GetByID(ctx, salonID, c.ID)
}

func (s *salonClientService) UpdateClient(ctx context.Context, salonID, clientID uuid.UUID, displayName *string, notes *string, phoneE164 *string, extraContact *string) (*repository.SalonClientRow, error) {
	row, err := s.repo.GetByID(ctx, salonID, clientID)
	if err != nil {
		return nil, err
	}
	if row == nil {
		return nil, fmt.Errorf("client not found")
	}
	c := row.Client
	if displayName != nil {
		n := strings.TrimSpace(*displayName)
		if n == "" {
			return nil, fmt.Errorf("display_name cannot be empty")
		}
		c.DisplayName = n
	}
	if notes != nil {
		c.Notes = notes
	}
	if phoneE164 != nil {
		if c.UserID != nil {
			return nil, fmt.Errorf("phone cannot be edited for registered client")
		}
		normalized := normalizePhoneE164Ptr(phoneE164)
		if normalized == nil {
			return nil, fmt.Errorf("invalid phone format")
		}
		c.PhoneE164 = normalized
	}
	if extraContact != nil {
		v := strings.TrimSpace(*extraContact)
		if c.UserID == nil && v != "" {
			return nil, fmt.Errorf("extra_contact is available only for registered client")
		}
		if v == "" {
			c.ExtraContact = nil
		} else {
			c.ExtraContact = &v
		}
	}
	if err := s.repo.Update(ctx, &c); err != nil {
		return nil, err
	}
	return s.repo.GetByID(ctx, salonID, clientID)
}

func (s *salonClientService) DeleteClient(ctx context.Context, salonID, clientID uuid.UUID) error {
	return s.repo.SoftDelete(ctx, salonID, clientID)
}

func (s *salonClientService) RestoreClient(ctx context.Context, salonID, clientID uuid.UUID) (*repository.SalonClientRow, error) {
	return s.repo.Restore(ctx, salonID, clientID)
}

func (s *salonClientService) MergeToUser(ctx context.Context, salonID, clientID, userID uuid.UUID) (*model.SalonClient, error) {
	c, err := s.repo.MergeGuestToUser(ctx, salonID, clientID, userID)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, fmt.Errorf("client not found")
	}
	return c, nil
}

func (s *salonClientService) GetOrCreateByPhone(ctx context.Context, salonID uuid.UUID, phone, name string) (*model.SalonClient, error) {
	return s.repo.GetOrCreateByPhone(ctx, salonID, phone, name)
}

func (s *salonClientService) GetOrCreateByUserID(ctx context.Context, salonID, userID uuid.UUID, displayName string) (*model.SalonClient, error) {
	return s.repo.GetOrCreateByUserID(ctx, salonID, userID, displayName)
}

func (s *salonClientService) ListTags(ctx context.Context, salonID uuid.UUID) ([]model.SalonClientTag, error) {
	return s.repo.ListTags(ctx, salonID)
}

func (s *salonClientService) CreateTag(ctx context.Context, salonID uuid.UUID, name, color string) (*model.SalonClientTag, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("tag name is required")
	}
	color = strings.TrimSpace(color)
	if color == "" {
		return nil, fmt.Errorf("tag color is required")
	}
	t := &model.SalonClientTag{
		SalonID: &salonID,
		Name:    name,
		Color:   color,
	}
	if err := s.repo.CreateTag(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *salonClientService) AssignTag(ctx context.Context, salonID, clientID, tagID uuid.UUID) error {
	row, err := s.repo.GetByID(ctx, salonID, clientID)
	if err != nil {
		return err
	}
	if row == nil {
		return fmt.Errorf("client not found")
	}
	return s.repo.AssignTag(ctx, clientID, tagID)
}

func (s *salonClientService) RemoveTag(ctx context.Context, salonID, clientID, tagID uuid.UUID) error {
	row, err := s.repo.GetByID(ctx, salonID, clientID)
	if err != nil {
		return err
	}
	if row == nil {
		return fmt.Errorf("client not found")
	}
	return s.repo.RemoveTag(ctx, clientID, tagID)
}

func (s *salonClientService) ListClientAppointments(ctx context.Context, salonID, clientID uuid.UUID, page, pageSize int) ([]repository.AppointmentListRow, int64, error) {
	return s.repo.ListClientAppointments(ctx, salonID, clientID, page, pageSize)
}
