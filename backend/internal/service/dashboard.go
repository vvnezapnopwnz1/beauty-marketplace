package service

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"github.com/yourusername/beauty-marketplace/internal/servicecategory"
	"gorm.io/gorm"
)

// DashboardService is the salon-owner dashboard API logic.
type DashboardService interface {
	Membership(ctx context.Context, userID uuid.UUID) (*repository.SalonMembership, error)

	ListAppointments(ctx context.Context, salonID uuid.UUID, f repository.AppointmentListFilter) ([]repository.AppointmentListRow, int64, error)
	CreateManualAppointment(ctx context.Context, salonID uuid.UUID, in ManualAppointmentInput) (*model.Appointment, error)
	UpdateAppointmentStatus(ctx context.Context, salonID, appointmentID uuid.UUID, newStatus string) error
	UpdateAppointment(ctx context.Context, salonID uuid.UUID, in UpdateAppointmentInput) error

	ListServices(ctx context.Context, salonID uuid.UUID) ([]model.SalonService, error)
	ServiceStaffNamesMap(ctx context.Context, salonID uuid.UUID) (map[uuid.UUID][]string, error)
	CreateService(ctx context.Context, salonID uuid.UUID, in ServiceInput) (*model.SalonService, error)
	UpdateService(ctx context.Context, salonID, serviceID uuid.UUID, in ServiceInput) (*model.SalonService, error)
	DeleteService(ctx context.Context, salonID, serviceID uuid.UUID) error

	ListStaff(ctx context.Context, salonID uuid.UUID) ([]model.SalonMaster, error)
	ListStaffDashboard(ctx context.Context, salonID uuid.UUID) ([]SalonMasterDashboardListItem, error)
	GetStaff(ctx context.Context, salonID, staffID uuid.UUID) (*model.SalonMaster, []uuid.UUID, error)
	GetSalonMasterDashboardDetail(ctx context.Context, salonID, salonMasterID uuid.UUID) (*SalonMasterDashboardDetail, error)
	CreateStaff(ctx context.Context, salonID uuid.UUID, in StaffInput) (*model.SalonMaster, error)
	UpdateStaff(ctx context.Context, salonID, staffID uuid.UUID, in StaffInput) (*model.SalonMaster, error)
	DeleteStaff(ctx context.Context, salonID, staffID uuid.UUID) error

	LookupMasterByPhone(ctx context.Context, phoneE164 string) (*model.MasterProfile, bool, error)
	CreateMasterInvite(ctx context.Context, salonID, masterProfileID uuid.UUID) (*model.SalonMaster, error)
	ReplaceSalonMasterServices(ctx context.Context, salonID, salonMasterID uuid.UUID, rows []SalonMasterServiceAssignmentInput) error

	StaffMetrics(ctx context.Context, salonID, staffID uuid.UUID, period string) (*StaffMetricsDTO, error)

	GetSchedule(ctx context.Context, salonID uuid.UUID) ([]model.WorkingHour, error)
	GetSalonScheduleBundle(ctx context.Context, salonID uuid.UUID) (*SalonScheduleBundle, error)
	PutSchedule(ctx context.Context, salonID uuid.UUID, rows []WorkingHourInput) error
	PutSalonScheduleBundle(ctx context.Context, salonID uuid.UUID, in SalonSchedulePayload) error

	GetStaffSchedule(ctx context.Context, salonID, staffID uuid.UUID) ([]model.SalonMasterHour, error)
	GetStaffScheduleBundle(ctx context.Context, salonID, staffID uuid.UUID) (*StaffScheduleBundle, error)
	PutStaffSchedule(ctx context.Context, salonID, staffID uuid.UUID, rows []StaffWorkingHourInput) error
	PutStaffScheduleBundle(ctx context.Context, salonID, staffID uuid.UUID, in StaffSchedulePayload) error

	Stats(ctx context.Context, salonID uuid.UUID, period string) (*DashboardStats, error)
	GetSalonProfile(ctx context.Context, salonID uuid.UUID) (*model.Salon, error)
	PutSalonProfile(ctx context.Context, salonID uuid.UUID, in SalonProfileInput) (*model.Salon, error)

	ListServiceCategories(ctx context.Context, salonID uuid.UUID, fullList bool) (*ServiceCategoriesResponse, error)
}

type ManualAppointmentInput struct {
	ServiceID   uuid.UUID
	StaffID     *uuid.UUID
	StartsAt    time.Time
	GuestName   string
	GuestPhone  string
	ClientNote  string
	ClientUserID *uuid.UUID
}

type UpdateAppointmentInput struct {
	AppointmentID uuid.UUID
	StartsAt      *time.Time
	EndsAt        *time.Time
	StaffID       *uuid.UUID
	ClearStaffID  bool
	ServiceID     *uuid.UUID
	ClientNote    *string
	GuestName     *string
	GuestPhone    *string
}

type ServiceInput struct {
	Name               string      `json:"name"`
	Category           *string     `json:"category"`
	CategorySlug       string      `json:"categorySlug"`
	AllowAllCategories bool        `json:"allowAllCategories"`
	Description        *string     `json:"description"`
	DurationMinutes    int         `json:"durationMinutes"`
	PriceCents         *int64      `json:"priceCents"`
	IsActive           bool        `json:"isActive"`
	SortOrder          int         `json:"sortOrder"`
	StaffIDs           []uuid.UUID `json:"staffIds,omitempty"`
}

type WorkingHourInput struct {
	DayOfWeek     int16   `json:"dayOfWeek"`
	OpensAt       string  `json:"opensAt"`
	ClosesAt      string  `json:"closesAt"`
	Closed        bool    `json:"closed"`
	BreakStartsAt *string `json:"breakStartsAt,omitempty"`
	BreakEndsAt   *string `json:"breakEndsAt,omitempty"`
}

type StaffWorkingHourInput struct {
	DayOfWeek     int16   `json:"dayOfWeek"`
	OpensAt       string  `json:"opensAt"`
	ClosesAt      string  `json:"closesAt"`
	IsDayOff      bool    `json:"isDayOff"`
	BreakStartsAt *string `json:"breakStartsAt,omitempty"`
	BreakEndsAt   *string `json:"breakEndsAt,omitempty"`
}

type SalonProfileInput struct {
	NameOverride          *string  `json:"nameOverride"`
	Description           *string  `json:"description"`
	PhonePublic           *string  `json:"phonePublic"`
	CategoryID            *string  `json:"categoryId"`
	SalonType             *string  `json:"salonType"`
	BusinessType          *string  `json:"businessType"`
	OnlineBookingEnabled  *bool    `json:"onlineBookingEnabled"`
	AddressOverride       *string  `json:"addressOverride"`
	District              *string  `json:"district"`
	Address               *string  `json:"address"`
	Lat                   *float64 `json:"lat"`
	Lng                   *float64 `json:"lng"`
	PhotoURL              *string  `json:"photoUrl"`
	Timezone              *string  `json:"timezone"`
}

