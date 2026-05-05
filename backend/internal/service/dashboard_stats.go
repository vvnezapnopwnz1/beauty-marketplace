package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
	"github.com/beauty-marketplace/backend/internal/servicecategory"
	"gorm.io/gorm"
)

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

func (s *dashboardService) GetSalonCategoryScopes(ctx context.Context, salonID uuid.UUID) ([]string, error) {
	salon, err := s.dash.FindSalonModel(ctx, salonID)
	if err != nil {
		return nil, err
	}
	return s.salonCategoryScopes(ctx, salon)
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
	if in.SalonCategoryScopes != nil {
		scopes, err := validateSalonCategoryScopes(*in.SalonCategoryScopes)
		if err != nil {
			return nil, err
		}
		if err := s.dash.ReplaceSalonCategoryScopes(ctx, salonID, scopes); err != nil {
			return nil, err
		}
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
	if in.OnboardingCompleted != nil && *in.OnboardingCompleted {
		salon.OnboardingCompleted = true
	}
	if err := s.dash.UpdateSalonProfile(ctx, salon); err != nil {
		return nil, err
	}
	return s.dash.FindSalonModel(ctx, salonID)
}

func validateSalonCategoryScopes(raw []string) ([]string, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	allowed := make(map[string]struct{}, len(servicecategory.ParentSlugs))
	for _, slug := range servicecategory.ParentSlugs {
		allowed[slug] = struct{}{}
	}
	seen := make(map[string]struct{}, len(raw))
	out := make([]string, 0, len(raw))
	for _, item := range raw {
		slug := trimSpace(item)
		if slug == "" {
			continue
		}
		if _, ok := allowed[slug]; !ok {
			return nil, fmt.Errorf("invalid salon category scope: %s", slug)
		}
		if _, ok := seen[slug]; ok {
			continue
		}
		seen[slug] = struct{}{}
		out = append(out, slug)
	}
	return out, nil
}
