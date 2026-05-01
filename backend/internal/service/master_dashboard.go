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
	ListAppointments(ctx context.Context, userID uuid.UUID, from, to *time.Time, status string, page, pageSize int) ([]MasterAppointmentDTO, int64, error)
	CreatePersonalAppointment(ctx context.Context, userID uuid.UUID, in ManualAppointmentInput) (*model.Appointment, error)
	UpdatePersonalAppointment(ctx context.Context, userID uuid.UUID, in UpdateAppointmentInput) error

	// MasterServices
	ListMasterServices(ctx context.Context, userID uuid.UUID) ([]MasterServiceDTO, error)
	CreateMasterService(ctx context.Context, userID uuid.UUID, in CreateMasterServiceInput) (*MasterServiceDTO, error)
	UpdateMasterService(ctx context.Context, userID uuid.UUID, serviceID uuid.UUID, in CreateMasterServiceInput) (*MasterServiceDTO, error)
	DeleteMasterService(ctx context.Context, userID uuid.UUID, serviceID uuid.UUID) error

	// MasterClients
	ListMasterClients(ctx context.Context, userID uuid.UUID) ([]MasterClientDTO, error)
	CreateMasterClient(ctx context.Context, userID uuid.UUID, in CreateMasterClientInput) (*MasterClientDTO, error)
	UpdateMasterClient(ctx context.Context, userID uuid.UUID, clientID uuid.UUID, in CreateMasterClientInput) (*MasterClientDTO, error)
	DeleteMasterClient(ctx context.Context, userID uuid.UUID, clientID uuid.UUID) error
}

type MasterClientDTO struct {
	ID           uuid.UUID  `json:"id"`
	UserID       *uuid.UUID `json:"userId,omitempty"`
	PhoneE164    *string    `json:"phone,omitempty"`
	DisplayName  string     `json:"displayName"`
	Notes        *string    `json:"notes,omitempty"`
	ExtraContact *string    `json:"extraContact,omitempty"`
}

type CreateMasterClientInput struct {
	DisplayName  string     `json:"displayName"`
	PhoneE164    *string    `json:"phone"`
	Notes        *string    `json:"notes"`
	ExtraContact *string    `json:"extraContact"`
	UserID       *uuid.UUID `json:"userId"`
}

type MasterServiceDTO struct {
	ID              uuid.UUID `json:"id"`
	Name            string    `json:"name"`
	CategorySlug    *string   `json:"categorySlug,omitempty"`
	Description     *string   `json:"description,omitempty"`
	PriceCents      *int      `json:"priceCents,omitempty"`
	DurationMinutes int       `json:"durationMinutes"`
	IsActive        bool      `json:"isActive"`
}

type CreateMasterServiceInput struct {
	Name            string  `json:"name"`
	CategorySlug    *string `json:"categorySlug"`
	Description     *string `json:"description"`
	PriceCents      *int    `json:"priceCents"`
	DurationMinutes int     `json:"durationMinutes"`
}

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
	SalonID       *uuid.UUID `json:"salonId,omitempty"`
	SalonName     *string    `json:"salonName,omitempty"`
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
	repo   repository.MasterDashboardRepository
	appts  repository.AppointmentRepository
	salons repository.SalonRepository
}