// StaffInput is create/update body for dashboard staff.
type StaffInput struct {
	DisplayName           string      `json:"displayName"`
	Role                  *string     `json:"role"`
	Level                 *string     `json:"level"`
	Bio                   *string     `json:"bio"`
	Phone                 *string     `json:"phone"`
	TelegramUsername      *string     `json:"telegramUsername"`
	Email                 *string     `json:"email"`
	Color                 *string     `json:"color"`
	JoinedAt              *string     `json:"joinedAt"`
	DashboardAccess       bool        `json:"dashboardAccess"`
	TelegramNotifications bool        `json:"telegramNotifications"`
	IsActive              bool        `json:"isActive"`
	ServiceIDs            []uuid.UUID `json:"serviceIds"`
	Specializations       []string    `json:"specializations"`
	YearsExperience       *int        `json:"yearsExperience"`
	ServiceAssignments    []SalonMasterServiceAssignmentInput `json:"serviceAssignments,omitempty"`
}

// SalonMasterServiceAssignmentInput is one service line with optional overrides (create/update staff or PUT services).
type SalonMasterServiceAssignmentInput struct {
	ServiceID               uuid.UUID `json:"serviceId"`
	PriceOverrideCents      *int64    `json:"priceOverrideCents"`
	DurationOverrideMinutes *int      `json:"durationOverrideMinutes"`
}

// MasterProfileLite is nested master_profiles JSON for dashboard salon-masters.
type MasterProfileLite struct {
	ID                uuid.UUID `json:"id"`
	Bio               *string   `json:"bio"`
	Specializations   []string  `json:"specializations"`
	AvatarURL         *string   `json:"avatarUrl"`
	YearsExperience   *int      `json:"yearsExperience"`
	OwnedByUser       bool      `json:"ownedByUser"`
}

// SalonMasterServiceOut is one linked salon service with optional overrides.
type SalonMasterServiceOut struct {
	ServiceID               uuid.UUID `json:"serviceId"`
	ServiceName             string    `json:"serviceName"`
	SalonPriceCents         *int64    `json:"salonPriceCents"`
	SalonDurationMinutes    int       `json:"salonDurationMinutes"`
	PriceOverrideCents      *int64    `json:"priceOverrideCents"`
	DurationOverrideMinutes *int      `json:"durationOverrideMinutes"`
}

// SalonMasterDashboardDetail is GET/PUT /salon-masters/:id JSON body.
type SalonMasterDashboardDetail struct {
	ID                    uuid.UUID               `json:"id"`
	SalonID               uuid.UUID               `json:"salonId"`
	DisplayName           string                  `json:"displayName"`
	Color                 *string                 `json:"color,omitempty"`
	IsActive              bool                    `json:"isActive"`
	Status                string                  `json:"status"`
	Role                  *string                 `json:"role,omitempty"`
	Level                 *string                 `json:"level,omitempty"`
	Bio                   *string                 `json:"bio,omitempty"`
	Phone                 *string                 `json:"phone,omitempty"`
	TelegramUsername      *string                 `json:"telegramUsername,omitempty"`
	Email                 *string                 `json:"email,omitempty"`
	JoinedAt              *time.Time              `json:"joinedAt,omitempty"`
	DashboardAccess       bool                    `json:"dashboardAccess"`
	TelegramNotifications bool                    `json:"telegramNotifications"`
	CreatedAt             time.Time               `json:"createdAt"`
	MasterProfile         *MasterProfileLite      `json:"masterProfile,omitempty"`
	Services              []SalonMasterServiceOut `json:"services"`
	ServiceIds            []uuid.UUID             `json:"serviceIds"` //nolint:tagliatelle // API contract
}

// SalonMasterDashboardListItem is GET /salon-masters list row.
type SalonMasterDashboardListItem struct {
	ID                    uuid.UUID               `json:"id"`
	SalonID               uuid.UUID               `json:"salonId"`
	DisplayName           string                  `json:"displayName"`
	Color                 *string                 `json:"color,omitempty"`
	IsActive              bool                    `json:"isActive"`
	Status                string                  `json:"status"`
	Role                  *string                 `json:"role,omitempty"`
	Level                 *string                 `json:"level,omitempty"`
	JoinedAt              *time.Time              `json:"joinedAt,omitempty"`
	DashboardAccess       bool                    `json:"dashboardAccess"`
	TelegramNotifications bool                    `json:"telegramNotifications"`
	MasterProfile         *MasterProfileLite      `json:"masterProfile,omitempty"`
	Services              []SalonMasterServiceOut `json:"services"`
	LoadPercentWeek       float64                 `json:"loadPercentWeek"`
	RatingAvg             *float64                `json:"ratingAvg"`
	ReviewCount           int64                   `json:"reviewCount"`
	CompletedVisits       int64                   `json:"completedVisits"`
	RevenueMonthCents     int64                   `json:"revenueMonthCents"`
}

// StaffMetricsDTO is GET /staff/:id/metrics.
type StaffMetricsDTO struct {
	Rating            *float64 `json:"rating"`
	ReviewCount       int64    `json:"reviewCount"`
	TotalVisits       int64    `json:"totalVisits"`
	RevenueMonthCents int64    `json:"revenueMonthCents"`
	LoadPercent       float64  `json:"loadPercent"`
	UpcomingCount     int64    `json:"upcomingCount"`
}

// SalonScheduleBundle is GET /schedule full payload.
type SalonScheduleBundle struct {
	SlotDurationMinutes int                       `json:"slotDurationMinutes"`
	WorkingHours        []model.WorkingHour       `json:"workingHours"`
	DateOverrides       []model.SalonDateOverride `json:"dateOverrides"`
}

// StaffScheduleBundle is GET /staff/:id/schedule full payload.
type StaffScheduleBundle struct {
	Rows     []model.SalonMasterHour `json:"rows"`
	Absences []model.SalonMasterAbsence     `json:"absences"`
}

// DateOverrideInput is one salon calendar exception.
type DateOverrideInput struct {
	OnDate   string  `json:"onDate"`
	IsClosed bool    `json:"isClosed"`
	Note     *string `json:"note"`
}

// StaffAbsenceInput is vacation/sick range.
type StaffAbsenceInput struct {
	StartsOn string `json:"startsOn"`
	EndsOn   string `json:"endsOn"`
	Kind     string `json:"kind"`
}

// SalonSchedulePayload is PUT /schedule body (optional slot + overrides).
type SalonSchedulePayload struct {
	SlotDurationMinutes *int                   `json:"slotDurationMinutes,omitempty"`
	WorkingHours        []WorkingHourInput     `json:"workingHours,omitempty"`
	DateOverrides       []DateOverrideInput    `json:"dateOverrides,omitempty"`
}

// StaffSchedulePayload is PUT staff schedule + absences.
type StaffSchedulePayload struct {
	Rows     []StaffWorkingHourInput `json:"rows,omitempty"`
	Absences []StaffAbsenceInput     `json:"absences,omitempty"`
}

// DashboardStats is returned by GET /dashboard/stats.
type DashboardStats struct {
	AppointmentsToday        int64   `json:"appointmentsToday"`
	AppointmentsTodayConfirmed int64 `json:"appointmentsTodayConfirmed"`
	NewAppointmentsWeek      int64   `json:"newAppointmentsWeek"`
	NewAppointmentsPrevWeek  int64   `json:"newAppointmentsPrevWeek"`
	WeekChangePct            float64 `json:"weekChangePct"`
	LoadPct                  float64 `json:"loadPct"`
	Rating                   float64 `json:"rating"`
	ReviewCount              int     `json:"reviewCount"`
	PendingCount             int64   `json:"pendingCount"`
}

// ServiceCategoryItemDTO is one preset row in GET /dashboard/service-categories.
type ServiceCategoryItemDTO struct {
	Slug       string `json:"slug"`
	NameRu     string `json:"nameRu"`
	ParentSlug string `json:"parentSlug"`
	SortOrder  int    `json:"sortOrder"`
}

