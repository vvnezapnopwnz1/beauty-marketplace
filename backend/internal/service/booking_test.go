package service

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	domainmodel "github.com/yourusername/beauty-marketplace/internal/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

// --- fakes ---

type fakeSlotsRepo struct {
	meta              *repository.SalonSlotMeta
	activeMasters     []repository.SalonMasterBasic
	master            *repository.SalonMasterBasic
	masterByProfile   *repository.SalonMasterBasic
	hourByMaster      map[uuid.UUID]*model.SalonMasterHour
	durationOverride  *int
	coveringMasterIDs []uuid.UUID
}

func (f *fakeSlotsRepo) GetSalonMeta(ctx context.Context, salonID uuid.UUID) (*repository.SalonSlotMeta, error) {
	return f.meta, nil
}
func (f *fakeSlotsRepo) ListActiveSalonMasters(ctx context.Context, salonID uuid.UUID) ([]repository.SalonMasterBasic, error) {
	return f.activeMasters, nil
}
func (f *fakeSlotsRepo) GetSalonMaster(ctx context.Context, salonID, salonMasterID uuid.UUID) (*repository.SalonMasterBasic, error) {
	return f.master, nil
}
func (f *fakeSlotsRepo) GetSalonMasterByProfileID(ctx context.Context, salonID, masterProfileID uuid.UUID) (*repository.SalonMasterBasic, error) {
	return f.masterByProfile, nil
}
func (f *fakeSlotsRepo) GetMasterWorkingHour(ctx context.Context, salonMasterID uuid.UUID, dayOfWeek int) (*model.SalonMasterHour, error) {
	if f.hourByMaster == nil {
		return nil, nil
	}
	return f.hourByMaster[salonMasterID], nil
}
func (f *fakeSlotsRepo) GetServiceDurationOverride(ctx context.Context, salonMasterID, serviceID uuid.UUID) (*int, error) {
	d, _, err := f.GetMasterServiceOverrides(ctx, salonMasterID, serviceID)
	return d, err
}

func (f *fakeSlotsRepo) GetMasterServiceOverrides(ctx context.Context, salonMasterID, serviceID uuid.UUID) (*int, *int, error) {
	return f.durationOverride, nil, nil
}

func (f *fakeSlotsRepo) ListSalonMastersCoveringServices(ctx context.Context, salonID uuid.UUID, serviceIDs []uuid.UUID) ([]uuid.UUID, error) {
	if len(serviceIDs) == 0 {
		return nil, nil
	}
	if f.coveringMasterIDs != nil {
		out := make([]uuid.UUID, len(f.coveringMasterIDs))
		copy(out, f.coveringMasterIDs)
		return out, nil
	}
	out := make([]uuid.UUID, 0, len(f.activeMasters))
	for _, m := range f.activeMasters {
		out = append(out, m.ID)
	}
	return out, nil
}

type fakeApptsRepo struct {
	service  *model.SalonService
	services map[uuid.UUID]*model.SalonService
	appts    []model.Appointment
}

func (f *fakeApptsRepo) Create(ctx context.Context, a *model.Appointment) error { return nil }
func (f *fakeApptsRepo) CreateWithLineItems(ctx context.Context, a *model.Appointment, lines []model.AppointmentLineItem) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}
func (f *fakeApptsRepo) FindServiceForSalon(ctx context.Context, salonID, serviceID uuid.UUID) (*model.SalonService, error) {
	if f.services != nil {
		if s, ok := f.services[serviceID]; ok {
			return s, nil
		}
		return nil, gorm.ErrRecordNotFound
	}
	return f.service, nil
}
func (f *fakeApptsRepo) FindByMasterInRange(ctx context.Context, salonMasterID uuid.UUID, from, to time.Time) ([]model.Appointment, error) {
	return f.appts, nil
}
func (f *fakeApptsRepo) SetSalonClientID(_ context.Context, _, _ uuid.UUID) error { return nil }

type fakeSalonRepo struct {
	salon *domainmodel.Salon
}

