package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

// --- fakes ---

type fakeOnbRepo struct {
	// Profile by user_id (A2 lookup; nil = not found).
	byUser map[uuid.UUID]*model.MasterProfile

	// Shadow profile id by phone (returned by FindShadowMasterProfileIDByPhone).
	shadowByPhone map[string]*uuid.UUID

	// claimErrOnce: when set to a non-nil error, the next ClaimMasterProfile call
	// returns it (used to simulate the race condition).
	claimErrOnce error

	// Profile id -> profile (for AdvanceOnboardingStep / PublishProfile).
	byID map[uuid.UUID]*model.MasterProfile

	now time.Time
}

func newFakeOnbRepo() *fakeOnbRepo {
	return &fakeOnbRepo{
		byUser:        map[uuid.UUID]*model.MasterProfile{},
		shadowByPhone: map[string]*uuid.UUID{},
		byID:          map[uuid.UUID]*model.MasterProfile{},
		now:           time.Date(2026, 5, 9, 12, 0, 0, 0, time.UTC),
	}
}

func (f *fakeOnbRepo) GetMasterProfileByUserID(ctx context.Context, userID uuid.UUID) (*model.MasterProfile, error) {
	mp, ok := f.byUser[userID]
	if !ok {
		return nil, gorm.ErrRecordNotFound
	}
	return mp, nil
}

func (f *fakeOnbRepo) FindShadowMasterProfileIDByPhone(ctx context.Context, phoneE164 string) (*uuid.UUID, error) {
	id, ok := f.shadowByPhone[phoneE164]
	if !ok {
		return nil, nil
	}
	return id, nil
}

func (f *fakeOnbRepo) ClaimMasterProfile(ctx context.Context, profileID, userID uuid.UUID, phoneE164 string) error {
	if f.claimErrOnce != nil {
		err := f.claimErrOnce
		f.claimErrOnce = nil
		return err
	}
	mp, ok := f.byID[profileID]
	if !ok {
		return gorm.ErrRecordNotFound
	}
	uid := userID
	mp.UserID = &uid
	f.byUser[userID] = mp
	return nil
}

func (f *fakeOnbRepo) CreateOwnedProfile(ctx context.Context, userID uuid.UUID, displayName string, phone *string) (*model.MasterProfile, error) {
	step := "profile"
	mp := &model.MasterProfile{
		ID:             uuid.New(),
		UserID:         &userID,
		DisplayName:    displayName,
		PhoneE164:      phone,
		IsActive:       true,
		OnboardingStep: &step,
	}
	f.byID[mp.ID] = mp
	f.byUser[userID] = mp
	return mp, nil
}

func (f *fakeOnbRepo) AdvanceOnboardingStep(ctx context.Context, profileID uuid.UUID, target string) (string, error) {
	mp, ok := f.byID[profileID]
	if !ok {
		return "", gorm.ErrRecordNotFound
	}
	rank := func(s string) int {
		switch s {
		case "profile":
			return 0
		case "specializations":
			return 1
		case "services":
			return 2
		case "schedule":
			return 3
		case "completed":
			return 4
		}
		return -1
	}
	currentRank := -1
	if mp.OnboardingStep != nil {
		currentRank = rank(*mp.OnboardingStep)
	}
	if rank(target) > currentRank {
		t := target
		mp.OnboardingStep = &t
		return target, nil
	}
	if mp.OnboardingStep != nil {
		return *mp.OnboardingStep, nil
	}
	return target, nil
}

func (f *fakeOnbRepo) PublishProfile(ctx context.Context, profileID uuid.UUID) (time.Time, string, error) {
	mp, ok := f.byID[profileID]
	if !ok {
		return time.Time{}, "", gorm.ErrRecordNotFound
	}
	if mp.PublishedAt == nil {
		t := f.now
		mp.PublishedAt = &t
	}
	step := "completed"
	mp.OnboardingStep = &step
	return *mp.PublishedAt, step, nil
}

type fakeOnbAuthRepo struct {
	users map[uuid.UUID]*model.User
}

func (f *fakeOnbAuthRepo) FindUserByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	u, ok := f.users[id]
	if !ok {
		return nil, nil
	}
	return u, nil
}