// ServiceCategoryGroupDTO groups items by parent_slug.
type ServiceCategoryGroupDTO struct {
	ParentSlug string                   `json:"parentSlug"`
	Label      string                   `json:"label"`
	Items      []ServiceCategoryItemDTO `json:"items"`
}

// ServiceCategoriesResponse is GET /dashboard/service-categories.
type ServiceCategoriesResponse struct {
	SalonType *string                   `json:"salonType"`
	Groups    []ServiceCategoryGroupDTO `json:"groups"`
}

type dashboardService struct {
	dash repository.DashboardRepository
}

// NewDashboardService constructs DashboardService.
func NewDashboardService(dash repository.DashboardRepository) DashboardService {
	return &dashboardService{dash: dash}
}

var phoneDashRe = regexp.MustCompile(`^\+7\d{10}$`)

func normalizePhoneE164Ptr(phone *string) *string {
	if phone == nil {
		return nil
	}
	p := strings.TrimSpace(*phone)
	if p == "" {
		return nil
	}
	p = strings.ReplaceAll(p, " ", "")
	p = strings.ReplaceAll(p, "-", "")
	if strings.HasPrefix(p, "8") && len(p) == 11 {
		p = "+7" + p[1:]
	}
	if phoneDashRe.MatchString(p) {
		return &p
	}
	return nil
}

func masterProfileLiteFrom(mp *model.MasterProfile) *MasterProfileLite {
	if mp == nil {
		return nil
	}
	specs := make([]string, len(mp.Specializations))
	copy(specs, []string(mp.Specializations))
	return &MasterProfileLite{
		ID:                mp.ID,
		Bio:               mp.Bio,
		Specializations:   specs,
		AvatarURL:         mp.AvatarURL,
		YearsExperience:   mp.YearsExperience,
		OwnedByUser:       mp.UserID != nil,
	}
}

func (s *dashboardService) Membership(ctx context.Context, userID uuid.UUID) (*repository.SalonMembership, error) {
	return s.dash.FindMembershipForUser(ctx, userID)
}

func (s *dashboardService) ListAppointments(ctx context.Context, salonID uuid.UUID, f repository.AppointmentListFilter) ([]repository.AppointmentListRow, int64, error) {
	f.SalonID = salonID
	return s.dash.ListAppointments(ctx, f)
}

func (s *dashboardService) CreateManualAppointment(ctx context.Context, salonID uuid.UUID, in ManualAppointmentInput) (*model.Appointment, error) {
	svc, err := s.dash.GetService(ctx, salonID, in.ServiceID)
	if err != nil {
		return nil, err
	}
	if svc == nil || !svc.IsActive {
		return nil, fmt.Errorf("service not found")
	}
	if in.StaffID != nil {
		st, err := s.dash.GetStaff(ctx, salonID, *in.StaffID)
		if err != nil {
			return nil, err
		}
		if st == nil || !st.IsActive {
			return nil, fmt.Errorf("staff not found")
		}
	}
	name := trimSpace(in.GuestName)
	if name == "" {
		return nil, fmt.Errorf("guest name is required")
	}
	phone := trimSpace(in.GuestPhone)
	if !phoneDashRe.MatchString(phone) {
		return nil, fmt.Errorf("invalid phone, use E.164 +7XXXXXXXXXX")
	}
	end := in.StartsAt.Add(time.Duration(svc.DurationMinutes) * time.Minute)
	ap := &model.Appointment{
		SalonID:        salonID,
		ServiceID:      svc.ID,
		SalonMasterID:  in.StaffID,
		ClientUserID:   in.ClientUserID,
		GuestName:      &name,
		GuestPhoneE164: &phone,
		StartsAt:       in.StartsAt.UTC(),
		EndsAt:         end.UTC(),
		Status:         "pending",
	}
	if trimSpace(in.ClientNote) != "" {
		n := trimSpace(in.ClientNote)
		ap.ClientNote = &n
	}
	if err := s.dash.CreateAppointment(ctx, ap); err != nil {
		return nil, err
	}
	return ap, nil
}

func allowedStatusTransition(from, to string) bool {
	switch from {
	case "pending":
		return to == "confirmed" || to == "cancelled_by_salon"
	case "confirmed":
		return to == "completed" || to == "no_show" || to == "cancelled_by_salon"
	default:
		return false
	}
}

func (s *dashboardService) UpdateAppointmentStatus(ctx context.Context, salonID, appointmentID uuid.UUID, newStatus string) error {
	a, err := s.dash.GetAppointment(ctx, salonID, appointmentID)
	if err != nil {
		return err
	}
	if a == nil {
		return gorm.ErrRecordNotFound
	}
	if !allowedStatusTransition(a.Status, newStatus) {
		return fmt.Errorf("invalid status transition")
	}
	return s.dash.UpdateAppointmentStatus(ctx, salonID, appointmentID, newStatus)
}

func (s *dashboardService) UpdateAppointment(ctx context.Context, salonID uuid.UUID, in UpdateAppointmentInput) error {
	a, err := s.dash.GetAppointment(ctx, salonID, in.AppointmentID)
	if err != nil {
		return err
	}
	if a == nil {
		return gorm.ErrRecordNotFound
	}
	if in.ServiceID != nil {
		svc, err := s.dash.GetService(ctx, salonID, *in.ServiceID)
		if err != nil {
			return err
		}
		if svc == nil {
			return fmt.Errorf("service not found")
		}
		a.ServiceID = *in.ServiceID
	}
	if in.ClearStaffID {
		a.SalonMasterID = nil
	} else if in.StaffID != nil {
		if *in.StaffID != uuid.Nil {
			st, err := s.dash.GetStaff(ctx, salonID, *in.StaffID)
			if err != nil {
				return err
			}
			if st == nil {
				return fmt.Errorf("staff not found")
			}
		}
		a.SalonMasterID = in.StaffID
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
		n := trimSpace(*in.GuestName)
		if n == "" {
			a.GuestName = nil
		} else {
			a.GuestName = &n
		}
	}
	if in.GuestPhone != nil {
		p := trimSpace(*in.GuestPhone)
		if p == "" {
			a.GuestPhoneE164 = nil
		} else if !phoneDashRe.MatchString(p) {
			return fmt.Errorf("invalid phone, use E.164 +7XXXXXXXXXX")
		} else {
			a.GuestPhoneE164 = &p
		}
	}
	if in.EndsAt == nil && (in.StartsAt != nil || in.ServiceID != nil) {
		svc, err := s.dash.GetService(ctx, salonID, a.ServiceID)
		if err != nil {
			return err
		}
		if svc == nil {
			return fmt.Errorf("service not found")
		}
		a.EndsAt = a.StartsAt.Add(time.Duration(svc.DurationMinutes) * time.Minute).UTC()
	}
	if a.EndsAt.Before(a.StartsAt) {
		return fmt.Errorf("ends_at before starts_at")
	}
	return s.dash.UpdateAppointment(ctx, a)
}

func (s *dashboardService) ListServices(ctx context.Context, salonID uuid.UUID) ([]model.SalonService, error) {
	return s.dash.ListServices(ctx, salonID)
}