func (f *fakeSalonRepo) FindAll(ctx context.Context) ([]domainmodel.Salon, error) { return nil, nil }
func (f *fakeSalonRepo) FindByID(ctx context.Context, id uuid.UUID) (*domainmodel.Salon, error) {
	return f.salon, nil
}
func (f *fakeSalonRepo) FindServicesBySalonID(ctx context.Context, salonID uuid.UUID) ([]domainmodel.ServiceLine, error) {
	return nil, nil
}
func (f *fakeSalonRepo) GetWorkingHours(ctx context.Context, salonID uuid.UUID) ([]domainmodel.WorkingHourDTO, error) {
	return nil, nil
}
func (f *fakeSalonRepo) FindByExternalID(ctx context.Context, source, externalID string) (*domainmodel.Salon, error) {
	return nil, nil
}
func (f *fakeSalonRepo) FindByExternalIDs(ctx context.Context, source string, ids []string) ([]domainmodel.Salon, error) {
	return nil, nil
}
func (f *fakeSalonRepo) FindServicesBySalonIDs(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID][]domainmodel.ServiceLine, error) {
	return nil, nil
}

type fakeAppointmentNotifier struct {
	calls []fakeAppointmentNotifierCall
}

type fakeAppointmentNotifierCall struct {
	salonID       uuid.UUID
	salonMasterID *uuid.UUID
	notifType     string
	title         string
	body          string
	data          json.RawMessage
}

func (f *fakeAppointmentNotifier) NotifySalonMembers(ctx context.Context, salonID uuid.UUID, salonMasterID *uuid.UUID, notifType, title, body string, data json.RawMessage) {
	f.calls = append(f.calls, fakeAppointmentNotifierCall{
		salonID:       salonID,
		salonMasterID: salonMasterID,
		notifType:     notifType,
		title:         title,
		body:          body,
		data:          data,
	})
}

// --- helpers ---

func mskLoc(t *testing.T) *time.Location {
	t.Helper()
	loc, err := time.LoadLocation("Europe/Moscow")
	if err != nil {
		t.Fatalf("load location: %v", err)
	}
	return loc
}

func strPtr(s string) *string { return &s }

func newService(t *testing.T, slots repository.BookingSlotsRepository, appts repository.AppointmentRepository, now time.Time) *bookingService {
	t.Helper()
	return &bookingService{
		slots: slots,
		appts: appts,
		now:   func() time.Time { return now },
	}
}

// --- tests ---

func TestGetAvailableSlots_BasicDay(t *testing.T) {
	loc := mskLoc(t)
	masterID := uuid.New()
	salonID := uuid.New()
	date := time.Date(2026, 5, 20, 0, 0, 0, 0, loc) // Wednesday

	hour := &model.SalonMasterHour{
		SalonMasterID: masterID,
		DayOfWeek:     int16(date.Weekday()),
		OpensAt:       "10:00",
		ClosesAt:      "13:00",
		IsDayOff:      false,
	}

	slots := &fakeSlotsRepo{
		meta:          &repository.SalonSlotMeta{Timezone: "Europe/Moscow", SlotDurationMinutes: 30},
		activeMasters: []repository.SalonMasterBasic{{ID: masterID, SalonID: salonID, DisplayName: "Anna"}},
		hourByMaster:  map[uuid.UUID]*model.SalonMasterHour{masterID: hour},
	}

	apt := model.Appointment{
		ID:            uuid.New(),
		SalonMasterID: &masterID,
		StartsAt:      time.Date(2026, 5, 20, 10, 30, 0, 0, loc).UTC(),
		EndsAt:        time.Date(2026, 5, 20, 11, 0, 0, 0, loc).UTC(),
		Status:        "confirmed",
	}
	appts := &fakeApptsRepo{appts: []model.Appointment{apt}}

	now := time.Date(2026, 4, 17, 12, 0, 0, 0, loc)
	svc := newService(t, slots, appts, now)

	out, masters, meta, err := svc.GetAvailableSlots(context.Background(), SlotParams{SalonID: salonID, Date: date})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if meta.SlotDurationMinutes != 30 {
		t.Fatalf("slot duration: %d", meta.SlotDurationMinutes)
	}
	if len(masters) != 1 {
		t.Fatalf("masters: %d", len(masters))
	}
	// Expected: 10:00 (occupied by 10:30 starts_at? No — 10:00 slot is 10:00-10:30, apt is 10:30-11:00, no overlap) → free
	// 10:30 -> conflicts. 11:00 -> free. 11:30 -> free. 12:00 -> free. 12:30 -> free. 13:00 excluded (t+dur > close).
	wantStarts := []time.Time{
		time.Date(2026, 5, 20, 10, 0, 0, 0, loc),
		time.Date(2026, 5, 20, 11, 0, 0, 0, loc),
		time.Date(2026, 5, 20, 11, 30, 0, 0, loc),
		time.Date(2026, 5, 20, 12, 0, 0, 0, loc),
		time.Date(2026, 5, 20, 12, 30, 0, 0, loc),
	}
	if len(out) != len(wantStarts) {
		t.Fatalf("got %d slots, want %d: %+v", len(out), len(wantStarts), out)
	}
	for i, s := range out {
		if !s.StartsAt.Equal(wantStarts[i]) {
			t.Errorf("slot %d: got %s, want %s", i, s.StartsAt, wantStarts[i])
		}
	}
}

