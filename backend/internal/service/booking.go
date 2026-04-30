package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

const bookingMaxGuestServices = 10

var phoneGuestRe = regexp.MustCompile(`^\+7\d{10}$`)

// ErrBookingUnavailable indicates no free slots in the lookahead window.
var ErrBookingUnavailable = errors.New("booking unavailable: no free slots in the next 7 days")

// BookingService creates guest appointments and exposes slot availability.
type BookingService interface {
	CreateGuestBooking(ctx context.Context, in GuestBookingInput) (*GuestBookingResult, error)
	GetAvailableSlots(ctx context.Context, p SlotParams) ([]AvailableSlot, []SlotMasterInfo, *SlotsMeta, error)
}

type bookingService struct {
	salons   repository.SalonRepository
	appts    repository.AppointmentRepository
	slots    repository.BookingSlotsRepository
	clients  repository.SalonClientRepository
	notifier AppointmentNotifier
	now      func() time.Time
}

// NewBookingService constructs BookingService.
func NewBookingService(
	salons repository.SalonRepository,
	appts repository.AppointmentRepository,
	slots repository.BookingSlotsRepository,
	clients repository.SalonClientRepository,
	notifier AppointmentNotifier,
) BookingService {
	return &bookingService{salons: salons, appts: appts, slots: slots, clients: clients, notifier: notifier, now: time.Now}
}

// GuestBookingInput is a public booking request without auth.
// ServiceIDs lists all booked services (order preserved); ServiceID must be the first service for legacy fields.
type GuestBookingInput struct {
	SalonID         uuid.UUID
	ServiceID       uuid.UUID
	ServiceIDs      []uuid.UUID
	Name            string
	PhoneE164       string
	Note            string
	StartsAt        *time.Time
	EndsAt          *time.Time
	SalonMasterID   *uuid.UUID
	MasterProfileID *uuid.UUID
}

// GuestBookingResult is returned after a successful insert.
type GuestBookingResult struct {
	AppointmentID uuid.UUID  `json:"appointmentId"`
	StartsAt      time.Time  `json:"startsAt"`
	EndsAt        time.Time  `json:"endsAt"`
	SalonMasterID *uuid.UUID `json:"salonMasterId,omitempty"`
}

// SlotParams are the inputs for GetAvailableSlots.
type SlotParams struct {
	SalonID         uuid.UUID
	Date            time.Time // date (time-of-day ignored)
	ServiceID       *uuid.UUID
	ServiceIDs      []uuid.UUID // if non-empty after dedupe, used for duration and master filtering
	SalonMasterID   *uuid.UUID  // filter to one master (resolved salon_masters.id)
	MasterProfileID *uuid.UUID  // filter to one master by master_profiles.id
}

// AvailableSlot is a free time window for a specific master.
type AvailableSlot struct {
	StartsAt      time.Time `json:"startsAt"`
	EndsAt        time.Time `json:"endsAt"`
	SalonMasterID uuid.UUID `json:"salonMasterId"`
	MasterName    string    `json:"masterName"`
}

// SlotMasterInfo summarises a master that participated in the slots query.
type SlotMasterInfo struct {
	SalonMasterID uuid.UUID `json:"salonMasterId"`
	MasterName    string    `json:"masterName"`
}

// SlotsMeta is the contextual info returned alongside the slots list.
type SlotsMeta struct {
	Date                string `json:"date"`
	SlotDurationMinutes int    `json:"slotDurationMinutes"`
}

func guestBookingServiceIDs(in GuestBookingInput) []uuid.UUID {
	if len(in.ServiceIDs) > 0 {
		return dedupeUUIDsPreserve(in.ServiceIDs)
	}
	if in.ServiceID != uuid.Nil {
		return []uuid.UUID{in.ServiceID}
	}
	return nil
}

func dedupeUUIDsPreserve(in []uuid.UUID) []uuid.UUID {
	seen := make(map[uuid.UUID]struct{}, len(in))
	out := make([]uuid.UUID, 0, len(in))
	for _, id := range in {
		if id == uuid.Nil {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}

func bookingEffectivePriceCents(salonPrice *int64, override *int) int64 {
	if override != nil {
		return int64(*override)
	}
	if salonPrice != nil {
		return *salonPrice
	}
	return 0
}

func bookingEffectiveDurationMinutes(salonDur int, override *int) int {
	if override != nil {
		return *override
	}
	return salonDur
}

func (s *bookingService) totalBookingMinutes(ctx context.Context, salonID uuid.UUID, salonMasterID *uuid.UUID, serviceIDs []uuid.UUID) (int, error) {
	total := 0
	for _, sid := range serviceIDs {
		svcRow, err := s.appts.FindServiceForSalon(ctx, salonID, sid)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return 0, fmt.Errorf("service not found for this salon")
			}
			return 0, err
		}
		d := svcRow.DurationMinutes
		if salonMasterID != nil {
			durO, _, err := s.slots.GetMasterServiceOverrides(ctx, *salonMasterID, sid)
			if err != nil {
				return 0, err
			}
			d = bookingEffectiveDurationMinutes(svcRow.DurationMinutes, durO)
		}
		if d <= 0 {
			d = svcRow.DurationMinutes
		}
		total += d
	}
	return total, nil
}