func (s *dashboardService) ListServiceCategories(ctx context.Context, salonID uuid.UUID, fullList bool) (*ServiceCategoriesResponse, error) {
	rows, err := s.dash.ListSystemServiceCategories(ctx)
	if err != nil {
		return nil, err
	}
	salon, err := s.dash.FindSalonModel(ctx, salonID)
	if err != nil {
		return nil, err
	}
	if salon == nil {
		return nil, gorm.ErrRecordNotFound
	}
	st := ""
	if salon.SalonType != nil {
		st = *salon.SalonType
	}
	allowed := servicecategory.ParentSlugsForSalonType(st)
	if !fullList && allowed != nil {
		filtered := make([]model.ServiceCategory, 0, len(rows))
		for _, r := range rows {
			if servicecategory.ParentAllowedForSalonType(r.ParentSlug, allowed) {
				filtered = append(filtered, r)
			}
		}
		rows = filtered
	}
	byParent := make(map[string][]model.ServiceCategory)
	for _, r := range rows {
		byParent[r.ParentSlug] = append(byParent[r.ParentSlug], r)
	}
	out := &ServiceCategoriesResponse{SalonType: salon.SalonType, Groups: make([]ServiceCategoryGroupDTO, 0)}
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

func (s *dashboardService) applyServiceCategory(ctx context.Context, salonID uuid.UUID, in ServiceInput, row *model.SalonService, isUpdate bool) error {
	slug := trimSpace(in.CategorySlug)
	if slug == "" && isUpdate && row.CategorySlug != nil && trimSpace(*row.CategorySlug) != "" {
		slug = *row.CategorySlug
	}
	if slug == "" {
		if in.Category != nil && trimSpace(*in.Category) != "" {
			row.Category = in.Category
			row.CategorySlug = nil
			return nil
		}
		if isUpdate {
			return nil
		}
		return fmt.Errorf("categorySlug is required")
	}
	cat, err := s.dash.GetSystemServiceCategoryBySlug(ctx, slug)
	if err != nil {
		return err
	}
	if cat == nil {
		return fmt.Errorf("unknown category slug")
	}
	salon, err := s.dash.FindSalonModel(ctx, salonID)
	if err != nil {
		return err
	}
	st := ""
	if salon != nil && salon.SalonType != nil {
		st = *salon.SalonType
	}
	allowed := servicecategory.ParentSlugsForSalonType(st)
	if !in.AllowAllCategories && !servicecategory.ParentAllowedForSalonType(cat.ParentSlug, allowed) {
		return fmt.Errorf("category not allowed for salon type; use allowAllCategories to pick from full list")
	}
	name := cat.NameRu
	row.CategorySlug = &slug
	row.Category = &name
	return nil
}

func (s *dashboardService) ServiceStaffNamesMap(ctx context.Context, salonID uuid.UUID) (map[uuid.UUID][]string, error) {
	return s.dash.ServiceStaffNamesMap(ctx, salonID)
}

func (s *dashboardService) CreateService(ctx context.Context, salonID uuid.UUID, in ServiceInput) (*model.SalonService, error) {
	if trimSpace(in.Name) == "" {
		return nil, fmt.Errorf("name is required")
	}
	if in.DurationMinutes <= 0 {
		return nil, fmt.Errorf("duration must be positive")
	}
	svc := &model.SalonService{
		SalonID:         salonID,
		Name:            trimSpace(in.Name),
		Category:        in.Category,
		Description:     in.Description,
		DurationMinutes: in.DurationMinutes,
		PriceCents:      in.PriceCents,
		IsActive:        in.IsActive,
		SortOrder:       in.SortOrder,
	}
	if err := s.applyServiceCategory(ctx, salonID, in, svc, false); err != nil {
		return nil, err
	}
	if err := s.dash.CreateService(ctx, svc); err != nil {
		return nil, err
	}
	if len(in.StaffIDs) > 0 {
		if err := s.dash.ReplaceServiceStaff(ctx, salonID, svc.ID, dedupeUUIDs(in.StaffIDs)); err != nil {
			return nil, err
		}
	}
	return svc, nil
}

func (s *dashboardService) UpdateService(ctx context.Context, salonID, serviceID uuid.UUID, in ServiceInput) (*model.SalonService, error) {
	svc, err := s.dash.GetService(ctx, salonID, serviceID)
	if err != nil {
		return nil, err
	}
	if svc == nil {
		return nil, gorm.ErrRecordNotFound
	}
	if trimSpace(in.Name) != "" {
		svc.Name = trimSpace(in.Name)
	}
	if in.DurationMinutes > 0 {
		svc.DurationMinutes = in.DurationMinutes
	}
	svc.Description = in.Description
	if err := s.applyServiceCategory(ctx, salonID, in, svc, true); err != nil {
		return nil, err
	}
	svc.PriceCents = in.PriceCents
	svc.IsActive = in.IsActive
	svc.SortOrder = in.SortOrder
	if err := s.dash.UpdateService(ctx, svc); err != nil {
		return nil, err
	}
	if in.StaffIDs != nil {
		if err := s.dash.ReplaceServiceStaff(ctx, salonID, serviceID, dedupeUUIDs(in.StaffIDs)); err != nil {
			return nil, err
		}
	}
	return svc, nil
}

func (s *dashboardService) DeleteService(ctx context.Context, salonID, serviceID uuid.UUID) error {
	err := s.dash.SoftDeleteService(ctx, salonID, serviceID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	return err
}

func (s *dashboardService) ListStaff(ctx context.Context, salonID uuid.UUID) ([]model.SalonMaster, error) {
	return s.dash.ListStaff(ctx, salonID)
}

func (s *dashboardService) CreateStaff(ctx context.Context, salonID uuid.UUID, in StaffInput) (*model.SalonMaster, error) {
	n := trimSpace(in.DisplayName)
	if n == "" {
		return nil, fmt.Errorf("display name is required")
	}
	specs := pq.StringArray(in.Specializations)
	if specs == nil {
		specs = pq.StringArray{}
	}
	var bioPtr *string
	if in.Bio != nil && trimSpace(*in.Bio) != "" {
		b := trimSpace(*in.Bio)
		bioPtr = &b
	}
	mp := &model.MasterProfile{
		DisplayName:     n,
		Bio:             bioPtr,
		Specializations: specs,
		YearsExperience: in.YearsExperience,
		PhoneE164:       normalizePhoneE164Ptr(in.Phone),
	}
	if err := s.dash.CreateMasterProfile(ctx, mp); err != nil {
		return nil, err
	}
	mid := mp.ID
	status := "active"
	if !in.IsActive {
		status = "inactive"
	}
	st := &model.SalonMaster{
		SalonID:               salonID,
		MasterID:              &mid,
		DisplayName:           n,
		Role:                  in.Role,
		Level:                 in.Level,
		Phone:                 in.Phone,
		TelegramUsername:      in.TelegramUsername,
		Email:                 in.Email,
		Color:                 in.Color,
		DashboardAccess:       in.DashboardAccess,
		TelegramNotifications: in.TelegramNotifications,
		IsActive:              in.IsActive,
		Status:                status,
	}
	if in.JoinedAt != nil && trimSpace(*in.JoinedAt) != "" {
		t, err := time.Parse("2006-01-02", trimSpace(*in.JoinedAt))
		if err == nil {
			st.JoinedAt = &t
		}
	}
	if err := s.dash.CreateStaff(ctx, st); err != nil {
		return nil, err
	}
	if err := s.applyStaffServiceAssignments(ctx, salonID, st.ID, in); err != nil {
		return nil, err
	}
	return st, nil
}

func (s *dashboardService) UpdateStaff(ctx context.Context, salonID, staffID uuid.UUID, in StaffInput) (*model.SalonMaster, error) {
	st, err := s.dash.GetStaff(ctx, salonID, staffID)
	if err != nil {
		return nil, err
	}
	if st == nil {
		return nil, gorm.ErrRecordNotFound
	}
	if trimSpace(in.DisplayName) != "" {
		st.DisplayName = trimSpace(in.DisplayName)
	}
	st.Role = in.Role
	st.Level = in.Level
	st.Bio = in.Bio
	st.Phone = in.Phone
	st.TelegramUsername = in.TelegramUsername
	st.Email = in.Email
	st.Color = in.Color
	if in.JoinedAt != nil {
		if trimSpace(*in.JoinedAt) == "" {
			st.JoinedAt = nil
		} else {
			t, err := time.Parse("2006-01-02", trimSpace(*in.JoinedAt))
			if err == nil {
				st.JoinedAt = &t
			}
		}
	}
	st.DashboardAccess = in.DashboardAccess
	st.TelegramNotifications = in.TelegramNotifications
	if st.Status == "pending" {
		st.IsActive = false
	} else {
		st.IsActive = in.IsActive
		if in.IsActive {
			st.Status = "active"
		} else {
			st.Status = "inactive"
		}
	}
	if err := s.dash.UpdateStaff(ctx, st); err != nil {
		return nil, err
	}
	if st.MasterID != nil {
		mp, err := s.dash.GetMasterProfile(ctx, *st.MasterID)
		if err != nil {
			return nil, err
		}
		if mp != nil && mp.UserID == nil {
			if trimSpace(in.DisplayName) != "" {
				mp.DisplayName = trimSpace(in.DisplayName)
			}
			if in.Bio != nil {
				if trimSpace(*in.Bio) == "" {
					mp.Bio = nil
				} else {
					b := trimSpace(*in.Bio)
					mp.Bio = &b
				}
			}
			if in.Specializations != nil {
				mp.Specializations = pq.StringArray(in.Specializations)
			}
			if in.YearsExperience != nil {
				mp.YearsExperience = in.YearsExperience
			}
			if in.Phone != nil {
				if trimSpace(*in.Phone) == "" {
					mp.PhoneE164 = nil
				} else if p := normalizePhoneE164Ptr(in.Phone); p != nil {
					mp.PhoneE164 = p
				}
			}
			if err := s.dash.UpdateMasterProfile(ctx, mp); err != nil {
				return nil, err
			}
		}
	}
	if in.ServiceIDs != nil || len(in.ServiceAssignments) > 0 {
		if err := s.applyStaffServiceAssignments(ctx, salonID, staffID, in); err != nil {
			return nil, err
		}
	}
	return st, nil
}

func (s *dashboardService) applyStaffServiceAssignments(ctx context.Context, salonID, salonMasterID uuid.UUID, in StaffInput) error {
	if len(in.ServiceAssignments) > 0 {
		rows := make([]repository.SalonMasterServiceAssignment, 0, len(in.ServiceAssignments))
		for _, a := range in.ServiceAssignments {
			var po *int
			if a.PriceOverrideCents != nil {
				v := int(*a.PriceOverrideCents)
				po = &v
			}
			rows = append(rows, repository.SalonMasterServiceAssignment{
				ServiceID:               a.ServiceID,
				PriceOverrideCents:      po,
				DurationOverrideMinutes: a.DurationOverrideMinutes,
			})
		}
		return s.dash.ReplaceSalonMasterServiceAssignments(ctx, salonID, salonMasterID, rows)
	}
	if len(in.ServiceIDs) > 0 {
		return s.dash.ReplaceStaffServices(ctx, salonID, salonMasterID, dedupeUUIDs(in.ServiceIDs))
	}
	return nil
}

func (s *dashboardService) GetStaff(ctx context.Context, salonID, staffID uuid.UUID) (*model.SalonMaster, []uuid.UUID, error) {
	st, err := s.dash.GetStaff(ctx, salonID, staffID)
	if err != nil {
		return nil, nil, err
	}
	if st == nil {
		return nil, nil, nil
	}
	ids, err := s.dash.ListStaffServiceIDs(ctx, salonID, staffID)
	if err != nil {
		return nil, nil, err
	}
	return st, ids, nil
}

func (s *dashboardService) GetSalonMasterDashboardDetail(ctx context.Context, salonID, salonMasterID uuid.UUID) (*SalonMasterDashboardDetail, error) {
	st, err := s.dash.GetStaff(ctx, salonID, salonMasterID)
	if err != nil {
		return nil, err
	}
	if st == nil {
		return nil, nil
	}
	ids, err := s.dash.ListStaffServiceIDs(ctx, salonID, salonMasterID)
	if err != nil {
		return nil, err
	}
	details, err := s.dash.ListSalonMasterServiceDetails(ctx, salonID, salonMasterID)
	if err != nil {
		return nil, err
	}
	var mpLite *MasterProfileLite
	if st.MasterID != nil {
		mp, err := s.dash.GetMasterProfile(ctx, *st.MasterID)
		if err != nil {
			return nil, err
		}
		mpLite = masterProfileLiteFrom(mp)
	}
	svcOut := make([]SalonMasterServiceOut, 0, len(details))
	for _, row := range details {
		var po *int64
		if row.PriceOverrideCents != nil {
			v := int64(*row.PriceOverrideCents)
			po = &v
		}
		svcOut = append(svcOut, SalonMasterServiceOut{
			ServiceID:               row.ServiceID,
			ServiceName:             row.ServiceName,
			SalonPriceCents:         row.SalonPriceCents,
			SalonDurationMinutes:    row.SalonDurationMinutes,
			PriceOverrideCents:      po,
			DurationOverrideMinutes: row.DurationOverrideMinutes,
		})
	}
	status := st.Status
	if status == "" {
		if st.IsActive {
			status = "active"
		} else {
			status = "inactive"
		}
	}
	return &SalonMasterDashboardDetail{
		ID:                    st.ID,
		SalonID:               st.SalonID,
		DisplayName:           st.DisplayName,
		Color:                 st.Color,
		IsActive:              st.IsActive,
		Status:                status,
		Role:                  st.Role,
		Level:                 st.Level,
		Bio:                   st.Bio,
		Phone:                 st.Phone,
		TelegramUsername:      st.TelegramUsername,
		Email:                 st.Email,
		JoinedAt:              st.JoinedAt,
		DashboardAccess:       st.DashboardAccess,
		TelegramNotifications: st.TelegramNotifications,
		CreatedAt:             st.CreatedAt,
		MasterProfile:         mpLite,
		Services:              svcOut,
		ServiceIds:            ids,
	}, nil
}

func (s *dashboardService) DeleteStaff(ctx context.Context, salonID, staffID uuid.UUID) error {
	return s.dash.SoftDeleteStaff(ctx, salonID, staffID)
}

func (s *dashboardService) GetSchedule(ctx context.Context, salonID uuid.UUID) ([]model.WorkingHour, error) {
	return s.dash.ListWorkingHours(ctx, salonID)
}

func (s *dashboardService) PutSchedule(ctx context.Context, salonID uuid.UUID, rows []WorkingHourInput) error {
	return s.PutSalonScheduleBundle(ctx, salonID, SalonSchedulePayload{WorkingHours: rows})
}

func (s *dashboardService) GetSalonScheduleBundle(ctx context.Context, salonID uuid.UUID) (*SalonScheduleBundle, error) {
	salon, err := s.dash.FindSalonModel(ctx, salonID)
	if err != nil {
		return nil, err
	}
	if salon == nil {
		return nil, fmt.Errorf("salon not found")
	}
	hours, err := s.dash.ListWorkingHours(ctx, salonID)
	if err != nil {
		return nil, err
	}
	ov, err := s.dash.ListSalonDateOverrides(ctx, salonID)
	if err != nil {
		return nil, err
	}
	return &SalonScheduleBundle{
		SlotDurationMinutes: salon.SlotDurationMinutes,
		WorkingHours:        hours,
		DateOverrides:       ov,
	}, nil
}

func (s *dashboardService) PutSalonScheduleBundle(ctx context.Context, salonID uuid.UUID, in SalonSchedulePayload) error {
	if in.SlotDurationMinutes != nil && *in.SlotDurationMinutes > 0 && *in.SlotDurationMinutes <= 240 {
		if err := s.dash.UpdateSalonSlotDuration(ctx, salonID, *in.SlotDurationMinutes); err != nil {
			return err
		}
	}
	if len(in.WorkingHours) > 0 {
		out := make([]model.WorkingHour, 0, len(in.WorkingHours))
		for _, r := range in.WorkingHours {
			if r.DayOfWeek < 0 || r.DayOfWeek > 6 {
				return fmt.Errorf("invalid day_of_week")
			}
			if r.Closed {
				out = append(out, model.WorkingHour{
					DayOfWeek: r.DayOfWeek,
					OpensAt:   "10:00:00",
					ClosesAt:  "18:00:00",
					IsClosed:  true,
				})
				continue
			}
			if r.OpensAt == "" || r.ClosesAt == "" {
				return fmt.Errorf("opens_at and closes_at required when not closed")
			}
			bs, be := normalizeBreakPair(r.BreakStartsAt, r.BreakEndsAt)
			out = append(out, model.WorkingHour{
				DayOfWeek:     r.DayOfWeek,
				OpensAt:       normalizeTimeStr(r.OpensAt),
				ClosesAt:      normalizeTimeStr(r.ClosesAt),
				IsClosed:      false,
				BreakStartsAt: bs,
				BreakEndsAt:   be,
			})
		}
		if err := s.dash.ReplaceWorkingHours(ctx, salonID, out); err != nil {
			return err
		}
	}
	if in.DateOverrides != nil {
		rows := make([]model.SalonDateOverride, 0, len(in.DateOverrides))
		for _, d := range in.DateOverrides {
			t, err := time.Parse("2006-01-02", d.OnDate)
			if err != nil {
				return fmt.Errorf("invalid onDate")
			}
			rows = append(rows, model.SalonDateOverride{
				SalonID:  salonID,
				OnDate:   t,
				IsClosed: d.IsClosed,
				Note:     d.Note,
			})
		}
		if err := s.dash.ReplaceSalonDateOverrides(ctx, salonID, rows); err != nil {
			return err
		}
	}
	return nil
}

func normalizeTimeStr(s string) string {
	if len(s) == 5 && s[2] == ':' {
		return s + ":00"
	}
	return s
}

func normalizeBreakPair(a, b *string) (*string, *string) {
	if a == nil || b == nil {
		return nil, nil
	}
	if trimSpace(*a) == "" || trimSpace(*b) == "" {
		return nil, nil
	}
	as := normalizeTimeStr(trimSpace(*a))
	bs := normalizeTimeStr(trimSpace(*b))
	return &as, &bs
}

func dedupeUUIDs(ids []uuid.UUID) []uuid.UUID {
	seen := make(map[uuid.UUID]struct{})
	var out []uuid.UUID
	for _, id := range ids {
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].String() < out[j].String() })
	return out
}