func TestGetAvailableSlots_DayOff(t *testing.T) {
	loc := mskLoc(t)
	masterID := uuid.New()
	salonID := uuid.New()
	date := time.Date(2026, 5, 20, 0, 0, 0, 0, loc)

	hour := &model.SalonMasterHour{SalonMasterID: masterID, IsDayOff: true}
	slots := &fakeSlotsRepo{
		meta:          &repository.SalonSlotMeta{Timezone: "Europe/Moscow", SlotDurationMinutes: 30},
		activeMasters: []repository.SalonMasterBasic{{ID: masterID, SalonID: salonID, DisplayName: "Anna"}},
		hourByMaster:  map[uuid.UUID]*model.SalonMasterHour{masterID: hour},
	}
	appts := &fakeApptsRepo{}
	svc := newService(t, slots, appts, time.Date(2026, 4, 17, 12, 0, 0, 0, loc))

	out, _, _, err := svc.GetAvailableSlots(context.Background(), SlotParams{SalonID: salonID, Date: date})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if len(out) != 0 {
		t.Fatalf("expected 0 slots, got %d", len(out))
	}
}

func TestGetAvailableSlots_BreakExclusion(t *testing.T) {
	loc := mskLoc(t)
	masterID := uuid.New()
	salonID := uuid.New()
	date := time.Date(2026, 5, 20, 0, 0, 0, 0, loc)

	hour := &model.SalonMasterHour{
		SalonMasterID: masterID,
		OpensAt:       "10:00",
		ClosesAt:      "13:00",
		BreakStartsAt: strPtr("11:00"),
		BreakEndsAt:   strPtr("12:00"),
	}
	slots := &fakeSlotsRepo{
		meta:          &repository.SalonSlotMeta{Timezone: "Europe/Moscow", SlotDurationMinutes: 30},
		activeMasters: []repository.SalonMasterBasic{{ID: masterID, SalonID: salonID, DisplayName: "Anna"}},
		hourByMaster:  map[uuid.UUID]*model.SalonMasterHour{masterID: hour},
	}
	appts := &fakeApptsRepo{}
	svc := newService(t, slots, appts, time.Date(2026, 4, 17, 12, 0, 0, 0, loc))

	out, _, _, err := svc.GetAvailableSlots(context.Background(), SlotParams{SalonID: salonID, Date: date})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	// 10:00,10:30 free; 11:00,11:30 excluded (break); 12:00,12:30 free.
	wantStarts := []time.Time{
		time.Date(2026, 5, 20, 10, 0, 0, 0, loc),
		time.Date(2026, 5, 20, 10, 30, 0, 0, loc),
		time.Date(2026, 5, 20, 12, 0, 0, 0, loc),
		time.Date(2026, 5, 20, 12, 30, 0, 0, loc),
	}
	if len(out) != len(wantStarts) {
		t.Fatalf("got %d want %d: %+v", len(out), len(wantStarts), out)
	}
	for i, s := range out {
		if !s.StartsAt.Equal(wantStarts[i]) {
			t.Errorf("slot %d: got %s want %s", i, s.StartsAt, wantStarts[i])
		}
	}
}