func (s *bookingService) CreateGuestBooking(ctx context.Context, in GuestBookingInput) (*GuestBookingResult, error) {
	name := trimSpace(in.Name)
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if !phoneGuestRe.MatchString(in.PhoneE164) {
		return nil, fmt.Errorf("invalid phone, use E.164 +7XXXXXXXXXX")
	}

	svcIDs := guestBookingServiceIDs(in)
	if len(svcIDs) == 0 {
		return nil, fmt.Errorf("at least one service is required")
	}
	if len(svcIDs) > bookingMaxGuestServices {
		return nil, fmt.Errorf("too many services (max %d)", bookingMaxGuestServices)
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

	for _, sid := range svcIDs {
		_, err := s.appts.FindServiceForSalon(ctx, in.SalonID, sid)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, fmt.Errorf("service not found for this salon")
			}
			return nil, err
		}
	}
	primary := svcIDs[0]

	var salonMasterID *uuid.UUID
	if in.SalonMasterID != nil {
		salonMasterID = in.SalonMasterID
	} else if in.MasterProfileID != nil {
		m, err := s.slots.GetSalonMasterByProfileID(ctx, in.SalonID, *in.MasterProfileID)
		if err != nil {
			return nil, err
		}
		if m != nil {
			id := m.ID
			salonMasterID = &id
		}
	}

	if salonMasterID != nil {
		covers, err := s.slots.ListSalonMastersCoveringServices(ctx, in.SalonID, svcIDs)
		if err != nil {
			return nil, err
		}
		allowed := make(map[uuid.UUID]struct{}, len(covers))
		for _, id := range covers {
			allowed[id] = struct{}{}
		}
		if _, ok := allowed[*salonMasterID]; !ok {
			return nil, fmt.Errorf("master does not provide all selected services")
		}
	}

	var startsAt, endsAt time.Time
	if in.StartsAt != nil && in.EndsAt != nil {
		startsAt = in.StartsAt.UTC()
		endsAt = in.EndsAt.UTC()
		if !endsAt.After(startsAt) {
			return nil, fmt.Errorf("invalid slot: endsAt must be after startsAt")
		}
		expectedMin, err := s.totalBookingMinutes(ctx, in.SalonID, salonMasterID, svcIDs)
		if err != nil {
			return nil, err
		}
		gotMin := int(endsAt.Sub(startsAt) / time.Minute)
		if gotMin != expectedMin {
			return nil, fmt.Errorf("slot duration does not match selected services")
		}
	} else {
		startsAt, endsAt, salonMasterID, err = s.pickNextSlot(ctx, in.SalonID, svcIDs, salonMasterID)
		if err != nil {
			return nil, err
		}
	}

	guestName := name
	guestPhone := in.PhoneE164
	note := trimSpace(in.Note)
	var clientNote *string
	if note != "" {
		clientNote = &note
	}

	appt := &model.Appointment{
		SalonID:        in.SalonID,
		ServiceID:      primary,
		GuestName:      &guestName,
		GuestPhoneE164: &guestPhone,
		SalonMasterID:  salonMasterID,
		StartsAt:       startsAt,
		EndsAt:         endsAt,
		Status:         "pending",
		ClientNote:     clientNote,
	}

	lines := make([]model.AppointmentLineItem, 0, len(svcIDs))
	for i, sid := range svcIDs {
		svcRow, err := s.appts.FindServiceForSalon(ctx, in.SalonID, sid)
		if err != nil {
			return nil, err
		}
		var durO, priceO *int
		if salonMasterID != nil {
			durO, priceO, err = s.slots.GetMasterServiceOverrides(ctx, *salonMasterID, sid)
			if err != nil {
				return nil, err
			}
		}
		dur := bookingEffectiveDurationMinutes(svcRow.DurationMinutes, durO)
		if dur <= 0 {
			dur = svcRow.DurationMinutes
		}
		price := bookingEffectivePriceCents(svcRow.PriceCents, priceO)
		lines = append(lines, model.AppointmentLineItem{
			ServiceID:       sid,
			ServiceName:     svcRow.Name,
			DurationMinutes: dur,
			PriceCents:      price,
			SortOrder:       i,
		})
	}

	if err := s.appts.CreateWithLineItems(ctx, appt, lines); err != nil {
		return nil, fmt.Errorf("create appointment: %w", err)
	}

	if s.clients != nil {
		if sc, scErr := s.clients.GetOrCreateByPhone(ctx, in.SalonID, guestPhone, guestName); scErr == nil {
			_ = s.appts.SetSalonClientID(ctx, appt.ID, sc.ID)
		}
	}

	if s.notifier != nil {
		payload, _ := json.Marshal(map[string]any{
			"appointmentId": appt.ID,
			"salonId":       in.SalonID,
			"startsAt":      appt.StartsAt,
			"status":        appt.Status,
		})
		s.notifier.NotifySalonMembers(ctx, in.SalonID, appt.SalonMasterID, "appointment.created", "Новая запись", "Появилась новая запись в расписании", payload)
	}

	return &GuestBookingResult{
		AppointmentID: appt.ID,
		StartsAt:      startsAt,
		EndsAt:        endsAt,
		SalonMasterID: salonMasterID,
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

func (s *bookingService) pickNextSlot(ctx context.Context, salonID uuid.UUID, serviceIDs []uuid.UUID, salonMasterID *uuid.UUID) (time.Time, time.Time, *uuid.UUID, error) {
	for i := 0; i < 7; i++ {
		date := s.now().AddDate(0, 0, i)
		out, _, _, err := s.GetAvailableSlots(ctx, SlotParams{
			SalonID:       salonID,
			Date:          date,
			ServiceIDs:    serviceIDs,
			SalonMasterID: salonMasterID,
		})
		if err != nil {
			return time.Time{}, time.Time{}, nil, err
		}
		if len(out) > 0 {
			first := out[0]
			id := first.SalonMasterID
			return first.StartsAt.UTC(), first.EndsAt.UTC(), &id, nil
		}
	}
	return time.Time{}, time.Time{}, nil, ErrBookingUnavailable
}

// GetAvailableSlots generates free slots for a salon/date, optionally narrowed by service and master.
func (s *bookingService) GetAvailableSlots(ctx context.Context, p SlotParams) ([]AvailableSlot, []SlotMasterInfo, *SlotsMeta, error) {
	meta, err := s.slots.GetSalonMeta(ctx, p.SalonID)
	if err != nil {
		return nil, nil, nil, err
	}
	if meta == nil {
		return nil, nil, nil, fmt.Errorf("salon not found")
	}

	loc, err := time.LoadLocation(meta.Timezone)
	if err != nil {
		loc = time.UTC
	}

	date := time.Date(p.Date.Year(), p.Date.Month(), p.Date.Day(), 0, 0, 0, 0, loc)

	stepMin := meta.SlotDurationMinutes
	if stepMin <= 0 {
		stepMin = 30
	}

	svcIDs := dedupeUUIDsPreserve(p.ServiceIDs)
	if len(svcIDs) == 0 && p.ServiceID != nil {
		svcIDs = []uuid.UUID{*p.ServiceID}
	}

	var coverSet map[uuid.UUID]struct{}
	if len(svcIDs) > 0 {
		for _, sid := range svcIDs {
			_, err := s.appts.FindServiceForSalon(ctx, p.SalonID, sid)
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return nil, nil, nil, fmt.Errorf("service not found for this salon")
				}
				return nil, nil, nil, err
			}
		}
		covers, err := s.slots.ListSalonMastersCoveringServices(ctx, p.SalonID, svcIDs)
		if err != nil {
			return nil, nil, nil, err
		}
		coverSet = make(map[uuid.UUID]struct{}, len(covers))
		for _, id := range covers {
			coverSet[id] = struct{}{}
		}
	}

	masters, err := s.resolveMasters(ctx, p)
	if err != nil {
		return nil, nil, nil, err
	}

	if len(coverSet) > 0 {
		filtered := make([]masterEntry, 0, len(masters))
		for _, m := range masters {
			if _, ok := coverSet[m.ID]; ok {
				filtered = append(filtered, m)
			}
		}
		masters = filtered
	}

	durationMin := stepMin
	if len(svcIDs) == 0 {
		for i := range masters {
			masters[i].DurationMin = durationMin
		}
	} else {
		for i := range masters {
			total := 0
			for _, sid := range svcIDs {
				svcRow, err := s.appts.FindServiceForSalon(ctx, p.SalonID, sid)
				if err != nil {
					return nil, nil, nil, err
				}
				d := svcRow.DurationMinutes
				durO, _, err := s.slots.GetMasterServiceOverrides(ctx, masters[i].ID, sid)
				if err != nil {
					return nil, nil, nil, err
				}
				d = bookingEffectiveDurationMinutes(svcRow.DurationMinutes, durO)
				if d <= 0 {
					d = svcRow.DurationMinutes
				}
				total += d
			}
			masters[i].DurationMin = total
		}
	}

	nowLoc := s.now().In(loc)
	isToday := sameYMD(nowLoc, date)
	todayCutoff := nowLoc.Add(30 * time.Minute)

	dayOfWeek := int(date.Weekday())

	result := make([]AvailableSlot, 0, 32)
	masterInfos := make([]SlotMasterInfo, 0, len(masters))

	for _, m := range masters {
		masterInfos = append(masterInfos, SlotMasterInfo{SalonMasterID: m.ID, MasterName: m.DisplayName})

		hour, err := s.slots.GetMasterWorkingHour(ctx, m.ID, dayOfWeek)
		if err != nil {
			return nil, nil, nil, err
		}
		if hour == nil || hour.IsDayOff {
			continue
		}

		openMin := clockToMinutes(hour.OpensAt)
		closeMin := clockToMinutes(hour.ClosesAt)
		if closeMin <= openMin {
			continue
		}

		dayStart := date
		dayEnd := dayStart.Add(24 * time.Hour)
		appts, err := s.appts.FindByMasterInRange(ctx, m.ID, dayStart.UTC(), dayEnd.UTC())
		if err != nil {
			return nil, nil, nil, err
		}

		var breakStart, breakEnd int
		hasBreak := hour.BreakStartsAt != nil && hour.BreakEndsAt != nil
		if hasBreak {
			breakStart = clockToMinutes(*hour.BreakStartsAt)
			breakEnd = clockToMinutes(*hour.BreakEndsAt)
			if breakEnd <= breakStart {
				hasBreak = false
			}
		}

		dur := m.DurationMin
		if dur <= 0 {
			dur = stepMin
		}

		for t := openMin; t+dur <= closeMin; t += stepMin {
			slotStart := dayStart.Add(time.Duration(t) * time.Minute)
			slotEnd := slotStart.Add(time.Duration(dur) * time.Minute)

			if hasBreak && t < breakEnd && t+dur > breakStart {
				continue
			}

			if isToday && slotStart.Before(todayCutoff) {
				continue
			}

			conflict := false
			for _, a := range appts {
				if a.StartsAt.Before(slotEnd) && a.EndsAt.After(slotStart) {
					conflict = true
					break
				}
			}
			if conflict {
				continue
			}

			result = append(result, AvailableSlot{
				StartsAt:      slotStart,
				EndsAt:        slotEnd,
				SalonMasterID: m.ID,
				MasterName:    m.DisplayName,
			})
		}
	}

	sort.Slice(result, func(i, j int) bool {
		if !result[i].StartsAt.Equal(result[j].StartsAt) {
			return result[i].StartsAt.Before(result[j].StartsAt)
		}
		return result[i].MasterName < result[j].MasterName
	})

	metaOut := &SlotsMeta{
		Date:                date.Format("2006-01-02"),
		SlotDurationMinutes: stepMin,
	}
	return result, masterInfos, metaOut, nil
}