// helper: build a service backed by the two fakes.
func newOnbHarness() (*masterOnboardingService, *fakeOnbRepo, *fakeOnbAuthRepo) {
	r := newFakeOnbRepo()
	a := &fakeOnbAuthRepo{users: map[uuid.UUID]*model.User{}}
	s := &masterOnboardingService{repo: r, authRepo: a}
	return s, r, a
}

func newTestUser(phone string) *model.User {
	return &model.User{ID: uuid.New(), PhoneE164: phone}
}

// --- tests ---

func TestStart_NoProfile_CreatesNew(t *testing.T) {
	t.Parallel()
	svc, _, ar := newOnbHarness()
	user := newTestUser("+70000000001")
	ar.users[user.ID] = user

	res, err := svc.Start(context.Background(), user.ID)
	if err != nil {
		t.Fatalf("Start: %v", err)
	}
	if res.Status != "created" {
		t.Errorf("status = %q, want created", res.Status)
	}
	if res.MasterProfileID == uuid.Nil {
		t.Error("master profile id should be set")
	}
	if res.Redirect != "/master-onboarding" {
		t.Errorf("redirect = %q, want /master-onboarding", res.Redirect)
	}
	if res.OnboardingStep == nil || *res.OnboardingStep != "profile" {
		t.Errorf("onboardingStep = %v, want profile", res.OnboardingStep)
	}
}

func TestStart_ShadowExists_ClaimsAndReturnsClaimed(t *testing.T) {
	t.Parallel()
	svc, r, ar := newOnbHarness()
	user := newTestUser("+70000000002")
	ar.users[user.ID] = user

	shadowID := uuid.New()
	r.byID[shadowID] = &model.MasterProfile{
		ID:          shadowID,
		DisplayName: "Shadow",
		PhoneE164:   strPtr(user.PhoneE164),
		IsActive:    true,
	}
	r.shadowByPhone[user.PhoneE164] = &shadowID

	res, err := svc.Start(context.Background(), user.ID)
	if err != nil {
		t.Fatalf("Start: %v", err)
	}
	if res.Status != "claimed" {
		t.Errorf("status = %q, want claimed", res.Status)
	}
	if res.MasterProfileID != shadowID {
		t.Errorf("master profile id mismatch: got %s, want %s (shadow)", res.MasterProfileID, shadowID)
	}
	if res.Redirect != "/master-onboarding" {
		t.Errorf("redirect = %q", res.Redirect)
	}
	if res.OnboardingStep == nil || *res.OnboardingStep != "profile" {
		t.Errorf("onboardingStep = %v, want profile", res.OnboardingStep)
	}
	// Sanity: claim was applied.
	if mp := r.byID[shadowID]; mp.UserID == nil || *mp.UserID != user.ID {
		t.Error("claim did not set user_id")
	}
}

func TestStart_AlreadyMaster_ReturnsExisting(t *testing.T) {
	t.Parallel()
	svc, r, ar := newOnbHarness()
	user := newTestUser("+70000000003")
	ar.users[user.ID] = user

	id := uuid.New()
	step := "completed"
	mp := &model.MasterProfile{
		ID:             id,
		UserID:         &user.ID,
		DisplayName:    "Anna",
		IsActive:       true,
		OnboardingStep: &step,
	}
	r.byID[id] = mp
	r.byUser[user.ID] = mp

	res, err := svc.Start(context.Background(), user.ID)
	if err != nil {
		t.Fatalf("Start: %v", err)
	}
	if res.Status != "existing" {
		t.Errorf("status = %q, want existing", res.Status)
	}
	if res.MasterProfileID != id {
		t.Error("should return same profile id")
	}
	if res.Redirect != "/master-dashboard" {
		t.Errorf("redirect = %q, want /master-dashboard", res.Redirect)
	}
}

func TestStart_ShadowRaceCondition_Returns409(t *testing.T) {
	t.Parallel()
	svc, r, ar := newOnbHarness()
	user := newTestUser("+70000000010")
	ar.users[user.ID] = user

	shadowID := uuid.New()
	r.byID[shadowID] = &model.MasterProfile{
		ID:          shadowID,
		DisplayName: "Shadow",
		PhoneE164:   strPtr(user.PhoneE164),
		IsActive:    true,
	}
	r.shadowByPhone[user.PhoneE164] = &shadowID
	r.claimErrOnce = gorm.ErrRecordNotFound // simulate concurrent claim winning the race

	_, err := svc.Start(context.Background(), user.ID)
	if !errors.Is(err, ErrShadowRace) {
		t.Errorf("err = %v, want ErrShadowRace", err)
	}
}