func TestGetAvailableSlots_FullyBooked(t *testing.T) {
	loc := mskLoc(t)
	masterID := uuid.New()
	salonID := uuid.New()
	date := time.Date(2026, 5, 20, 0, 0, 0, 0, loc)

	hour := &model.SalonMasterHour{SalonMasterID: masterID, OpensAt: "10:00", ClosesAt: "11:00"}
	slots := &fakeSlotsRepo{
		meta:          &repository.SalonSlotMeta{Timezone: "Europe/Moscow", SlotDurationMinutes: 30},
		activeMasters: []repository.SalonMasterBasic{{ID: masterID, SalonID: salonID, DisplayName: "Anna"}},
		hourByMaster:  map[uuid.UUID]*model.SalonMasterHour{masterID: hour},
	}
	// One appointment covering the whole day window
	apt := model.Appointment{
		SalonMasterID: &masterID,
		StartsAt:      time.Date(2026, 5, 20, 10, 0, 0, 0, loc).UTC(),
		EndsAt:        time.Date(2026, 5, 20, 11, 0, 0, 0, loc).UTC(),
		Status:        "confirmed",
	}
	appts := &fakeApptsRepo{appts: []model.Appointment{apt}}
	svc := newService(t, slots, appts, time.Date(2026, 4, 17, 12, 0, 0, 0, loc))

	out, _, _, err := svc.GetAvailableSlots(context.Background(), SlotParams{SalonID: salonID, Date: date})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if len(out) != 0 {
		t.Fatalf("expected 0 slots, got %d: %+v", len(out), out)
	}
}

func TestGetAvailableSlots_TodayPast(t *testing.T) {
	loc := mskLoc(t)
	masterID := uuid.New()
	salonID := uuid.New()
	now := time.Date(2026, 5, 20, 11, 0, 0, 0, loc)
	date := time.Date(2026, 5, 20, 0, 0, 0, 0, loc)

	hour := &model.SalonMasterHour{SalonMasterID: masterID, OpensAt: "10:00", ClosesAt: "14:00"}
	slots := &fakeSlotsRepo{
		meta:          &repository.SalonSlotMeta{Timezone: "Europe/Moscow", SlotDurationMinutes: 30},
		activeMasters: []repository.SalonMasterBasic{{ID: masterID, SalonID: salonID, DisplayName: "Anna"}},
		hourByMaster:  map[uuid.UUID]*model.SalonMasterHour{masterID: hour},
	}
	appts := &fakeApptsRepo{}
	svc := newService(t, slots, appts, now)

	out, _, _, err := svc.GetAvailableSlots(context.Background(), SlotParams{SalonID: salonID, Date: date})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	// now=11:00 → cutoff=11:30. Past slots 10:00, 10:30, 11:00 dropped. First kept: 11:30.
	if len(out) == 0 {
		t.Fatalf("no slots")
	}
	first := out[0].StartsAt
	if !first.Equal(time.Date(2026, 5, 20, 11, 30, 0, 0, loc)) {
		t.Fatalf("first slot should be 11:30, got %s", first)
	}
	for _, s := range out {
		if s.StartsAt.Before(now.Add(30 * time.Minute)) {
			t.Errorf("past slot leaked: %s", s.StartsAt)
		}
	}
}