func clockToMinutes(s string) int {
	s = normalizeTimeStr(trimSpace(s))
	t, err := time.Parse("15:04:05", s)
	if err != nil {
		t, _ = time.Parse("15:04", s)
	}
	return t.Hour()*60 + t.Minute()
}

func breakOverlapMinutes(openMin, closeMin int, bStart, bEnd *string) int {
	if bStart == nil || bEnd == nil {
		return 0
	}
	bs := clockToMinutes(*bStart)
	be := clockToMinutes(*bEnd)
	if be <= bs {
		return 0
	}
	// overlap with [openMin, closeMin]
	start := bs
	if openMin > start {
		start = openMin
	}
	end := be
	if closeMin < end {
		end = closeMin
	}
	if end <= start {
		return 0
	}
	return end - start
}

func mondayStart(loc *time.Location, t time.Time) time.Time {
	t = t.In(loc)
	wd := int(t.Weekday()) // Sun=0, Mon=1
	fromMon := (wd + 6) % 7
	return time.Date(t.Year(), t.Month(), t.Day()-fromMon, 0, 0, 0, 0, loc)
}

func (s *dashboardService) staffWeekCapacityMinutes(ctx context.Context, salonID, staffID uuid.UUID) (int, error) {
	staffRows, err := s.dash.ListStaffWorkingHours(ctx, staffID, salonID)
	if err != nil {
		return 0, err
	}
	salonRows, err := s.dash.ListWorkingHours(ctx, salonID)
	if err != nil {
		return 0, err
	}
	staffBy := make(map[int16]model.SalonMasterHour)
	for _, r := range staffRows {
		staffBy[r.DayOfWeek] = r
	}
	salonBy := make(map[int16]model.WorkingHour)
	for _, r := range salonRows {
		salonBy[r.DayOfWeek] = r
	}
	total := 0
	for dow := int16(0); dow <= 6; dow++ {
		if sh, ok := staffBy[dow]; ok {
			if sh.IsDayOff {
				continue
			}
			o := clockToMinutes(sh.OpensAt)
			c := clockToMinutes(sh.ClosesAt)
			br := breakOverlapMinutes(o, c, sh.BreakStartsAt, sh.BreakEndsAt)
			dayMin := c - o - br
			if dayMin < 0 {
				dayMin = 0
			}
			total += dayMin
			continue
		}
		sal, ok := salonBy[dow]
		if !ok || sal.IsClosed {
			continue
		}
		o := clockToMinutes(sal.OpensAt)
		c := clockToMinutes(sal.ClosesAt)
		br := breakOverlapMinutes(o, c, sal.BreakStartsAt, sal.BreakEndsAt)
		dayMin := c - o - br
		if dayMin < 0 {
			dayMin = 0
		}
		total += dayMin
	}
	return total, nil
}

