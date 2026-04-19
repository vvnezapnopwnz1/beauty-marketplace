package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
)

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
				StartsOn:      s0,
				EndsOn:        s1,
				Kind:          kind,
			})
		}
		if err := s.dash.ReplaceStaffAbsences(ctx, salonID, staffID, rows); err != nil {
			return err
		}
	}
	return nil
}