func TestGetAvailableSlots_MultiServiceFiltersMasters(t *testing.T) {
	loc := mskLoc(t)
	ma := uuid.New()
	mb := uuid.New()
	salonID := uuid.New()
	s1 := uuid.New()
	s2 := uuid.New()
	date := time.Date(2026, 5, 20, 0, 0, 0, 0, loc)

	hourA := &model.SalonMasterHour{
		SalonMasterID: ma,
		DayOfWeek:     int16(date.Weekday()),
		OpensAt:       "10:00",
		ClosesAt:      "13:00",
		IsDayOff:      false,
	}
	hourB := &model.SalonMasterHour{
		SalonMasterID: mb,
		DayOfWeek:     int16(date.Weekday()),
		OpensAt:       "10:00",
		ClosesAt:      "13:00",
		IsDayOff:      false,
	}

	slots := &fakeSlotsRepo{
		meta: &repository.SalonSlotMeta{Timezone: "Europe/Moscow", SlotDurationMinutes: 30},
		activeMasters: []repository.SalonMasterBasic{
			{ID: ma, SalonID: salonID, DisplayName: "Anna"},
			{ID: mb, SalonID: salonID, DisplayName: "Bob"},
		},
		hourByMaster: map[uuid.UUID]*model.SalonMasterHour{
			ma: hourA,
			mb: hourB,
		},
		coveringMasterIDs: []uuid.UUID{ma},
	}

	appts := &fakeApptsRepo{
		services: map[uuid.UUID]*model.SalonService{
			s1: {ID: s1, SalonID: salonID, Name: "Cut", DurationMinutes: 30},
			s2: {ID: s2, SalonID: salonID, Name: "Color", DurationMinutes: 30},
		},
	}
	svc := newService(t, slots, appts, time.Date(2026, 4, 17, 12, 0, 0, 0, loc))

	out, _, _, err := svc.GetAvailableSlots(context.Background(), SlotParams{
		SalonID:    salonID,
		Date:       date,
		ServiceIDs: []uuid.UUID{s1, s2},
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	for _, s := range out {
		if s.SalonMasterID != ma {
			t.Fatalf("expected only master Anna, got slot for %s", s.SalonMasterID)
		}
	}
	// Combined duration 60m, step 30 → 10:00, 10:30, 11:00, 11:30, 12:00
	if len(out) != 5 {
		t.Fatalf("got %d slots, want 5", len(out))
	}
}

func TestCreateGuestBooking_NotifiesSalonMembers(t *testing.T) {
	loc := mskLoc(t)
	salonID := uuid.New()
	serviceID := uuid.New()
	masterID := uuid.New()
	startsAt := time.Date(2026, 5, 20, 10, 0, 0, 0, loc)
	endsAt := startsAt.Add(30 * time.Minute)
	notifier := &fakeAppointmentNotifier{}

	svc := &bookingService{
		salons: &fakeSalonRepo{salon: &domainmodel.Salon{
			ID:                   salonID,
			OnlineBookingEnabled: true,
		}},
		appts: &fakeApptsRepo{
			services: map[uuid.UUID]*model.SalonService{
				serviceID: {ID: serviceID, SalonID: salonID, Name: "Cut", DurationMinutes: 30},
			},
		},
		slots: &fakeSlotsRepo{
			coveringMasterIDs: []uuid.UUID{masterID},
		},
		notifier: notifier,
		now:      func() time.Time { return time.Date(2026, 4, 17, 12, 0, 0, 0, loc) },
	}

	result, err := svc.CreateGuestBooking(context.Background(), GuestBookingInput{
		SalonID:       salonID,
		ServiceIDs:    []uuid.UUID{serviceID},
		Name:          "Мария",
		PhoneE164:     "+79990000000",
		StartsAt:      &startsAt,
		EndsAt:        &endsAt,
		SalonMasterID: &masterID,
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if result.AppointmentID == uuid.Nil {
		t.Fatal("expected appointment id")
	}
	if len(notifier.calls) != 1 {
		t.Fatalf("expected 1 notification call, got %d", len(notifier.calls))
	}
	call := notifier.calls[0]
	if call.notifType != "appointment.created" {
		t.Fatalf("notification type: got %q", call.notifType)
	}
	if call.salonID != salonID {
		t.Fatalf("salon id: got %s want %s", call.salonID, salonID)
	}
	if call.salonMasterID == nil || *call.salonMasterID != masterID {
		t.Fatalf("salon master id: got %v want %s", call.salonMasterID, masterID)
	}

	var payload map[string]any
	if err := json.Unmarshal(call.data, &payload); err != nil {
		t.Fatalf("notification payload json: %v", err)
	}
	if payload["appointmentId"] == "" || payload["salonId"] == "" {
		t.Fatalf("notification payload missing ids: %s", string(call.data))
	}
}