func (s *dashboardService) StaffMetrics(ctx context.Context, salonID, staffID uuid.UUID, period string) (*StaffMetricsDTO, error) {
	_ = period
	salon, err := s.dash.FindSalonModel(ctx, salonID)
	if err != nil {
		return nil, err
	}
	if salon == nil {
		return nil, fmt.Errorf("salon not found")
	}
	loc, err := time.LoadLocation(salon.Timezone)
	if err != nil {
		loc = time.UTC
	}
	now := time.Now().In(loc)
	avg, revN, err := s.dash.StaffAvgRating(ctx, salonID, staffID)
	if err != nil {
		return nil, err
	}
	totalVisits, err := s.dash.CountStaffAppointments(ctx, salonID, staffID, nil, nil, []string{"completed"})
	if err != nil {
		return nil, err
	}
	mStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, loc)
	mEnd := mStart.AddDate(0, 1, 0)
	rev, err := s.dash.SumStaffRevenueCents(ctx, salonID, staffID, mStart.UTC(), mEnd.UTC())
	if err != nil {
		return nil, err
	}
	wStart := mondayStart(loc, now)
	wEnd := wStart.AddDate(0, 0, 7)
	ws := wStart.UTC()
	we := wEnd.UTC()
	active := []string{"pending", "confirmed", "completed", "no_show"}
	booked, err := s.dash.CountStaffAppointments(ctx, salonID, staffID, &ws, &we, active)
	if err != nil {
		return nil, err
	}
	capMin, err := s.staffWeekCapacityMinutes(ctx, salonID, staffID)
	if err != nil {
		return nil, err
	}
	slot := salon.SlotDurationMinutes
	if slot < 1 {
		slot = 30
	}
	maxSlots := capMin / slot
	if maxSlots < 1 {
		maxSlots = 1
	}
	loadPct := float64(booked) / float64(maxSlots) * 100
	if loadPct > 100 {
		loadPct = 100
	}
	if loadPct < 0 {
		loadPct = 0
	}
	future := now.UTC()
	upcoming, err := s.dash.CountStaffAppointments(ctx, salonID, staffID, &future, nil, []string{"pending", "confirmed"})
	if err != nil {
		return nil, err
	}
	return &StaffMetricsDTO{
		Rating:            avg,
		ReviewCount:       revN,
		TotalVisits:       totalVisits,
		RevenueMonthCents: rev,
		LoadPercent:       loadPct,
		UpcomingCount:     upcoming,
	}, nil
}

