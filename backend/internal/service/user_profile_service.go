package service

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/beauty-marketplace/backend/internal/repository"
	"github.com/beauty-marketplace/backend/internal/servicecategory"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var usernameRe = regexp.MustCompile(`^[A-Za-z0-9_]{3,32}$`)

var ErrUsernameTaken = errors.New("username_taken")

type ValidationError struct {
	Field   string
	Message string
}

func (e ValidationError) Error() string {
	if e.Message != "" {
		return e.Message
	}
	return "validation_failed"
}

type MasterProfileBlockDTO struct {
	Specializations []string `json:"specializations"`
	YearsExperience *int     `json:"yearsExperience,omitempty"`
	PublishedAt     *string  `json:"publishedAt,omitempty"`
	OnboardingStep  *string  `json:"onboardingStep,omitempty"`
}

type UserProfileDTO struct {
	ID              uuid.UUID                 `json:"id"`
	Phone           string                    `json:"phone"`
	Username        *string                   `json:"username"`
	DisplayName     *string                   `json:"displayName"`
	FirstName       *string                   `json:"firstName"`
	LastName        *string                   `json:"lastName"`
	BirthDate       *string                   `json:"birthDate"`
	Gender          *string                   `json:"gender"`
	City            *string                   `json:"city"`
	Bio             *string                   `json:"bio"`
	Locale          string                    `json:"locale"`
	ThemePref       string                    `json:"themePref"`
	AvatarURL       *string                   `json:"avatarUrl"`
	CreatedAt       time.Time                 `json:"createdAt"`
	UpdatedAt       time.Time                 `json:"updatedAt"`
	GlobalRole      string                    `json:"globalRole"`
	EffectiveRoles  repository.EffectiveRoles `json:"effectiveRoles"`
	MasterProfileID *uuid.UUID                `json:"masterProfileId"`
	Master          *MasterProfileBlockDTO    `json:"master,omitempty"`
}

type UpdateMasterBlock struct {
	Specializations []string `json:"specializations"`
	YearsExperience *int     `json:"yearsExperience"`
}

type UpdateUserProfileInput struct {
	Username    *string            `json:"username"`
	DisplayName *string            `json:"displayName"`
	FirstName   *string            `json:"firstName"`
	LastName    *string            `json:"lastName"`
	BirthDate   *string            `json:"birthDate"`
	Gender      *string            `json:"gender"`
	City        *string            `json:"city"`
	Bio         *string            `json:"bio"`
	Locale      *string            `json:"locale"`
	ThemePref   *string            `json:"themePref"`
	AvatarURL   *string            `json:"avatarUrl"`
	Master      *UpdateMasterBlock `json:"master,omitempty"`
}

type UserProfileService interface {
	GetMe(ctx context.Context, userID uuid.UUID) (*UserProfileDTO, error)
	UpdateMe(ctx context.Context, userID uuid.UUID, in UpdateUserProfileInput) (*UserProfileDTO, error)
	UpdateAvatar(ctx context.Context, userID uuid.UUID, avatarURL string) error
	ListSessions(ctx context.Context, userID uuid.UUID, currentSessionID *uuid.UUID) ([]UserSessionDTO, error)
	RevokeSession(ctx context.Context, userID uuid.UUID, sessionID uuid.UUID, currentSessionID *uuid.UUID) error
	RevokeAllSessions(ctx context.Context, userID uuid.UUID, currentSessionID *uuid.UUID) (int64, error)
	DeleteAccount(ctx context.Context, userID uuid.UUID) error
}

type userProfileService struct {
	repo     repository.UserProfileRepository
	rolesSvc UserRolesService
}

var ErrCannotRevokeCurrent = errors.New("cannot_revoke_current")
var ErrHasOwnedSalons = errors.New("has_owned_salons")

type HasOwnedSalonsError struct {
	SalonIDs []uuid.UUID
}

func (e HasOwnedSalonsError) Error() string { return ErrHasOwnedSalons.Error() }

type UserSessionDTO struct {
	ID        uuid.UUID `json:"id"`
	CreatedAt time.Time `json:"createdAt"`
	ExpiresAt time.Time `json:"expiresAt"`
	IsCurrent bool      `json:"isCurrent"`
}

func NewUserProfileService(repo repository.UserProfileRepository, rolesSvc UserRolesService) UserProfileService {
	return &userProfileService{repo: repo, rolesSvc: rolesSvc}
}

func (s *userProfileService) GetMe(ctx context.Context, userID uuid.UUID) (*UserProfileDTO, error) {
	rec, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	roles, err := s.rolesSvc.Resolve(ctx, userID)
	if err != nil {
		return nil, err
	}
	masterProfileID, err := s.repo.FindMasterProfileIDByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	var mpb *repository.MasterProfileBlock
	if masterProfileID != nil {
		mpb, err = s.repo.GetMasterProfileBlockByUserID(ctx, userID)
		if err != nil {
			return nil, err
		}
	}
	return mapProfile(rec, roles, masterProfileID, mpb), nil
}