// NewMasterDashboardService constructs MasterDashboardService.
func NewMasterDashboardService(
	repo repository.MasterDashboardRepository,
	appts repository.AppointmentRepository,
	salons repository.SalonRepository,
) MasterDashboardService {
	return &masterDashboardService{
		repo:   repo,
		appts:  appts,
		salons: salons,
	}
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

func (s *masterDashboardService) ListAppointments(ctx context.Context, userID uuid.UUID, from, to *time.Time, status string, page, pageSize int) ([]MasterAppointmentDTO, int64, error) {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	if mpID == uuid.Nil {
		return nil, 0, nil
	}

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 50
	}

	rows, total, err := s.repo.ListMasterAppointments(ctx, repository.MasterAppointmentListFilter{
		MasterProfileID: mpID,
		From:            from,
		To:              to,
		Status:          status,
		Limit:           pageSize,
		Offset:          (page - 1) * pageSize,
	})
	if err != nil {
		return nil, 0, err
	}
	out := make([]MasterAppointmentDTO, len(rows))
	for i, row := range rows {
		a := row.Appointment
		sn := row.SalonName
		var salonNamePtr *string
		if sn != "" {
			salonNamePtr = &sn
		}
		out[i] = MasterAppointmentDTO{
			ID:            a.ID,
			SalonID:       a.SalonID,
			SalonName:     salonNamePtr,
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

func (s *masterDashboardService) CreatePersonalAppointment(ctx context.Context, userID uuid.UUID, in ManualAppointmentInput) (*model.Appointment, error) {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mpID == uuid.Nil {
		return nil, fmt.Errorf("master profile required")
	}

	if len(in.ServiceIDs) == 0 {
		return nil, fmt.Errorf("at least one service is required")
	}

	var services []model.MasterService
	var totalDuration int
	for _, sid := range in.ServiceIDs {
		svc, err := s.repo.GetMasterService(ctx, mpID, sid)
		if err != nil {
			return nil, err
		}
		if svc == nil || !svc.IsActive {
			return nil, fmt.Errorf("personal service %s not found", sid)
		}
		services = append(services, *svc)
		totalDuration += svc.DurationMinutes
	}

	name := strings.TrimSpace(in.GuestName)
	phone := strings.TrimSpace(in.GuestPhone)
	// For personal appointments, we don't strictly enforce phone E164 but let's keep it consistent
	// if the frontend sends it.

	primaryServiceID := services[0].ID
	end := in.StartsAt.Add(time.Duration(totalDuration) * time.Minute)

	ap := &model.Appointment{
		ID:              uuid.New(),
		MasterProfileID: &mpID,
		ServiceID:       primaryServiceID,
		ClientUserID:    in.ClientUserID,
		GuestName:       &name,
		GuestPhoneE164:  &phone,
		StartsAt:        in.StartsAt.UTC(),
		EndsAt:          end.UTC(),
		Status:          "pending",
	}
	if strings.TrimSpace(in.ClientNote) != "" {
		n := strings.TrimSpace(in.ClientNote)
		ap.ClientNote = &n
	}

	var lineItems []model.AppointmentLineItem
	for i, svc := range services {
		li := model.AppointmentLineItem{
			AppointmentID:   ap.ID,
			ServiceID:       svc.ID,
			ServiceName:     svc.Name,
			DurationMinutes: svc.DurationMinutes,
			PriceCents:      0,
			SortOrder:       i,
		}
		if svc.PriceCents != nil {
			li.PriceCents = int64(*svc.PriceCents)
		}
		lineItems = append(lineItems, li)
	}

	if err := s.appts.CreateWithLineItems(ctx, ap, lineItems); err != nil {
		return nil, err
	}

	return ap, nil
}

func (s *masterDashboardService) UpdatePersonalAppointment(ctx context.Context, userID uuid.UUID, in UpdateAppointmentInput) error {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return err
	}
	if mpID == uuid.Nil {
		return fmt.Errorf("master profile required")
	}

	// For Update, we need to find the appointment by MasterProfileID
	a, err := s.appts.FindByID(ctx, in.AppointmentID)
	if err != nil {
		return err
	}
	if a == nil {
		return gorm.ErrRecordNotFound
	}
	if a.MasterProfileID == nil || *a.MasterProfileID != mpID {
		return fmt.Errorf("appointment not found or not personal")
	}

	if len(in.ServiceIDs) > 0 {
		var services []model.MasterService
		var totalDuration int
		for _, sid := range in.ServiceIDs {
			svc, err := s.repo.GetMasterService(ctx, mpID, sid)
			if err != nil {
				return err
			}
			if svc == nil {
				return fmt.Errorf("personal service %s not found", sid)
			}
			services = append(services, *svc)
			totalDuration += svc.DurationMinutes
		}
		a.ServiceID = services[0].ID

		var lineItems []model.AppointmentLineItem
		for i, svc := range services {
			li := model.AppointmentLineItem{
				AppointmentID:   a.ID,
				ServiceID:       svc.ID,
				ServiceName:     svc.Name,
				DurationMinutes: svc.DurationMinutes,
				PriceCents:      0,
				SortOrder:       i,
			}
			if svc.PriceCents != nil {
				li.PriceCents = int64(*svc.PriceCents)
			}
			lineItems = append(lineItems, li)
		}
		if err := s.appts.ReplaceAppointmentLineItems(ctx, a.ID, lineItems); err != nil {
			return err
		}
	}

	if in.StartsAt != nil {
		a.StartsAt = in.StartsAt.UTC()
	}
	if in.EndsAt != nil {
		a.EndsAt = in.EndsAt.UTC()
	}
	if in.ClientNote != nil {
		a.ClientNote = in.ClientNote
	}
	if in.GuestName != nil {
		a.GuestName = in.GuestName
	}
	if in.GuestPhone != nil {
		a.GuestPhoneE164 = in.GuestPhone
	}

	return s.appts.Update(ctx, a)
}

func (s *masterDashboardService) ListMasterServices(ctx context.Context, userID uuid.UUID) ([]MasterServiceDTO, error) {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mpID == uuid.Nil {
		return nil, nil
	}
	rows, err := s.repo.ListMasterServices(ctx, mpID)
	if err != nil {
		return nil, err
	}
	out := make([]MasterServiceDTO, len(rows))
	for i, r := range rows {
		out[i] = *masterServiceToDTO(&r)
	}
	return out, nil
}

func (s *masterDashboardService) CreateMasterService(ctx context.Context, userID uuid.UUID, in CreateMasterServiceInput) (*MasterServiceDTO, error) {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mpID == uuid.Nil {
		return nil, fmt.Errorf("master profile required")
	}

	m := &model.MasterService{
		ID:              uuid.New(),
		MasterID:        mpID,
		Name:            in.Name,
		CategorySlug:    in.CategorySlug,
		Description:     in.Description,
		PriceCents:      in.PriceCents,
		DurationMinutes: in.DurationMinutes,
		IsActive:        true,
	}
	if err := s.repo.CreateMasterService(ctx, m); err != nil {
		return nil, err
	}
	return masterServiceToDTO(m), nil
}

func (s *masterDashboardService) UpdateMasterService(ctx context.Context, userID uuid.UUID, serviceID uuid.UUID, in CreateMasterServiceInput) (*MasterServiceDTO, error) {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mpID == uuid.Nil {
		return nil, fmt.Errorf("master profile required")
	}

	m, err := s.repo.GetMasterService(ctx, mpID, serviceID)
	if err != nil {
		return nil, err
	}
	if m == nil {
		return nil, gorm.ErrRecordNotFound
	}

	m.Name = in.Name
	m.CategorySlug = in.CategorySlug
	m.Description = in.Description
	m.PriceCents = in.PriceCents
	m.DurationMinutes = in.DurationMinutes

	if err := s.repo.UpdateMasterService(ctx, m); err != nil {
		return nil, err
	}
	return masterServiceToDTO(m), nil
}

func (s *masterDashboardService) DeleteMasterService(ctx context.Context, userID uuid.UUID, serviceID uuid.UUID) error {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return err
	}
	if mpID == uuid.Nil {
		return fmt.Errorf("master profile required")
	}
	return s.repo.DeleteMasterService(ctx, mpID, serviceID)
}

func masterServiceToDTO(m *model.MasterService) *MasterServiceDTO {
	return &MasterServiceDTO{
		ID:              m.ID,
		Name:            m.Name,
		CategorySlug:    m.CategorySlug,
		Description:     m.Description,
		PriceCents:      m.PriceCents,
		DurationMinutes: m.DurationMinutes,
		IsActive:        m.IsActive,
	}
}
func (s *masterDashboardService) ListMasterClients(ctx context.Context, userID uuid.UUID) ([]MasterClientDTO, error) {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mpID == uuid.Nil {
		return nil, nil
	}
	rows, err := s.repo.ListMasterClients(ctx, mpID)
	if err != nil {
		return nil, err
	}
	out := make([]MasterClientDTO, len(rows))
	for i, r := range rows {
		out[i] = masterClientToDTO(&r)
	}
	return out, nil
}

func (s *masterDashboardService) CreateMasterClient(ctx context.Context, userID uuid.UUID, in CreateMasterClientInput) (*MasterClientDTO, error) {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mpID == uuid.Nil {
		return nil, fmt.Errorf("master profile required")
	}

	c := &model.MasterClient{
		ID:              uuid.New(),
		MasterProfileID: mpID,
		DisplayName:     in.DisplayName,
		PhoneE164:       in.PhoneE164,
		Notes:           in.Notes,
		ExtraContact:    in.ExtraContact,
		UserID:          in.UserID,
	}
	if err := s.repo.CreateMasterClient(ctx, c); err != nil {
		return nil, err
	}
	return masterClientToDTOPointer(c), nil
}

func (s *masterDashboardService) UpdateMasterClient(ctx context.Context, userID uuid.UUID, clientID uuid.UUID, in CreateMasterClientInput) (*MasterClientDTO, error) {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mpID == uuid.Nil {
		return nil, fmt.Errorf("master profile required")
	}

	c, err := s.repo.GetMasterClient(ctx, mpID, clientID)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, gorm.ErrRecordNotFound
	}

	c.DisplayName = in.DisplayName
	c.PhoneE164 = in.PhoneE164
	c.Notes = in.Notes
	c.ExtraContact = in.ExtraContact
	c.UserID = in.UserID

	if err := s.repo.UpdateMasterClient(ctx, c); err != nil {
		return nil, err
	}
	return masterClientToDTOPointer(c), nil
}

func (s *masterDashboardService) DeleteMasterClient(ctx context.Context, userID uuid.UUID, clientID uuid.UUID) error {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return err
	}
	if mpID == uuid.Nil {
		return fmt.Errorf("master profile required")
	}
	return s.repo.DeleteMasterClient(ctx, mpID, clientID)
}

func masterClientToDTO(m *model.MasterClient) MasterClientDTO {
	return MasterClientDTO{
		ID:           m.ID,
		UserID:       m.UserID,
		PhoneE164:    m.PhoneE164,
		DisplayName:  m.DisplayName,
		Notes:        m.Notes,
		ExtraContact: m.ExtraContact,
	}
}

func masterClientToDTOPointer(m *model.MasterClient) *MasterClientDTO {
	dto := masterClientToDTO(m)
	return &dto
}