func (s *dashboardService) ListStaffDashboard(ctx context.Context, salonID uuid.UUID) ([]SalonMasterDashboardListItem, error) {
	staffList, err := s.dash.ListStaff(ctx, salonID)
	if err != nil {
		return nil, err
	}
	details, err := s.dash.ListSalonMasterServiceDetailsForSalon(ctx, salonID)
	if err != nil {
		return nil, err
	}
	byMaster := make(map[uuid.UUID][]repository.SalonMasterServiceDetail)
	for _, d := range details {
		byMaster[d.SalonMasterID] = append(byMaster[d.SalonMasterID], d)
	}
	out := make([]SalonMasterDashboardListItem, 0, len(staffList))
	for _, st := range staffList {
		m, err := s.StaffMetrics(ctx, salonID, st.ID, "month")
		if err != nil {
			return nil, err
		}
		var mpLite *MasterProfileLite
		if st.MasterID != nil {
			mp, err := s.dash.GetMasterProfile(ctx, *st.MasterID)
			if err != nil {
				return nil, err
			}
			mpLite = masterProfileLiteFrom(mp)
		}
		svcOut := make([]SalonMasterServiceOut, 0, len(byMaster[st.ID]))
		for _, row := range byMaster[st.ID] {
			var po *int64
			if row.PriceOverrideCents != nil {
				v := int64(*row.PriceOverrideCents)
				po = &v
			}
			svcOut = append(svcOut, SalonMasterServiceOut{
				ServiceID:               row.ServiceID,
				ServiceName:             row.ServiceName,
				SalonPriceCents:         row.SalonPriceCents,
				SalonDurationMinutes:    row.SalonDurationMinutes,
				PriceOverrideCents:      po,
				DurationOverrideMinutes: row.DurationOverrideMinutes,
			})
		}
		status := st.Status
		if status == "" {
			if st.IsActive {
				status = "active"
			} else {
				status = "inactive"
			}
		}
		out = append(out, SalonMasterDashboardListItem{
			ID:                    st.ID,
			SalonID:               st.SalonID,
			DisplayName:           st.DisplayName,
			Color:                 st.Color,
			IsActive:              st.IsActive,
			Status:                status,
			Role:                  st.Role,
			Level:                 st.Level,
			JoinedAt:              st.JoinedAt,
			DashboardAccess:       st.DashboardAccess,
			TelegramNotifications: st.TelegramNotifications,
			MasterProfile:         mpLite,
			Services:              svcOut,
			LoadPercentWeek:       m.LoadPercent,
			RatingAvg:             m.Rating,
			ReviewCount:           m.ReviewCount,
			CompletedVisits:       m.TotalVisits,
			RevenueMonthCents:     m.RevenueMonthCents,
		})
	}
	return out, nil
}

func (s *dashboardService) GetStaffSchedule(ctx context.Context, salonID, staffID uuid.UUID) ([]model.SalonMasterHour, error) {
	return s.dash.ListStaffWorkingHours(ctx, staffID, salonID)
}

func (s *dashboardService) PutStaffSchedule(ctx context.Context, salonID, staffID uuid.UUID, rows []StaffWorkingHourInput) error {
	return s.PutStaffScheduleBundle(ctx, salonID, staffID, StaffSchedulePayload{Rows: rows})
}

func (s *dashboardService) GetStaffScheduleBundle(ctx context.Context, salonID, staffID uuid.UUID) (*StaffScheduleBundle, error) {
	rows, err := s.dash.ListStaffWorkingHours(ctx, staffID, salonID)
	if err != nil {
		return nil, err
	}
	abs, err := s.dash.ListStaffAbsences(ctx, salonID, staffID)
	if err != nil {
		return nil, err
	}
	return &StaffScheduleBundle{Rows: rows, Absences: abs}, nil
}

func (s *dashboardService) PutStaffScheduleBundle(ctx context.Context, salonID, staffID uuid.UUID, in StaffSchedulePayload) error {
	if len(in.Rows) > 0 {
		out := make([]model.SalonMasterHour, 0, len(in.Rows))
		for _, r := range in.Rows {
			if r.DayOfWeek < 0 || r.DayOfWeek > 6 {
				return fmt.Errorf("invalid day_of_week")
			}
			o := model.SalonMasterHour{
				DayOfWeek: r.DayOfWeek,
				IsDayOff:  r.IsDayOff,
				OpensAt:   "10:00:00",
				ClosesAt:  "18:00:00",
			}
			if !r.IsDayOff {
				if r.OpensAt == "" || r.ClosesAt == "" {
					return fmt.Errorf("opens_at and closes_at required when not day off")
				}
				o.OpensAt = normalizeTimeStr(r.OpensAt)
				o.ClosesAt = normalizeTimeStr(r.ClosesAt)
			}
			bs, be := normalizeBreakPair(r.BreakStartsAt, r.BreakEndsAt)
			o.BreakStartsAt = bs
			o.BreakEndsAt = be
			out = append(out, o)
		}
		if err := s.dash.ReplaceStaffWorkingHours(ctx, staffID, salonID, out); err != nil {
			return err
		}
	}
	if in.Absences != nil {
		rows := make([]model.SalonMasterAbsence, 0, len(in.Absences))
		for _, a := range in.Absences {
			s0, err := time.Parse("2006-01-02", a.StartsOn)
			if err != nil {
				return fmt.Errorf("invalid absence startsOn")
			}
			s1, err := time.Parse("2006-01-02", a.EndsOn)
			if err != nil {
				return fmt.Errorf("invalid absence endsOn")
			}
			kind := a.Kind
			if kind == "" {
				kind = "vacation"
			}
			rows = append(rows, model.SalonMasterAbsence{
				SalonMasterID: staffID,
				StartsOn: s0,
				EndsOn:   s1,
				Kind:     kind,
			})
		}
		if err := s.dash.ReplaceStaffAbsences(ctx, salonID, staffID, rows); err != nil {
			return err
		}
	}
	return nil
}

