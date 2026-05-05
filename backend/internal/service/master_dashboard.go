package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
	"github.com/beauty-marketplace/backend/internal/repository"
	"github.com/beauty-marketplace/backend/internal/service/appointmentstatus"
	"github.com/beauty-marketplace/backend/internal/servicecategory"
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
	ListAppointments(ctx context.Context, userID uuid.UUID, from, to *time.Time, status, search, source, sortBy, sortDir string, page, pageSize int) ([]MasterAppointmentDTO, int64, error)
	CreatePersonalAppointment(ctx context.Context, userID uuid.UUID, in ManualAppointmentInput) (*model.Appointment, error)
	UpdatePersonalAppointment(ctx context.Context, userID uuid.UUID, in UpdateAppointmentInput) error
	PatchPersonalAppointmentStatus(ctx context.Context, userID, appointmentID uuid.UUID, newStatus string) error

	// MasterServices
	ListMasterServiceCategories(ctx context.Context) (*ServiceCategoriesResponse, error)
	ListMasterServices(ctx context.Context, userID uuid.UUID) ([]MasterServiceDTO, error)
	CreateMasterService(ctx context.Context, userID uuid.UUID, in CreateMasterServiceInput) (*MasterServiceDTO, error)
	UpdateMasterService(ctx context.Context, userID uuid.UUID, serviceID uuid.UUID, in CreateMasterServiceInput) (*MasterServiceDTO, error)
	DeleteMasterService(ctx context.Context, userID uuid.UUID, serviceID uuid.UUID) error

	// MasterClients
	ListMasterClients(ctx context.Context, userID uuid.UUID, search, sortBy, sortDir string, page, pageSize int) ([]MasterClientDTO, int64, error)
	CreateMasterClient(ctx context.Context, userID uuid.UUID, in CreateMasterClientInput) (*MasterClientDTO, error)
	UpdateMasterClient(ctx context.Context, userID uuid.UUID, clientID uuid.UUID, in CreateMasterClientInput) (*MasterClientDTO, error)
	DeleteMasterClient(ctx context.Context, userID uuid.UUID, clientID uuid.UUID) error

	ListExpenseCategories(ctx context.Context, userID uuid.UUID) ([]MasterExpenseCategoryDTO, error)
	CreateExpenseCategory(ctx context.Context, userID uuid.UUID, in CreateMasterExpenseCategoryInput) (*MasterExpenseCategoryDTO, error)
	UpdateExpenseCategory(ctx context.Context, userID uuid.UUID, categoryID uuid.UUID, in CreateMasterExpenseCategoryInput) (*MasterExpenseCategoryDTO, error)
	DeleteExpenseCategory(ctx context.Context, userID uuid.UUID, categoryID uuid.UUID) error

	ListExpenses(ctx context.Context, userID uuid.UUID, from, to *time.Time, page, pageSize int) (*MasterExpenseListResponse, error)
	CreateExpense(ctx context.Context, userID uuid.UUID, in CreateMasterExpenseInput) (*MasterExpenseDTO, error)
	UpdateExpense(ctx context.Context, userID uuid.UUID, expenseID uuid.UUID, in CreateMasterExpenseInput) (*MasterExpenseDTO, error)
	DeleteExpense(ctx context.Context, userID uuid.UUID, expenseID uuid.UUID) error

	GetFinanceSummary(ctx context.Context, userID uuid.UUID, source string, from, to *time.Time) (*FinanceSummaryDTO, error)
	GetFinanceTrend(ctx context.Context, userID uuid.UUID, source string, from, to *time.Time) ([]FinanceTrendPointDTO, error)
	GetTopServices(ctx context.Context, userID uuid.UUID, source string, from, to *time.Time) ([]FinanceTopServiceDTO, error)
	ExportNpdReport(ctx context.Context, userID uuid.UUID, month string) (map[string]any, error)
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
	ID              uuid.UUID  `json:"id"`
	SalonID         *uuid.UUID `json:"salonId,omitempty"`
	SalonName       *string    `json:"salonName,omitempty"`
	StartsAt        time.Time  `json:"startsAt"`
	EndsAt          time.Time  `json:"endsAt"`
	Status          string     `json:"status"`
	ServiceName     string     `json:"serviceName"`
	ClientLabel     string     `json:"clientLabel"`
	ClientPhone     *string    `json:"clientPhone,omitempty"`
	ClientNote      *string    `json:"clientNote,omitempty"`
	ServiceID       uuid.UUID  `json:"serviceId"`
	SalonMasterID   *uuid.UUID `json:"salonMasterId,omitempty"`
	TotalPriceCents int64      `json:"totalPriceCents"`
}