func (s *userProfileService) UpdateMe(ctx context.Context, userID uuid.UUID, in UpdateUserProfileInput) (*UserProfileDTO, error) {
	update, masterUpdate, err := validateAndNormalizeProfileUpdate(in)
	if err != nil {
		return nil, err
	}
	if update.Username != nil {
		taken, err := s.repo.IsUsernameTakenCI(ctx, *update.Username, userID)
		if err != nil {
			return nil, err
		}
		if taken {
			return nil, ErrUsernameTaken
		}
	}
	if err := s.repo.UpdateByID(ctx, userID, update); err != nil {
		return nil, err
	}
	if masterUpdate != nil {
		if err := s.repo.UpdateMasterProfileBlockByUserID(ctx, userID, *masterUpdate); err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, err
			}
		}
	}
	return s.GetMe(ctx, userID)
}

func (s *userProfileService) ListSessions(ctx context.Context, userID uuid.UUID, currentSessionID *uuid.UUID) ([]UserSessionDTO, error) {
	rows, err := s.repo.ListActiveSessions(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]UserSessionDTO, len(rows))
	for i := range rows {
		isCurrent := currentSessionID != nil && rows[i].ID == *currentSessionID
		out[i] = UserSessionDTO{
			ID:        rows[i].ID,
			CreatedAt: rows[i].CreatedAt,
			ExpiresAt: rows[i].ExpiresAt,
			IsCurrent: isCurrent,
		}
	}
	return out, nil
}

func (s *userProfileService) RevokeSession(ctx context.Context, userID uuid.UUID, sessionID uuid.UUID, currentSessionID *uuid.UUID) error {
	if currentSessionID != nil && sessionID == *currentSessionID {
		return ErrCannotRevokeCurrent
	}
	_, err := s.repo.RevokeSessionByID(ctx, userID, sessionID)
	return err
}

func (s *userProfileService) RevokeAllSessions(ctx context.Context, userID uuid.UUID, currentSessionID *uuid.UUID) (int64, error) {
	return s.repo.RevokeAllSessionsExcept(ctx, userID, currentSessionID)
}

func (s *userProfileService) DeleteAccount(ctx context.Context, userID uuid.UUID) error {
	owned, err := s.repo.ListOwnedSalonIDs(ctx, userID)
	if err != nil {
		return err
	}
	if len(owned) > 0 {
		return HasOwnedSalonsError{SalonIDs: owned}
	}
	if _, err := s.repo.RevokeAllSessionsExcept(ctx, userID, nil); err != nil {
		return err
	}
	return s.repo.SoftDeleteUserByID(ctx, userID)
}

func mapProfile(rec *repository.UserProfileRecord, roles repository.EffectiveRoles, masterProfileID *uuid.UUID, mpb *repository.MasterProfileBlock) *UserProfileDTO {
	var birthDate *string
	if rec.BirthDate != nil {
		s := rec.BirthDate.Format("2006-01-02")
		birthDate = &s
	}
	out := &UserProfileDTO{
		ID:              rec.ID,
		Phone:           rec.PhoneE164,
		Username:        rec.Username,
		DisplayName:     rec.DisplayName,
		FirstName:       rec.FirstName,
		LastName:        rec.LastName,
		BirthDate:       birthDate,
		Gender:          rec.Gender,
		City:            rec.City,
		Bio:             rec.Bio,
		Locale:          rec.Locale,
		ThemePref:       rec.ThemePref,
		AvatarURL:       rec.AvatarURL,
		CreatedAt:       rec.CreatedAt,
		UpdatedAt:       rec.UpdatedAt,
		GlobalRole:      rec.GlobalRole,
		EffectiveRoles:  roles,
		MasterProfileID: masterProfileID,
	}
	if mpb != nil {
		var publishedAt, onboardingStep *string
		if mpb.PublishedAt != nil {
			s := mpb.PublishedAt.UTC().Format("2006-01-02T15:04:05Z")
			publishedAt = &s
		}
		if mpb.OnboardingStep != nil {
			s := *mpb.OnboardingStep
			onboardingStep = &s
		}
		out.Master = &MasterProfileBlockDTO{
			Specializations: mpb.Specializations,
			YearsExperience: mpb.YearsExperience,
			PublishedAt:     publishedAt,
			OnboardingStep:  onboardingStep,
		}
	}
	return out
}

