package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

func calculateDurationBasedEnd(start time.Time, overrideStart *time.Time, totalDurationMinutes int) time.Time {
	baseStart := start
	if overrideStart != nil {
		baseStart = overrideStart.UTC()
	}
	return baseStart.Add(time.Duration(totalDurationMinutes) * time.Minute).UTC()
}

func (s *dashboardService) Membership(ctx context.Context, userID, salonID uuid.UUID) (*repository.SalonMembership, error) {
	return s.dash.FindMembershipForUserAndSalon(ctx, userID, salonID)
}

func (s *dashboardService) GetAppointment(ctx context.Context, salonID, appointmentID uuid.UUID) (*AppointmentDetailDTO, error) {
	a, err := s.dash.GetAppointment(ctx, salonID, appointmentID)
	if err != nil {
		return nil, err
	}
	if a == nil {
		return nil, nil
	}

	items, err := s.dash.ListAppointmentLineItems(ctx, appointmentID)
	if err != nil {
		return nil, err
	}

	var staffName *string
	if a.SalonMasterID != nil {
		st, _ := s.dash.GetStaff(ctx, salonID, *a.SalonMasterID)
		if st != nil {
			staffName = &st.DisplayName
		}
	}

	var sid uuid.UUID
	if a.SalonID != nil {
		sid = *a.SalonID
	}

	dto := &AppointmentDetailDTO{
		ID:            a.ID,
		SalonID:       sid,
		StartsAt:      a.StartsAt,
		EndsAt:        a.EndsAt,
		Status:        a.Status,
		SalonMasterID: a.SalonMasterID,
		StaffName:     staffName,
		GuestName:     a.GuestName,
		GuestPhone:    a.GuestPhoneE164,
		ClientUserID:  a.ClientUserID,
		ClientNote:    a.ClientNote,
		SalonClientID: a.SalonClientID,
		CreatedAt:     a.CreatedAt,
		Services:      []AppointmentServiceDTO{},
	}

	for _, it := range items {
		dto.Services = append(dto.Services, AppointmentServiceDTO{
			ID:              it.ServiceID,
			Name:            it.ServiceName,
			DurationMinutes: it.DurationMinutes,
			PriceCents:      it.PriceCents,
		})
	}

	// Fallback to legacy single service if no line items found
	if len(dto.Services) == 0 {
		svc, _ := s.dash.GetService(ctx, salonID, a.ServiceID)
		if svc != nil {
			price := int64(0)
			if svc.PriceCents != nil {
				price = *svc.PriceCents
			}
			dto.Services = append(dto.Services, AppointmentServiceDTO{
				ID:              svc.ID,
				Name:            svc.Name,
				DurationMinutes: svc.DurationMinutes,
				PriceCents:      price,
			})
		}
	}

	return dto, nil
}

func (s *dashboardService) ListAppointments(ctx context.Context, salonID uuid.UUID, f repository.AppointmentListFilter) ([]repository.AppointmentListRow, int64, error) {
	f.SalonID = salonID
	return s.dash.ListAppointments(ctx, f)
}