type MasterExpenseCategoryDTO struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Emoji     string    `json:"emoji"`
	SortOrder int       `json:"sortOrder"`
	CreatedAt time.Time `json:"createdAt"`
}

type MasterExpenseDTO struct {
	ID            uuid.UUID  `json:"id"`
	CategoryID    *uuid.UUID `json:"categoryId,omitempty"`
	CategoryName  *string    `json:"categoryName,omitempty"`
	AppointmentID *uuid.UUID `json:"appointmentId,omitempty"`
	AmountCents   int        `json:"amountCents"`
	Description   string     `json:"description"`
	ExpenseDate   string     `json:"expenseDate"`
	CreatedAt     time.Time  `json:"createdAt"`
}

type MasterExpenseListResponse struct {
	Items []MasterExpenseDTO `json:"items"`
	Total int64              `json:"total"`
}

type FinanceSummaryDTO struct {
	IncomeCents  int64 `json:"incomeCents"`
	ExpenseCents int64 `json:"expenseCents"`
	ProfitCents  int64 `json:"profitCents"`
}

type FinanceTrendPointDTO struct {
	Date         string `json:"date"`
	IncomeCents  int64  `json:"incomeCents"`
	ExpenseCents int64  `json:"expenseCents"`
}

type FinanceTopServiceDTO struct {
	ServiceName string `json:"serviceName"`
	IncomeCents int64  `json:"incomeCents"`
}

type CreateMasterExpenseCategoryInput struct {
	Name  string  `json:"name"`
	Emoji *string `json:"emoji,omitempty"`
}