func validateAndNormalizeProfileUpdate(in UpdateUserProfileInput) (repository.UserProfileUpdate, *repository.MasterProfileBlockUpdate, error) {
	var out repository.UserProfileUpdate

	if in.Username != nil {
		v := strings.TrimSpace(*in.Username)
		if v == "" {
			out.Username = nil
		} else {
			if !usernameRe.MatchString(v) {
				return out, nil, ValidationError{Field: "username", Message: "username_invalid"}
			}
			out.Username = &v
		}
	}
	if in.DisplayName != nil {
		v := strings.TrimSpace(*in.DisplayName)
		if utf8.RuneCountInString(v) > 64 {
			return out, nil, ValidationError{Field: "displayName"}
		}
		if v == "" {
			out.DisplayName = nil
		} else {
			out.DisplayName = &v
		}
	}
	if in.FirstName != nil {
		v := strings.TrimSpace(*in.FirstName)
		if utf8.RuneCountInString(v) > 64 {
			return out, nil, ValidationError{Field: "firstName"}
		}
		if v == "" {
			out.FirstName = nil
		} else {
			out.FirstName = &v
		}
	}
	if in.LastName != nil {
		v := strings.TrimSpace(*in.LastName)
		if utf8.RuneCountInString(v) > 64 {
			return out, nil, ValidationError{Field: "lastName"}
		}
		if v == "" {
			out.LastName = nil
		} else {
			out.LastName = &v
		}
	}
	if in.BirthDate != nil {
		v := strings.TrimSpace(*in.BirthDate)
		if v == "" {
			out.BirthDate = nil
		} else {
			d, err := time.Parse("2006-01-02", v)
			if err != nil {
				return out, nil, ValidationError{Field: "birthDate"}
			}
			min := time.Date(1900, 1, 1, 0, 0, 0, 0, time.UTC)
			if d.Before(min) || d.After(time.Now().UTC()) {
				return out, nil, ValidationError{Field: "birthDate"}
			}
			dd := d.UTC()
			out.BirthDate = &dd
		}
	}
	if in.Gender != nil {
		v := strings.TrimSpace(*in.Gender)
		if v == "" {
			out.Gender = nil
		} else {
			switch v {
			case "male", "female", "other", "prefer_not_to_say":
				out.Gender = &v
			default:
				return out, nil, ValidationError{Field: "gender"}
			}
		}
	}
	if in.City != nil {
		v := strings.TrimSpace(*in.City)
		if utf8.RuneCountInString(v) > 64 {
			return out, nil, ValidationError{Field: "city"}
		}
		if v == "" {
			out.City = nil
		} else {
			out.City = &v
		}
	}
	if in.Bio != nil {
		v := strings.TrimSpace(*in.Bio)
		if utf8.RuneCountInString(v) > 500 {
			return out, nil, ValidationError{Field: "bio"}
		}
		if v == "" {
			out.Bio = nil
		} else {
			out.Bio = &v
		}
	}
	if in.Locale != nil {
		v := strings.TrimSpace(*in.Locale)
		if v != "ru" && v != "en" {
			return out, nil, ValidationError{Field: "locale"}
		}
		out.Locale = &v
	}
	if in.ThemePref != nil {
		v := strings.TrimSpace(*in.ThemePref)
		if v != "light" && v != "dark" && v != "system" {
			return out, nil, ValidationError{Field: "themePref"}
		}
		out.ThemePref = &v
	}
	if in.AvatarURL != nil {
		v := strings.TrimSpace(*in.AvatarURL)
		if v == "" {
			out.AvatarURL = nil
		} else {
			u, err := url.Parse(v)
			if err != nil || u.Host == "" {
				return out, nil, ValidationError{Field: "avatarUrl"}
			}
			scheme := strings.ToLower(u.Scheme)
			if scheme != "https" && scheme != "http" {
				return out, nil, ValidationError{Field: "avatarUrl"}
			}
			// Allow http only for local development
			if scheme == "http" {
				host := strings.ToLower(u.Hostname())
				if host != "localhost" && host != "127.0.0.1" && host != "::1" && !strings.HasSuffix(host, ".local") {
					return out, nil, ValidationError{Field: "avatarUrl"}
				}
			}
			out.AvatarURL = &v
		}
	}

	var masterUpdate *repository.MasterProfileBlockUpdate
	if in.Master != nil {
		masterUpdate = &repository.MasterProfileBlockUpdate{}
		specs := in.Master.Specializations
		if specs == nil {
			specs = []string{}
		}
		normSpecs, invalidSpecs := servicecategory.NormalizeParentSlugList(specs)
		if len(invalidSpecs) > 0 {
			return out, nil, ValidationError{
				Field:   "specializations",
				Message: fmt.Sprintf("invalid specializations: %s", strings.Join(invalidSpecs, ", ")),
			}
		}
		masterUpdate.Specializations = normSpecs
		if in.Master.YearsExperience != nil && *in.Master.YearsExperience >= 0 {
			masterUpdate.YearsExperience = in.Master.YearsExperience
		}
	}

	return out, masterUpdate, nil
}

func (s *userProfileService) UpdateAvatar(ctx context.Context, userID uuid.UUID, avatarURL string) error {
	return s.repo.UpdateAvatar(ctx, userID, avatarURL)
}
