package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

// MasterDashboardService is the authenticated master cabinet API.
type MasterDashboardService interface {
	MyProfile(ctx context.Context, userID uuid.UUID) (*MasterProfileCabinetDTO, error)
	UpdateMyProfile(ctx context.Context, userID uuid.UUID, in UpdateMasterProfileCabinetInput) (*MasterProfileCabinetDTO, error)
	ListInvites(ctx context.Context, userID uuid.UUID) ([]MasterInviteDTO, error)
	AcceptInvite(ctx context.Context, userID, salonMasterID uuid.UUID) error
	DeclineInvite(ctx context.Context, userID, salonMasterID uuid.UUID) error
	ListSalons(ctx context.Context, userID uuid.UUID) ([]MasterSalonMembershipDTO, error)
	ListAppointments(ctx context.Context, userID uuid.UUID, from, to *time.Time, status string) ([]MasterAppointmentDTO, int64, error)
}

// MasterProfileCabinetDTO is GET/PUT /master-dashboard/profile.
type MasterProfileCabinetDTO struct {
	ID              uuid.UUID `json:"id"`
	DisplayName     string    `json:"displayName"`
	Bio             *string   `json:"bio,omitempty"`
	Specializations []string  `json:"specializations"`
	YearsExperience *int      `json:"yearsExperience,omitempty"`
	AvatarURL       *string   `json:"avatarUrl,omitempty"`
	PhoneE164       string    `json:"phoneE164"`
}

// UpdateMasterProfileCabinetInput is PUT /master-dashboard/profile body.
type UpdateMasterProfileCabinetInput struct {
	DisplayName     string   `json:"displayName"`
	Bio             *string  `json:"bio"`
	Specializations []string `json:"specializations"`
	YearsExperience *int     `json:"yearsExperience"`
	AvatarURL       *string  `json:"avatarUrl"`
}