type CreateMasterExpenseInput struct {
	CategoryID    *uuid.UUID `json:"categoryId,omitempty"`
	AppointmentID *uuid.UUID `json:"appointmentId,omitempty"`
	AmountCents   int        `json:"amountCents"`
	Description   *string    `json:"description,omitempty"`
	ExpenseDate   string     `json:"expenseDate"`
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

func (s *masterDashboardService) ListAppointments(ctx context.Context, userID uuid.UUID, from, to *time.Time, status, search, source, sortBy, sortDir string, page, pageSize int) ([]MasterAppointmentDTO, int64, error) {
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
		Search:          search,
		Source:          source,
		SortBy:          sortBy,
		SortDir:         sortDir,
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
			ID:              a.ID,
			SalonID:         a.SalonID,
			SalonName:       salonNamePtr,
			StartsAt:        a.StartsAt,
			EndsAt:          a.EndsAt,
			Status:          a.Status,
			ServiceName:     row.ServiceName,
			ClientLabel:     row.ClientLabel,
			ClientPhone:     row.ClientPhone,
			ClientNote:      a.ClientNote,
			ServiceID:       a.ServiceID,
			SalonMasterID:   a.SalonMasterID,
			TotalPriceCents: row.TotalPriceCents,
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

func strFromPtr(p *string) string {
	if p == nil {
		return ""
	}
	return strings.TrimSpace(*p)
}

func personalAppointmentEnd(start time.Time, overrideStart *time.Time, totalDurationMinutes int) time.Time {
	base := start
	if overrideStart != nil {
		base = overrideStart.UTC()
	}
	return base.Add(time.Duration(totalDurationMinutes) * time.Minute).UTC()
}

func (s *masterDashboardService) assertPersonalMasterAppointment(a *model.Appointment, mpID uuid.UUID) error {
	if a.SalonID != nil {
		return fmt.Errorf("appointment is not personal")
	}
	if a.MasterProfileID == nil || *a.MasterProfileID != mpID {
		return fmt.Errorf("appointment not found or not personal")
	}
	return nil
}

func (s *masterDashboardService) PatchPersonalAppointmentStatus(ctx context.Context, userID, appointmentID uuid.UUID, newStatus string) error {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return err
	}
	if mpID == uuid.Nil {
		return fmt.Errorf("master profile required")
	}
	a, err := s.appts.FindByID(ctx, appointmentID)
	if err != nil {
		return err
	}
	if a == nil {
		return gorm.ErrRecordNotFound
	}
	if err := s.assertPersonalMasterAppointment(a, mpID); err != nil {
		return err
	}
	if !appointmentstatus.AllowedTransition(a.Status, newStatus) {
		return fmt.Errorf("invalid status transition")
	}
	return s.appts.UpdateStatusForPersonalMaster(ctx, appointmentID, mpID, newStatus)
}

func (s *masterDashboardService) UpdatePersonalAppointment(ctx context.Context, userID uuid.UUID, in UpdateAppointmentInput) error {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return err
	}
	if mpID == uuid.Nil {
		return fmt.Errorf("master profile required")
	}

	a, err := s.appts.FindByID(ctx, in.AppointmentID)
	if err != nil {
		return err
	}
	if a == nil {
		return gorm.ErrRecordNotFound
	}
	if err := s.assertPersonalMasterAppointment(a, mpID); err != nil {
		return err
	}
	if a.Status != "pending" && a.Status != "confirmed" {
		return fmt.Errorf("appointment cannot be edited in current status")
	}

	hasStructuralChanges := len(in.ServiceIDs) > 0 ||
		in.StartsAt != nil || in.EndsAt != nil ||
		(in.GuestName != nil && strings.TrimSpace(*in.GuestName) != strFromPtr(a.GuestName)) ||
		(in.GuestPhone != nil && strings.TrimSpace(*in.GuestPhone) != strFromPtr(a.GuestPhoneE164))

	var servicesUpdated bool
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
		if in.EndsAt == nil {
			a.EndsAt = personalAppointmentEnd(a.StartsAt, in.StartsAt, totalDuration)
		}
		servicesUpdated = true
	}

	if in.StartsAt != nil {
		oldStart := a.StartsAt
		a.StartsAt = in.StartsAt.UTC()
		if in.EndsAt == nil && !servicesUpdated {
			dur := a.EndsAt.Sub(oldStart)
			a.EndsAt = a.StartsAt.Add(dur)
		}
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

	if a.EndsAt.Before(a.StartsAt) {
		return fmt.Errorf("ends_at before starts_at")
	}
	if a.Status == "confirmed" && hasStructuralChanges {
		a.Status = "pending"
	}
	return s.appts.Update(ctx, a)
}

