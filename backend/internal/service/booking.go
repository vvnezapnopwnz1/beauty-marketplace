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

var phoneGuestRe = regexp.MustCompile(`^\+7\d{10}$`)

// BookingService creates guest appointments (no user account).
type BookingService interface {
	CreateGuestBooking(ctx context.Context, in GuestBookingInput) (*GuestBookingResult, error)
}

type bookingService struct {
	salons  repository.SalonRepository
	appts   repository.AppointmentRepository
}

// NewBookingService constructs BookingService.
func NewBookingService(
	salons repository.SalonRepository,
	appts repository.AppointmentRepository,
) BookingService {
	return &bookingService{salons: salons, appts: appts}
}

// GuestBookingInput is a public booking request without auth.
type GuestBookingInput struct {
	SalonID   uuid.UUID
	ServiceID uuid.UUID
	Name      string
	PhoneE164 string
	Note      string
}

// GuestBookingResult is returned after a successful insert.
type GuestBookingResult struct {
	AppointmentID uuid.UUID `json:"appointmentId"`
	StartsAt      time.Time `json:"startsAt"`
	EndsAt        time.Time `json:"endsAt"`
}

func (s *bookingService) CreateGuestBooking(ctx context.Context, in GuestBookingInput) (*GuestBookingResult, error) {
	name := trimSpace(in.Name)
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if !phoneGuestRe.MatchString(in.PhoneE164) {
		return nil, fmt.Errorf("invalid phone, use E.164 +7XXXXXXXXXX")
	}

	salon, err := s.salons.FindByID(ctx, in.SalonID)
	if err != nil {
		return nil, err
	}
	if salon == nil {
		return nil, fmt.Errorf("salon not found")
	}
	if !salon.OnlineBookingEnabled {
		return nil, fmt.Errorf("online booking is disabled for this salon")
	}

	svcRow, err := s.appts.FindServiceForSalon(ctx, in.SalonID, in.ServiceID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("service not found for this salon")
		}
		return nil, err
	}

	startsAt, endsAt := nextGuestSlot(salon.Timezone, svcRow.DurationMinutes)

	guestName := name
	guestPhone := in.PhoneE164
	note := trimSpace(in.Note)
	var clientNote *string
	if note != "" {
		clientNote = &note
	}

	appt := &model.Appointment{
		SalonID:        in.SalonID,
		ServiceID:      svcRow.ID,
		GuestName:      &guestName,
		GuestPhoneE164: &guestPhone,
		StartsAt:       startsAt,
		EndsAt:         endsAt,
		Status:         "pending",
		ClientNote:     clientNote,
	}

	if err := s.appts.Create(ctx, appt); err != nil {
		return nil, fmt.Errorf("create appointment: %w", err)
	}

	return &GuestBookingResult{
		AppointmentID: appt.ID,
		StartsAt:        startsAt,
		EndsAt:          endsAt,
	}, nil
}

func trimSpace(s string) string {
	for len(s) > 0 && (s[0] == ' ' || s[0] == '\t' || s[0] == '\n') {
		s = s[1:]
	}
	for len(s) > 0 && (s[len(s)-1] == ' ' || s[len(s)-1] == '\t' || s[len(s)-1] == '\n') {
		s = s[:len(s)-1]
	}
	return s
}

// nextGuestSlot picks tomorrow 10:00 in salon timezone as a placeholder slot until a real calendar exists.
func nextGuestSlot(timezone string, durationMin int) (time.Time, time.Time) {
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		loc = time.UTC
	}
	now := time.Now().In(loc)
	tomorrow := now.AddDate(0, 0, 1)
	start := time.Date(tomorrow.Year(), tomorrow.Month(), tomorrow.Day(), 10, 0, 0, 0, loc)
	end := start.Add(time.Duration(durationMin) * time.Minute)
	return start.UTC(), end.UTC()
}
