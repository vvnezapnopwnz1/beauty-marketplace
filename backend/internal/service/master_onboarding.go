package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
	"github.com/beauty-marketplace/backend/internal/repository"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// MasterOnboardingService orchestrates the self-service path of becoming a master.
type MasterOnboardingService interface {
	Start(ctx context.Context, userID uuid.UUID) (*StartResult, error)
	AdvanceStep(ctx context.Context, userID uuid.UUID, target string) (string, error)
	Publish(ctx context.Context, userID uuid.UUID) (*PublishResult, error)
}

// StartResult is the response body of POST /api/v1/me/master-onboarding/start.
type StartResult struct {
	MasterProfileID uuid.UUID `json:"masterProfileId"`
	Status          string    `json:"status"` // "existing" | "claimed" | "created"
	OnboardingStep  *string   `json:"onboardingStep,omitempty"`
	Redirect        string    `json:"redirect"`
}

// PublishResult is the response body of POST /api/v1/master-dashboard/publish.
type PublishResult struct {
	MasterProfileID uuid.UUID `json:"masterProfileId"`
	PublishedAt     time.Time `json:"publishedAt"`
	OnboardingStep  string    `json:"onboardingStep"`
}

// OnboardingValidationError is returned by Publish when required profile fields are missing.
type OnboardingValidationError struct {
	Fields []string
}

func (e *OnboardingValidationError) Error() string {
	return "missing_required: " + strings.Join(e.Fields, ",")
}

// ErrShadowRace fires when a phone-matched shadow profile was claimed by a
// concurrent caller between the SELECT and the UPDATE.
var ErrShadowRace = errors.New("phone_conflict")

// masterOnboardingRepo is the slice of MasterDashboardRepository this service
// needs. Defining it locally keeps the service decoupled from unrelated repo
// methods and makes test fakes trivial.
type masterOnboardingRepo interface {
	GetMasterProfileByUserID(ctx context.Context, userID uuid.UUID) (*model.MasterProfile, error)
	FindShadowMasterProfileIDByPhone(ctx context.Context, phoneE164 string) (*uuid.UUID, error)
	ClaimMasterProfile(ctx context.Context, profileID, userID uuid.UUID, phoneE164 string) error
	CreateOwnedProfile(ctx context.Context, userID uuid.UUID, displayName string, phone *string) (*model.MasterProfile, error)
	AdvanceOnboardingStep(ctx context.Context, profileID uuid.UUID, target string) (string, error)
	PublishProfile(ctx context.Context, profileID uuid.UUID) (time.Time, string, error)
}

type masterOnboardingAuthRepo interface {
	FindUserByID(ctx context.Context, id uuid.UUID) (*model.User, error)
}

type masterOnboardingService struct {
	repo     masterOnboardingRepo
	authRepo masterOnboardingAuthRepo
}

// NewMasterOnboardingService constructs the service. Production wiring passes
// the full MasterDashboardRepository / AuthRepository; the service uses only
// the narrow subsets it actually needs.
func NewMasterOnboardingService(
	repo repository.MasterDashboardRepository,
	authRepo repository.AuthRepository,
) MasterOnboardingService {
	return &masterOnboardingService{repo: repo, authRepo: authRepo}
}

// Start handles the three onboarding states A0/A1/A2 idempotently.
func (s *masterOnboardingService) Start(ctx context.Context, userID uuid.UUID) (*StartResult, error) {
	// A2: already a master.
	existing, err := s.repo.GetMasterProfileByUserID(ctx, userID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if existing != nil {
		return &StartResult{
			MasterProfileID: existing.ID,
			Status:          "existing",
			OnboardingStep:  existing.OnboardingStep,
			Redirect:        "/master-dashboard",
		}, nil
	}

	user, err := s.authRepo.FindUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("load user: %w", err)
	}
	if user == nil {
		return nil, fmt.Errorf("user not found")
	}

	// A1: shadow profile by phone.
	if user.PhoneE164 != "" {
		shadowID, err := s.repo.FindShadowMasterProfileIDByPhone(ctx, user.PhoneE164)
		if err != nil {
			return nil, err
		}
		if shadowID != nil {
			if err := s.repo.ClaimMasterProfile(ctx, *shadowID, userID, user.PhoneE164); err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return nil, ErrShadowRace
				}
				return nil, err
			}
			step, err := s.repo.AdvanceOnboardingStep(ctx, *shadowID, "profile")
			if err != nil {
				return nil, err
			}
			s2 := step
			return &StartResult{
				MasterProfileID: *shadowID,
				Status:          "claimed",
				OnboardingStep:  &s2,
				Redirect:        "/master-onboarding",
			}, nil
		}
	}

	// A0: create a fresh owned profile.
	displayName := ""
	if user.DisplayName != nil {
		displayName = strings.TrimSpace(*user.DisplayName)
	}
	var phonePtr *string
	if user.PhoneE164 != "" {
		p := user.PhoneE164
		phonePtr = &p
	}
	mp, err := s.repo.CreateOwnedProfile(ctx, userID, displayName, phonePtr)
	if err != nil {
		return nil, err
	}
	return &StartResult{
		MasterProfileID: mp.ID,
		Status:          "created",
		OnboardingStep:  mp.OnboardingStep,
		Redirect:        "/master-onboarding",
	}, nil
}

// AdvanceStep delegates to the repository's monotonic step advance.
func (s *masterOnboardingService) AdvanceStep(ctx context.Context, userID uuid.UUID, target string) (string, error) {
	mp, err := s.repo.GetMasterProfileByUserID(ctx, userID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", err
	}
	if mp == nil {
		return "", errors.New("master profile required")
	}
	return s.repo.AdvanceOnboardingStep(ctx, mp.ID, target)
}

// Publish runs hard validation, then idempotently sets published_at + completes
// onboarding_step.
func (s *masterOnboardingService) Publish(ctx context.Context, userID uuid.UUID) (*PublishResult, error) {
	mp, err := s.repo.GetMasterProfileByUserID(ctx, userID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if mp == nil {
		return nil, errors.New("master profile required")
	}

	missing := make([]string, 0, 2)
	if strings.TrimSpace(mp.DisplayName) == "" {
		missing = append(missing, "displayName")
	}
	if len(mp.Specializations) == 0 {
		missing = append(missing, "specializations")
	}
	if len(missing) > 0 {
		return nil, &OnboardingValidationError{Fields: missing}
	}

	publishedAt, step, err := s.repo.PublishProfile(ctx, mp.ID)
	if err != nil {
		return nil, err
	}
	return &PublishResult{
		MasterProfileID: mp.ID,
		PublishedAt:     publishedAt,
		OnboardingStep:  step,
	}, nil
}