func (s *masterDashboardService) ListMasterServiceCategories(ctx context.Context) (*ServiceCategoriesResponse, error) {
	rows, err := s.repo.ListSystemServiceCategories(ctx)
	if err != nil {
		return nil, err
	}
	byParent := make(map[string][]model.ServiceCategory)
	for _, r := range rows {
		byParent[r.ParentSlug] = append(byParent[r.ParentSlug], r)
	}
	out := &ServiceCategoriesResponse{
		Groups: make([]ServiceCategoryGroupDTO, 0),
	}
	for _, ps := range servicecategory.ParentSlugs {
		items := byParent[ps]
		if len(items) == 0 {
			continue
		}
		g := ServiceCategoryGroupDTO{
			ParentSlug: ps,
			Label:      servicecategory.ParentSlugLabelRu(ps),
			Items:      make([]ServiceCategoryItemDTO, 0, len(items)),
		}
		for _, it := range items {
			g.Items = append(g.Items, ServiceCategoryItemDTO{
				Slug: it.Slug, NameRu: it.NameRu, ParentSlug: it.ParentSlug, SortOrder: it.SortOrder,
			})
		}
		out.Groups = append(out.Groups, g)
	}
	return out, nil
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
func (s *masterDashboardService) ListMasterClients(ctx context.Context, userID uuid.UUID, search, sortBy, sortDir string, page, pageSize int) ([]MasterClientDTO, int64, error) {
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
	rows, total, err := s.repo.ListMasterClients(ctx, repository.MasterClientListFilter{
		MasterProfileID: mpID,
		Search:          search,
		SortBy:          sortBy,
		SortDir:         sortDir,
		Limit:           pageSize,
		Offset:          (page - 1) * pageSize,
	})
	if err != nil {
		return nil, 0, err
	}
	out := make([]MasterClientDTO, len(rows))
	for i, r := range rows {
		out[i] = masterClientToDTO(&r)
	}
	return out, total, nil
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

func (s *masterDashboardService) ListExpenseCategories(ctx context.Context, userID uuid.UUID) ([]MasterExpenseCategoryDTO, error) {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mpID == uuid.Nil {
		return nil, fmt.Errorf("master profile required")
	}
	rows, err := s.repo.ListMasterExpenseCategories(ctx, mpID)
	if err != nil {
		return nil, err
	}
	out := make([]MasterExpenseCategoryDTO, len(rows))
	for i, row := range rows {
		out[i] = MasterExpenseCategoryDTO{
			ID:        row.ID,
			Name:      row.Name,
			Emoji:     row.Emoji,
			SortOrder: row.SortOrder,
			CreatedAt: row.CreatedAt,
		}
	}
	return out, nil
}

func (s *masterDashboardService) CreateExpenseCategory(ctx context.Context, userID uuid.UUID, in CreateMasterExpenseCategoryInput) (*MasterExpenseCategoryDTO, error) {
	if strings.TrimSpace(in.Name) == "" {
		return nil, fmt.Errorf("name is required")
	}
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mpID == uuid.Nil {
		return nil, fmt.Errorf("master profile required")
	}
	category := &model.MasterExpenseCategory{
		MasterProfileID: mpID,
		Name:            strings.TrimSpace(in.Name),
		Emoji:           strings.TrimSpace(ptrToString(in.Emoji)),
	}
	if err := s.repo.CreateMasterExpenseCategory(ctx, category); err != nil {
		return nil, err
	}
	return &MasterExpenseCategoryDTO{
		ID:        category.ID,
		Name:      category.Name,
		Emoji:     category.Emoji,
		SortOrder: category.SortOrder,
		CreatedAt: category.CreatedAt,
	}, nil
}

func (s *masterDashboardService) UpdateExpenseCategory(ctx context.Context, userID uuid.UUID, categoryID uuid.UUID, in CreateMasterExpenseCategoryInput) (*MasterExpenseCategoryDTO, error) {
	if strings.TrimSpace(in.Name) == "" {
		return nil, fmt.Errorf("name is required")
	}
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mpID == uuid.Nil {
		return nil, fmt.Errorf("master profile required")
	}
	category := &model.MasterExpenseCategory{
		ID:              categoryID,
		MasterProfileID: mpID,
		Name:            strings.TrimSpace(in.Name),
		Emoji:           strings.TrimSpace(ptrToString(in.Emoji)),
	}
	if err := s.repo.UpdateMasterExpenseCategory(ctx, category); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &MasterExpenseCategoryDTO{
		ID:        category.ID,
		Name:      category.Name,
		Emoji:     category.Emoji,
		SortOrder: category.SortOrder,
		CreatedAt: category.CreatedAt,
	}, nil
}

func (s *masterDashboardService) DeleteExpenseCategory(ctx context.Context, userID uuid.UUID, categoryID uuid.UUID) error {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return err
	}
	if mpID == uuid.Nil {
		return fmt.Errorf("master profile required")
	}
	return s.repo.DeleteMasterExpenseCategory(ctx, mpID, categoryID)
}

func (s *masterDashboardService) ListExpenses(ctx context.Context, userID uuid.UUID, from, to *time.Time, page, pageSize int) (*MasterExpenseListResponse, error) {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mpID == uuid.Nil {
		return nil, fmt.Errorf("master profile required")
	}
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	items, total, err := s.repo.ListMasterExpenses(ctx, mpID, from, to, pageSize, (page-1)*pageSize)
	if err != nil {
		return nil, err
	}
	categories, err := s.repo.ListMasterExpenseCategories(ctx, mpID)
	if err != nil {
		return nil, err
	}
	categoryByID := make(map[uuid.UUID]string, len(categories))
	for _, c := range categories {
		categoryByID[c.ID] = c.Name
	}
	out := make([]MasterExpenseDTO, len(items))
	for i, item := range items {
		var categoryName *string
		if item.CategoryID != nil {
			if name, ok := categoryByID[*item.CategoryID]; ok {
				categoryName = &name
			}
		}
		out[i] = MasterExpenseDTO{
			ID:            item.ID,
			CategoryID:    item.CategoryID,
			CategoryName:  categoryName,
			AppointmentID: item.AppointmentID,
			AmountCents:   item.AmountCents,
			Description:   item.Description,
			ExpenseDate:   item.ExpenseDate.Format("2006-01-02"),
			CreatedAt:     item.CreatedAt,
		}
	}
	return &MasterExpenseListResponse{Items: out, Total: total}, nil
}

func (s *masterDashboardService) CreateExpense(ctx context.Context, userID uuid.UUID, in CreateMasterExpenseInput) (*MasterExpenseDTO, error) {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mpID == uuid.Nil {
		return nil, fmt.Errorf("master profile required")
	}
	if in.AmountCents <= 0 {
		return nil, fmt.Errorf("amountCents must be greater than zero")
	}
	if strings.TrimSpace(in.ExpenseDate) == "" {
		return nil, fmt.Errorf("expenseDate is required")
	}
	expenseDate, err := time.Parse("2006-01-02", in.ExpenseDate)
	if err != nil {
		return nil, fmt.Errorf("invalid expenseDate")
	}
	expense := &model.MasterExpense{
		MasterProfileID: mpID,
		CategoryID:      in.CategoryID,
		AppointmentID:   in.AppointmentID,
		AmountCents:     in.AmountCents,
		Description:     strings.TrimSpace(ptrToString(in.Description)),
		ExpenseDate:     expenseDate,
	}
	if err := s.repo.CreateMasterExpense(ctx, expense); err != nil {
		return nil, err
	}
	return &MasterExpenseDTO{
		ID:            expense.ID,
		CategoryID:    expense.CategoryID,
		AppointmentID: expense.AppointmentID,
		AmountCents:   expense.AmountCents,
		Description:   expense.Description,
		ExpenseDate:   expense.ExpenseDate.Format("2006-01-02"),
		CreatedAt:     expense.CreatedAt,
	}, nil
}

func (s *masterDashboardService) UpdateExpense(ctx context.Context, userID uuid.UUID, expenseID uuid.UUID, in CreateMasterExpenseInput) (*MasterExpenseDTO, error) {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mpID == uuid.Nil {
		return nil, fmt.Errorf("master profile required")
	}
	if in.AmountCents <= 0 {
		return nil, fmt.Errorf("amountCents must be greater than zero")
	}
	if strings.TrimSpace(in.ExpenseDate) == "" {
		return nil, fmt.Errorf("expenseDate is required")
	}
	expenseDate, err := time.Parse("2006-01-02", in.ExpenseDate)
	if err != nil {
		return nil, fmt.Errorf("invalid expenseDate")
	}
	expense := &model.MasterExpense{
		ID:              expenseID,
		MasterProfileID: mpID,
		CategoryID:      in.CategoryID,
		AppointmentID:   in.AppointmentID,
		AmountCents:     in.AmountCents,
		Description:     strings.TrimSpace(ptrToString(in.Description)),
		ExpenseDate:     expenseDate,
	}
	if err := s.repo.UpdateMasterExpense(ctx, expense); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &MasterExpenseDTO{
		ID:            expense.ID,
		CategoryID:    expense.CategoryID,
		AppointmentID: expense.AppointmentID,
		AmountCents:   expense.AmountCents,
		Description:   expense.Description,
		ExpenseDate:   expense.ExpenseDate.Format("2006-01-02"),
		CreatedAt:     expense.CreatedAt,
	}, nil
}

func (s *masterDashboardService) DeleteExpense(ctx context.Context, userID uuid.UUID, expenseID uuid.UUID) error {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return err
	}
	if mpID == uuid.Nil {
		return fmt.Errorf("master profile required")
	}
	return s.repo.DeleteMasterExpense(ctx, mpID, expenseID)
}