type masterEntry struct {
	ID          uuid.UUID
	DisplayName string
	DurationMin int
}

func (s *bookingService) resolveMasters(ctx context.Context, p SlotParams) ([]masterEntry, error) {
	if p.SalonMasterID != nil {
		m, err := s.slots.GetSalonMaster(ctx, p.SalonID, *p.SalonMasterID)
		if err != nil {
			return nil, err
		}
		if m == nil {
			return nil, nil
		}
		return []masterEntry{{ID: m.ID, DisplayName: m.DisplayName}}, nil
	}
	if p.MasterProfileID != nil {
		m, err := s.slots.GetSalonMasterByProfileID(ctx, p.SalonID, *p.MasterProfileID)
		if err != nil {
			return nil, err
		}
		if m == nil {
			return nil, nil
		}
		return []masterEntry{{ID: m.ID, DisplayName: m.DisplayName}}, nil
	}
	rows, err := s.slots.ListActiveSalonMasters(ctx, p.SalonID)
	if err != nil {
		return nil, err
	}
	out := make([]masterEntry, 0, len(rows))
	for _, r := range rows {
		out = append(out, masterEntry{ID: r.ID, DisplayName: r.DisplayName})
	}
	return out, nil
}

func sameYMD(a, b time.Time) bool {
	ay, am, ad := a.Date()
	by, bm, bd := b.Date()
	return ay == by && am == bm && ad == bd
}