func dayBoundsInTZ(loc *time.Location, t time.Time) (startUTC, endUTC time.Time) {
	local := t.In(loc)
	start := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, loc)
	end := start.Add(24 * time.Hour)
	return start.UTC(), end.UTC()
}

func (s *dashboardService) Stats(ctx context.Context, salonID uuid.UUID, period string) (*DashboardStats, error) {
	salon, err := s.dash.FindSalonModel(ctx, salonID)
	if err != nil {
		return nil, err
	}
	if salon == nil {
		return nil, fmt.Errorf("salon not found")
	}
	loc, err := time.LoadLocation(salon.Timezone)
	if err != nil {
		loc = time.UTC
	}
	now := time.Now().In(loc)
	dayStart, dayEnd := dayBoundsInTZ(loc, now)

	todayTotal, err := s.dash.CountAppointments(ctx, salonID, &dayStart, &dayEnd, "")
	if err != nil {
		return nil, err
	}
	todayConf, err := s.dash.CountAppointments(ctx, salonID, &dayStart, &dayEnd, "confirmed")
	if err != nil {
		return nil, err
	}
	pending, err := s.dash.CountAppointments(ctx, salonID, nil, nil, "pending")
	if err != nil {
		return nil, err
	}

	weekStart := now.AddDate(0, 0, -7)
	weekStartUTC := weekStart.UTC()
	nowUTC := now.UTC()
	weekNew, err := s.dash.CountAppointments(ctx, salonID, &weekStartUTC, &nowUTC, "")
	if err != nil {
		return nil, err
	}
	prevWeekStart := now.AddDate(0, 0, -14).UTC()
	prevWeekEnd := now.AddDate(0, 0, -7).UTC()
	prevNew, err := s.dash.CountAppointments(ctx, salonID, &prevWeekStart, &prevWeekEnd, "")
	if err != nil {
		return nil, err
	}

	var pct float64
	if prevNew > 0 {
		pct = float64(weekNew-prevNew) / float64(prevNew) * 100
	} else if weekNew > 0 {
		pct = 100
	}

	load := float64(0)
	if todayTotal > 0 {
		load = float64(todayConf) / float64(todayTotal) * 100
		if load > 100 {
			load = 100
		}
	}

	rating := 0.0
	rc := 0
	if salon.CachedRating != nil {
		rating = *salon.CachedRating
	}
	if salon.CachedReviewCount != nil {
		rc = *salon.CachedReviewCount
	}
	_ = period

	return &DashboardStats{
		AppointmentsToday:          todayTotal,
		AppointmentsTodayConfirmed: todayConf,
		NewAppointmentsWeek:        weekNew,
		NewAppointmentsPrevWeek:    prevNew,
		WeekChangePct:              pct,
		LoadPct:                    load,
		Rating:                     rating,
		ReviewCount:                rc,
		PendingCount:               pending,
	}, nil
}

func (s *dashboardService) GetSalonProfile(ctx context.Context, salonID uuid.UUID) (*model.Salon, error) {
	return s.dash.FindSalonModel(ctx, salonID)
}

func (s *dashboardService) PutSalonProfile(ctx context.Context, salonID uuid.UUID, in SalonProfileInput) (*model.Salon, error) {
	salon, err := s.dash.FindSalonModel(ctx, salonID)
	if err != nil {
		return nil, err
	}
	if salon == nil {
		return nil, gorm.ErrRecordNotFound
	}
	if in.NameOverride != nil {
		salon.NameOverride = in.NameOverride
	}
	if in.Description != nil {
		salon.Description = in.Description
	}
	if in.PhonePublic != nil {
		salon.PhonePublic = in.PhonePublic
	}
	if in.CategoryID != nil {
		salon.CategoryID = in.CategoryID
	}
	if in.SalonType != nil {
		t := trimSpace(*in.SalonType)
		if t == "" {
			salon.SalonType = nil
		} else if !servicecategory.ValidSalonType(t) {
			return nil, fmt.Errorf("invalid salonType")
		} else {
			salon.SalonType = &t
		}
	}
	if in.BusinessType != nil {
		salon.BusinessType = in.BusinessType
	}
	if in.OnlineBookingEnabled != nil {
		salon.OnlineBookingEnabled = *in.OnlineBookingEnabled
	}
	if in.AddressOverride != nil {
		salon.AddressOverride = in.AddressOverride
	}
	if in.District != nil {
		salon.District = in.District
	}
	if in.Address != nil {
		salon.Address = in.Address
	}
	if in.Lat != nil {
		salon.Lat = in.Lat
	}
	if in.Lng != nil {
		salon.Lng = in.Lng
	}
	if in.PhotoURL != nil {
		salon.PhotoURL = in.PhotoURL
	}
	if in.Timezone != nil && trimSpace(*in.Timezone) != "" {
		salon.Timezone = trimSpace(*in.Timezone)
	}
	if err := s.dash.UpdateSalonProfile(ctx, salon); err != nil {
		return nil, err
	}
	return s.dash.FindSalonModel(ctx, salonID)
}

func (s *dashboardService) LookupMasterByPhone(ctx context.Context, phoneE164 string) (*model.MasterProfile, bool, error) {
	p := strings.TrimSpace(phoneE164)
	if p == "" {
		return nil, false, fmt.Errorf("phone required")
	}
	p = strings.ReplaceAll(p, " ", "")
	p = strings.ReplaceAll(p, "-", "")
	if strings.HasPrefix(p, "8") && len(p) == 11 {
		p = "+7" + p[1:]
	}
	if !phoneDashRe.MatchString(p) {
		return nil, false, fmt.Errorf("invalid phone, use E.164 +7XXXXXXXXXX")
	}
	mp, err := s.dash.GetMasterProfileByPhoneE164(ctx, p)
	if err != nil {
		return nil, false, err
	}
	if mp == nil {
		return nil, false, nil
	}
	return mp, true, nil
}

func (s *dashboardService) CreateMasterInvite(ctx context.Context, salonID, masterProfileID uuid.UUID) (*model.SalonMaster, error) {
	mp, err := s.dash.GetMasterProfile(ctx, masterProfileID)
	if err != nil {
		return nil, err
	}
	if mp == nil {
		return nil, fmt.Errorf("master profile not found")
	}
	st := &model.SalonMaster{
		SalonID:               salonID,
		MasterID:              &masterProfileID,
		DisplayName:           mp.DisplayName,
		IsActive:              false,
		Status:                "pending",
		DashboardAccess:       false,
		TelegramNotifications: true,
	}
	if err := s.dash.CreateStaff(ctx, st); err != nil {
		return nil, err
	}
	return st, nil
}

func (s *dashboardService) ReplaceSalonMasterServices(ctx context.Context, salonID, salonMasterID uuid.UUID, rows []SalonMasterServiceAssignmentInput) error {
	out := make([]repository.SalonMasterServiceAssignment, 0, len(rows))
	for _, a := range rows {
		var po *int
		if a.PriceOverrideCents != nil {
			v := int(*a.PriceOverrideCents)
			po = &v
		}
		out = append(out, repository.SalonMasterServiceAssignment{
			ServiceID:               a.ServiceID,
			PriceOverrideCents:      po,
			DurationOverrideMinutes: a.DurationOverrideMinutes,
		})
	}
	return s.dash.ReplaceSalonMasterServiceAssignments(ctx, salonID, salonMasterID, out)
}