func (s *masterDashboardService) GetFinanceSummary(ctx context.Context, userID uuid.UUID, source string, from, to *time.Time) (*FinanceSummaryDTO, error) {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mpID == uuid.Nil {
		return nil, fmt.Errorf("master profile required")
	}
	income, expense, err := s.repo.GetMasterFinanceSummary(ctx, mpID, source, from, to)
	if err != nil {
		return nil, err
	}
	return &FinanceSummaryDTO{IncomeCents: income, ExpenseCents: expense, ProfitCents: income - expense}, nil
}

func (s *masterDashboardService) GetFinanceTrend(ctx context.Context, userID uuid.UUID, source string, from, to *time.Time) ([]FinanceTrendPointDTO, error) {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mpID == uuid.Nil {
		return nil, fmt.Errorf("master profile required")
	}
	rows, err := s.repo.GetMasterRevenueTrend(ctx, mpID, source, from, to)
	if err != nil {
		return nil, err
	}
	out := make([]FinanceTrendPointDTO, len(rows))
	for i, row := range rows {
		out[i] = FinanceTrendPointDTO{
			Date:         row.Date.Format("2006-01-02"),
			IncomeCents:  row.IncomeCents,
			ExpenseCents: row.ExpenseCents,
		}
	}
	return out, nil
}

