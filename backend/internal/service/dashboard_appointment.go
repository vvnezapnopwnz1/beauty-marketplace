package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

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