func TestAdvanceStep_Monotonic_DoesNotRegress(t *testing.T) {
	t.Parallel()
	svc, r, ar := newOnbHarness()
	user := newTestUser("+70000000004")
	ar.users[user.ID] = user

	id := uuid.New()
	step := "profile"
	mp := &model.MasterProfile{
		ID:             id,
		UserID:         &user.ID,
		DisplayName:    "Anna",
		IsActive:       true,
		OnboardingStep: &step,
	}
	r.byID[id] = mp
	r.byUser[user.ID] = mp

	ctx := context.Background()
	if _, err := svc.AdvanceStep(ctx, user.ID, "specializations"); err != nil {
		t.Fatalf("advance to specs: %v", err)
	}
	if _, err := svc.AdvanceStep(ctx, user.ID, "services"); err != nil {
		t.Fatalf("advance to services: %v", err)
	}
	got, err := svc.AdvanceStep(ctx, user.ID, "profile")
	if err != nil {
		t.Fatalf("regress attempt: %v", err)
	}
	if got != "services" {
		t.Errorf("step = %q, want services (no regression)", got)
	}
}

func TestPublish_MissingDisplayName_Returns422(t *testing.T) {
	t.Parallel()
	svc, r, ar := newOnbHarness()
	user := newTestUser("+70000000005")
	ar.users[user.ID] = user

	id := uuid.New()
	mp := &model.MasterProfile{
		ID:              id,
		UserID:          &user.ID,
		DisplayName:     "  ", // whitespace-only
		Specializations: pq.StringArray{"haircut"},
		IsActive:        true,
	}
	r.byID[id] = mp
	r.byUser[user.ID] = mp

	_, err := svc.Publish(context.Background(), user.ID)
	var verr *OnboardingValidationError
	if !errors.As(err, &verr) {
		t.Fatalf("expected OnboardingValidationError, got %v", err)
	}
	if !equalStrings(verr.Fields, []string{"displayName"}) {
		t.Errorf("fields = %v, want [displayName]", verr.Fields)
	}
}

func TestPublish_MissingSpecializations_Returns422(t *testing.T) {
	t.Parallel()
	svc, r, ar := newOnbHarness()
	user := newTestUser("+70000000006")
	ar.users[user.ID] = user

	id := uuid.New()
	mp := &model.MasterProfile{
		ID:              id,
		UserID:          &user.ID,
		DisplayName:     "Anna",
		Specializations: pq.StringArray{},
		IsActive:        true,
	}
	r.byID[id] = mp
	r.byUser[user.ID] = mp

	_, err := svc.Publish(context.Background(), user.ID)
	var verr *OnboardingValidationError
	if !errors.As(err, &verr) {
		t.Fatalf("expected OnboardingValidationError, got %v", err)
	}
	if !equalStrings(verr.Fields, []string{"specializations"}) {
		t.Errorf("fields = %v, want [specializations]", verr.Fields)
	}
}

func TestPublish_AlreadyPublished_NoOp(t *testing.T) {
	t.Parallel()
	svc, r, ar := newOnbHarness()
	user := newTestUser("+70000000007")
	ar.users[user.ID] = user

	id := uuid.New()
	mp := &model.MasterProfile{
		ID:              id,
		UserID:          &user.ID,
		DisplayName:     "Mira",
		Specializations: pq.StringArray{"nails"},
		IsActive:        true,
	}
	r.byID[id] = mp
	r.byUser[user.ID] = mp

	first, err := svc.Publish(context.Background(), user.ID)
	if err != nil {
		t.Fatalf("first publish: %v", err)
	}
	// Mutate "now" to detect any second-publish overwrite.
	r.now = r.now.Add(24 * time.Hour)
	second, err := svc.Publish(context.Background(), user.ID)
	if err != nil {
		t.Fatalf("second publish: %v", err)
	}
	if !first.PublishedAt.Equal(second.PublishedAt) {
		t.Errorf("publishedAt changed on idempotent re-publish: %v -> %v", first.PublishedAt, second.PublishedAt)
	}
}

// --- helpers ---

func equalStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