func (s *masterDashboardService) GetTopServices(ctx context.Context, userID uuid.UUID, source string, from, to *time.Time) ([]FinanceTopServiceDTO, error) {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mpID == uuid.Nil {
		return nil, fmt.Errorf("master profile required")
	}
	rows, err := s.repo.GetMasterTopServices(ctx, mpID, source, from, to, 5)
	if err != nil {
		return nil, err
	}
	out := make([]FinanceTopServiceDTO, len(rows))
	for i, row := range rows {
		out[i] = FinanceTopServiceDTO{
			ServiceName: row.ServiceName,
			IncomeCents: row.IncomeCents,
		}
	}
	return out, nil
}

func (s *masterDashboardService) ExportNpdReport(ctx context.Context, userID uuid.UUID, month string) (map[string]any, error) {
	mpID, err := s.masterProfileID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mpID == uuid.Nil {
		return nil, fmt.Errorf("master profile required")
	}
	if month == "" {
		month = time.Now().Format("2006-01")
	}
	monthParsed, err := time.Parse("2006-01", month)
	if err != nil {
		return nil, fmt.Errorf("invalid month")
	}
	from := monthParsed
	end := monthParsed.AddDate(0, 1, 0).Add(-time.Nanosecond)
	expenses, _, err := s.repo.ListMasterExpenses(ctx, mpID, &from, &end, 1000, 0)
	if err != nil {
		return nil, err
	}
	categories, err := s.repo.ListMasterExpenseCategories(ctx, mpID)
	if err != nil {
		return nil, err
	}
	categoryByID := make(map[uuid.UUID]string, len(categories))
	for _, c := range categories {
		categoryByID[c.ID] = c.Name
	}
	items := make([]map[string]any, len(expenses))
	for i, expense := range expenses {
		var categoryName *string
		if expense.CategoryID != nil {
			if name, ok := categoryByID[*expense.CategoryID]; ok {
				categoryName = &name
			}
		}
		items[i] = map[string]any{
			"id":           expense.ID,
			"categoryId":   expense.CategoryID,
			"categoryName": categoryName,
			"amountCents":  expense.AmountCents,
			"description":  expense.Description,
			"expenseDate":  expense.ExpenseDate.Format("2006-01-02"),
		}
	}
	return map[string]any{
		"month":      month,
		"expenses":   items,
		"totalCount": len(expenses),
	}, nil
}

func ptrToString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
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