func (s *dashboardService) CreateManualAppointment(ctx context.Context, salonID uuid.UUID, in ManualAppointmentInput) (*model.Appointment, error) {
	if len(in.ServiceIDs) == 0 {
		return nil, fmt.Errorf("at least one service is required")
	}

	var services []model.SalonService
	var totalDuration int
	for _, sid := range in.ServiceIDs {
		svc, err := s.dash.GetService(ctx, salonID, sid)
		if err != nil {
			return nil, err
		}
		if svc == nil || !svc.IsActive {
			return nil, fmt.Errorf("service %s not found", sid)
		}
		services = append(services, *svc)
		totalDuration += svc.DurationMinutes
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

	primaryServiceID := services[0].ID
	end := in.StartsAt.Add(time.Duration(totalDuration) * time.Minute)

	ap := &model.Appointment{
		SalonID:        &salonID,
		ServiceID:      primaryServiceID, // Legacy field for compatibility
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
	if s.clients != nil {
		if in.ClientUserID != nil {
			sc, scErr := s.clients.GetOrCreateByUserID(ctx, salonID, *in.ClientUserID, name)
			if scErr == nil {
				ap.SalonClientID = &sc.ID
			}
		} else {
			sc, scErr := s.clients.GetOrCreateByPhone(ctx, salonID, phone, name)
			if scErr == nil {
				ap.SalonClientID = &sc.ID
			}
		}
	}
	if err := s.dash.CreateAppointment(ctx, ap); err != nil {
		return nil, err
	}

	// Create line items
	var lineItems []model.AppointmentLineItem
	for i, svc := range services {
		lineItems = append(lineItems, model.AppointmentLineItem{
			AppointmentID:   ap.ID,
			ServiceID:       svc.ID,
			ServiceName:     svc.Name,
			DurationMinutes: svc.DurationMinutes,
			PriceCents:      0, // Default for now
			SortOrder:       i,
		})
		if svc.PriceCents != nil {
			lineItems[i].PriceCents = *svc.PriceCents
		}
	}
	if err := s.dash.ReplaceAppointmentLineItems(ctx, ap.ID, lineItems); err != nil {
		return nil, err
	}

	payload, _ := json.Marshal(map[string]any{
		"appointmentId": ap.ID,
		"salonId":       salonID,
		"startsAt":      ap.StartsAt,
		"status":        ap.Status,
		"guestName":     name,
		"guestPhone":    phone,
	})
	s.notifier.NotifySalonMembers(ctx, salonID, ap.SalonMasterID, "appointment.created", "Новая запись", "Появилась новая запись в расписании", payload)

	return ap, nil
}

func allowedStatusTransition(from, to string) bool {
	switch from {
	case "pending":
		return to == "confirmed" || to == "cancelled_by_salon" || to == "cancelled_by_client" // reserved: client cancellation
	case "confirmed":
		return to == "completed" || to == "no_show" || to == "cancelled_by_salon" || to == "cancelled_by_client" // reserved: client cancellation
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
	if err := s.dash.UpdateAppointmentStatus(ctx, salonID, appointmentID, newStatus); err != nil {
		return err
	}
	payload, _ := json.Marshal(map[string]any{
		"appointmentId": appointmentID,
		"salonId":       salonID,
		"from":          a.Status,
		"to":            newStatus,
	})
	s.notifier.NotifySalonMembers(ctx, salonID, a.SalonMasterID, "appointment.status_changed", "Статус записи изменен", "Запись обновлена", payload)
	return nil
}

func (s *dashboardService) UpdateAppointment(ctx context.Context, salonID uuid.UUID, in UpdateAppointmentInput) error {
	a, err := s.dash.GetAppointment(ctx, salonID, in.AppointmentID)
	if err != nil {
		return err
	}
	if a == nil {
		return gorm.ErrRecordNotFound
	}
	if a.Status != "pending" && a.Status != "confirmed" {
		return fmt.Errorf("appointment cannot be edited in current status")
	}

	hasStructuralChanges := len(in.ServiceIDs) > 0 || in.StaffID != nil || in.ClearStaffID ||
		in.StartsAt != nil || in.EndsAt != nil || in.GuestName != nil || in.GuestPhone != nil

	var servicesUpdated bool
	if len(in.ServiceIDs) > 0 {
		var services []model.SalonService
		var totalDuration int
		for _, sid := range in.ServiceIDs {
			svc, err := s.dash.GetService(ctx, salonID, sid)
			if err != nil {
				return err
			}
			if svc == nil {
				return fmt.Errorf("service %s not found", sid)
			}
			services = append(services, *svc)
			totalDuration += svc.DurationMinutes
		}
		a.ServiceID = services[0].ID // Legacy primary service

		// Update line items
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
				li.PriceCents = *svc.PriceCents
			}
			lineItems = append(lineItems, li)
		}
		if err := s.dash.ReplaceAppointmentLineItems(ctx, a.ID, lineItems); err != nil {
			return err
		}

		// Recalculate duration-based EndsAt if not explicitly provided
		if in.EndsAt == nil {
			a.EndsAt = calculateDurationBasedEnd(a.StartsAt, in.StartsAt, totalDuration)
		}
		servicesUpdated = true
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
		oldStart := a.StartsAt
		a.StartsAt = in.StartsAt.UTC()
		// If only start changed, shift ends_at by same amount if not explicitly provided
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

	if a.EndsAt.Before(a.StartsAt) {
		return fmt.Errorf("ends_at before starts_at")
	}
	if a.Status == "confirmed" && hasStructuralChanges {
		a.Status = "pending"
	}
	return s.dash.UpdateAppointment(ctx, a)
}
