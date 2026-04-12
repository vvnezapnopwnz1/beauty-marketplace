package service

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
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
	CreateService(ctx context.Context, salonID uuid.UUID, in ServiceInput) (*model.SalonService, error)
	UpdateService(ctx context.Context, salonID, serviceID uuid.UUID, in ServiceInput) (*model.SalonService, error)
	DeleteService(ctx context.Context, salonID, serviceID uuid.UUID) error

	ListStaff(ctx context.Context, salonID uuid.UUID) ([]model.Staff, error)
	CreateStaff(ctx context.Context, salonID uuid.UUID, name string) (*model.Staff, error)
	UpdateStaff(ctx context.Context, salonID, staffID uuid.UUID, name string, active bool) (*model.Staff, error)
	DeleteStaff(ctx context.Context, salonID, staffID uuid.UUID) error

	GetSchedule(ctx context.Context, salonID uuid.UUID) ([]model.WorkingHour, error)
	PutSchedule(ctx context.Context, salonID uuid.UUID, rows []WorkingHourInput) error

	GetStaffSchedule(ctx context.Context, salonID, staffID uuid.UUID) ([]model.StaffWorkingHour, error)
	PutStaffSchedule(ctx context.Context, salonID, staffID uuid.UUID, rows []StaffWorkingHourInput) error

	Stats(ctx context.Context, salonID uuid.UUID, period string) (*DashboardStats, error)
	GetSalonProfile(ctx context.Context, salonID uuid.UUID) (*model.Salon, error)
	PutSalonProfile(ctx context.Context, salonID uuid.UUID, in SalonProfileInput) (*model.Salon, error)
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
	ServiceID     *uuid.UUID
	ClientNote    *string
}

type ServiceInput struct {
	Name              string `json:"name"`
	DurationMinutes   int    `json:"durationMinutes"`
	PriceCents        *int64 `json:"priceCents"`
	IsActive          bool   `json:"isActive"`
	SortOrder         int    `json:"sortOrder"`
}

type WorkingHourInput struct {
	DayOfWeek int16  `json:"dayOfWeek"`
	OpensAt   string `json:"opensAt"`
	ClosesAt  string `json:"closesAt"`
	Closed    bool   `json:"closed"`
}

type StaffWorkingHourInput struct {
	DayOfWeek int16  `json:"dayOfWeek"`
	OpensAt   string `json:"opensAt"`
	ClosesAt  string `json:"closesAt"`
	IsDayOff  bool   `json:"isDayOff"`
}

type SalonProfileInput struct {
	NameOverride          *string  `json:"nameOverride"`
	Description           *string  `json:"description"`
	PhonePublic           *string  `json:"phonePublic"`
	CategoryID            *string  `json:"categoryId"`
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

type dashboardService struct {
	dash repository.DashboardRepository
}

// NewDashboardService constructs DashboardService.
func NewDashboardService(dash repository.DashboardRepository) DashboardService {
	return &dashboardService{dash: dash}
}

var phoneDashRe = regexp.MustCompile(`^\+7\d{10}$`)

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
		StaffID:        in.StaffID,
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
	if in.StaffID != nil {
		if *in.StaffID != uuid.Nil {
			st, err := s.dash.GetStaff(ctx, salonID, *in.StaffID)
			if err != nil {
				return err
			}
			if st == nil {
				return fmt.Errorf("staff not found")
			}
		}
		a.StaffID = in.StaffID
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
	if a.EndsAt.Before(a.StartsAt) {
		return fmt.Errorf("ends_at before starts_at")
	}
	return s.dash.UpdateAppointment(ctx, a)
}

func (s *dashboardService) ListServices(ctx context.Context, salonID uuid.UUID) ([]model.SalonService, error) {
	return s.dash.ListServices(ctx, salonID)
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
		DurationMinutes: in.DurationMinutes,
		PriceCents:      in.PriceCents,
		IsActive:        in.IsActive,
		SortOrder:       in.SortOrder,
	}
	if err := s.dash.CreateService(ctx, svc); err != nil {
		return nil, err
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
	svc.PriceCents = in.PriceCents
	svc.IsActive = in.IsActive
	svc.SortOrder = in.SortOrder
	if err := s.dash.UpdateService(ctx, svc); err != nil {
		return nil, err
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

func (s *dashboardService) ListStaff(ctx context.Context, salonID uuid.UUID) ([]model.Staff, error) {
	return s.dash.ListStaff(ctx, salonID)
}

func (s *dashboardService) CreateStaff(ctx context.Context, salonID uuid.UUID, name string) (*model.Staff, error) {
	n := trimSpace(name)
	if n == "" {
		return nil, fmt.Errorf("display name is required")
	}
	st := &model.Staff{SalonID: salonID, DisplayName: n, IsActive: true}
	if err := s.dash.CreateStaff(ctx, st); err != nil {
		return nil, err
	}
	return st, nil
}

func (s *dashboardService) UpdateStaff(ctx context.Context, salonID, staffID uuid.UUID, name string, active bool) (*model.Staff, error) {
	st, err := s.dash.GetStaff(ctx, salonID, staffID)
	if err != nil {
		return nil, err
	}
	if st == nil {
		return nil, gorm.ErrRecordNotFound
	}
	if trimSpace(name) != "" {
		st.DisplayName = trimSpace(name)
	}
	st.IsActive = active
	if err := s.dash.UpdateStaff(ctx, st); err != nil {
		return nil, err
	}
	return st, nil
}

func (s *dashboardService) DeleteStaff(ctx context.Context, salonID, staffID uuid.UUID) error {
	return s.dash.SoftDeleteStaff(ctx, salonID, staffID)
}

func (s *dashboardService) GetSchedule(ctx context.Context, salonID uuid.UUID) ([]model.WorkingHour, error) {
	return s.dash.ListWorkingHours(ctx, salonID)
}

func (s *dashboardService) PutSchedule(ctx context.Context, salonID uuid.UUID, rows []WorkingHourInput) error {
	out := make([]model.WorkingHour, 0, len(rows))
	for _, r := range rows {
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
		out = append(out, model.WorkingHour{
			DayOfWeek: r.DayOfWeek,
			OpensAt:   normalizeTimeStr(r.OpensAt),
			ClosesAt:  normalizeTimeStr(r.ClosesAt),
			IsClosed:  false,
		})
	}
	return s.dash.ReplaceWorkingHours(ctx, salonID, out)
}

func normalizeTimeStr(s string) string {
	if len(s) == 5 && s[2] == ':' {
		return s + ":00"
	}
	return s
}

func (s *dashboardService) GetStaffSchedule(ctx context.Context, salonID, staffID uuid.UUID) ([]model.StaffWorkingHour, error) {
	return s.dash.ListStaffWorkingHours(ctx, staffID, salonID)
}

func (s *dashboardService) PutStaffSchedule(ctx context.Context, salonID, staffID uuid.UUID, rows []StaffWorkingHourInput) error {
	out := make([]model.StaffWorkingHour, 0, len(rows))
	for _, r := range rows {
		if r.DayOfWeek < 0 || r.DayOfWeek > 6 {
			return fmt.Errorf("invalid day_of_week")
		}
		o := model.StaffWorkingHour{
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
		out = append(out, o)
	}
	return s.dash.ReplaceStaffWorkingHours(ctx, staffID, salonID, out)
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