// MasterInviteDTO is GET /master-dashboard/invites item.
type MasterInviteDTO struct {
	SalonMasterID uuid.UUID `json:"salonMasterId"`
	SalonID       uuid.UUID `json:"salonId"`
	SalonName     string    `json:"salonName"`
	SalonAddress  *string   `json:"salonAddress,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
}

// MasterSalonMembershipDTO is GET /master-dashboard/salons item.
type MasterSalonMembershipDTO struct {
	SalonMasterID uuid.UUID  `json:"salonMasterId"`
	SalonID       uuid.UUID  `json:"salonId"`
	SalonName     string     `json:"salonName"`
	SalonAddress  *string    `json:"salonAddress,omitempty"`
	JoinedAt      *time.Time `json:"joinedAt,omitempty"`
}

// MasterAppointmentDTO is GET /master-dashboard/appointments item.
type MasterAppointmentDTO struct {
	ID            uuid.UUID  `json:"id"`
	SalonID       uuid.UUID  `json:"salonId"`
	SalonName     string     `json:"salonName"`
	StartsAt      time.Time  `json:"startsAt"`
	EndsAt        time.Time  `json:"endsAt"`
	Status        string     `json:"status"`
	ServiceName   string     `json:"serviceName"`
	ClientLabel   string     `json:"clientLabel"`
	ClientPhone   *string    `json:"clientPhone,omitempty"`
	ServiceID     uuid.UUID  `json:"serviceId"`
	SalonMasterID *uuid.UUID `json:"salonMasterId,omitempty"`
}

type masterDashboardService struct {
	repo repository.MasterDashboardRepository
}

// NewMasterDashboardService constructs MasterDashboardService.
func NewMasterDashboardService(repo repository.MasterDashboardRepository) MasterDashboardService {
	return &masterDashboardService{repo: repo}
}

func (s *masterDashboardService) masterProfileID(ctx context.Context, userID uuid.UUID) (uuid.UUID, error) {
	id, err := s.repo.FindMasterProfileIDByUserID(ctx, userID)
	if err != nil {
		return uuid.Nil, err
	}
	if id == nil {
		return uuid.Nil, nil
	}
	return *id, nil
}

func (s *masterDashboardService) MyProfile(ctx context.Context, userID uuid.UUID) (*MasterProfileCabinetDTO, error) {
	mp, err := s.repo.GetMasterProfileByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mp == nil {
		return nil, nil
	}
	return masterProfileToDTO(mp), nil
}

func masterProfileToDTO(mp *model.MasterProfile) *MasterProfileCabinetDTO {
	specs := []string(mp.Specializations)
	if specs == nil {
		specs = []string{}
	}
	phone := ""
	if mp.PhoneE164 != nil {
		phone = *mp.PhoneE164
	}
	return &MasterProfileCabinetDTO{
		ID:              mp.ID,
		DisplayName:     mp.DisplayName,
		Bio:             mp.Bio,
		Specializations: specs,
		YearsExperience: mp.YearsExperience,
		AvatarURL:       mp.AvatarURL,
		PhoneE164:       phone,
	}
}

func (s *masterDashboardService) UpdateMyProfile(ctx context.Context, userID uuid.UUID, in UpdateMasterProfileCabinetInput) (*MasterProfileCabinetDTO, error) {
	if strings.TrimSpace(in.DisplayName) == "" {
		return nil, fmt.Errorf("displayName is required")
	}
	if in.Bio != nil && utf8.RuneCountInString(*in.Bio) > 300 {
		return nil, fmt.Errorf("bio exceeds 300 characters")
	}
	specs := in.Specializations
	if specs == nil {
		specs = []string{}
	}
	if err := s.repo.UpdateMasterProfileByUserID(ctx, userID, strings.TrimSpace(in.DisplayName), in.Bio, specs, in.YearsExperience, in.AvatarURL); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return s.MyProfile(ctx, userID)
}

func (s *masterDashboardService) ListInvites(ctx context.Context, userID uuid.UUID) ([]MasterInviteDTO, error) {
	mid, err := s.masterProfileID(ctx, userID)
	if err != nil || mid == uuid.Nil {
		return nil, err
	}
	rows, err := s.repo.ListPendingInvites(ctx, mid)
	if err != nil {
		return nil, err
	}
	out := make([]MasterInviteDTO, len(rows))
	for i, r := range rows {
		out[i] = MasterInviteDTO{
			SalonMasterID: r.SalonMasterID,
			SalonID:       r.SalonID,
			SalonName:     r.SalonName,
			SalonAddress:  r.SalonAddress,
			CreatedAt:     r.CreatedAt,
		}
	}
	return out, nil
}

func (s *masterDashboardService) AcceptInvite(ctx context.Context, userID, salonMasterID uuid.UUID) error {
	mid, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return err
	}
	if mid == uuid.Nil {
		return fmt.Errorf("no master profile")
	}
	ok, err := s.repo.AcceptPendingInvite(ctx, mid, salonMasterID)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("invite not found or not pending")
	}
	return nil
}

func (s *masterDashboardService) DeclineInvite(ctx context.Context, userID, salonMasterID uuid.UUID) error {
	mid, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return err
	}
	if mid == uuid.Nil {
		return fmt.Errorf("no master profile")
	}
	ok, err := s.repo.DeclinePendingInvite(ctx, mid, salonMasterID)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("invite not found or not pending")
	}
	return nil
}

func (s *masterDashboardService) ListSalons(ctx context.Context, userID uuid.UUID) ([]MasterSalonMembershipDTO, error) {
	mid, err := s.masterProfileID(ctx, userID)
	if err != nil || mid == uuid.Nil {
		return nil, err
	}
	rows, err := s.repo.ListActiveSalonMemberships(ctx, mid)
	if err != nil {
		return nil, err
	}
	out := make([]MasterSalonMembershipDTO, len(rows))
	for i, r := range rows {
		out[i] = MasterSalonMembershipDTO{
			SalonMasterID: r.SalonMasterID,
			SalonID:       r.SalonID,
			SalonName:     r.SalonName,
			SalonAddress:  r.SalonAddress,
			JoinedAt:      r.JoinedAt,
		}
	}
	return out, nil
}

func (s *masterDashboardService) ListAppointments(ctx context.Context, userID uuid.UUID, from, to *time.Time, status string) ([]MasterAppointmentDTO, int64, error) {
	mid, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	if mid == uuid.Nil {
		return []MasterAppointmentDTO{}, 0, nil
	}
	rows, total, err := s.repo.ListMasterAppointments(ctx, repository.MasterAppointmentListFilter{
		MasterProfileID: mid,
		From:            from,
		To:              to,
		Status:          status,
		Limit:           50,
	})
	if err != nil {
		return nil, 0, err
	}
	out := make([]MasterAppointmentDTO, len(rows))
	for i, row := range rows {
		a := row.Appointment
		out[i] = MasterAppointmentDTO{
			ID:            a.ID,
			SalonID:       a.SalonID,
			SalonName:     row.SalonName,
			StartsAt:      a.StartsAt,
			EndsAt:        a.EndsAt,
			Status:        a.Status,
			ServiceName:   row.ServiceName,
			ClientLabel:   row.ClientLabel,
			ClientPhone:   row.ClientPhone,
			ServiceID:     a.ServiceID,
			SalonMasterID: a.SalonMasterID,
		}
	}
	return out, total, nil
}
