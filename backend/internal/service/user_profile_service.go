package service

import (
	"context"
	"errors"
	"net/url"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/repository"
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

type UserProfileDTO struct {
	ID            uuid.UUID               `json:"id"`
	Phone         string                  `json:"phone"`
	Username      *string                 `json:"username"`
	DisplayName   *string                 `json:"displayName"`
	FirstName     *string                 `json:"firstName"`
	LastName      *string                 `json:"lastName"`
	BirthDate     *string                 `json:"birthDate"`
	Gender        *string                 `json:"gender"`
	City          *string                 `json:"city"`
	Bio           *string                 `json:"bio"`
	Locale        string                  `json:"locale"`
	ThemePref     string                  `json:"themePref"`
	AvatarURL     *string                 `json:"avatarUrl"`
	CreatedAt     time.Time               `json:"createdAt"`
	UpdatedAt     time.Time               `json:"updatedAt"`
	GlobalRole    string                  `json:"globalRole"`
	EffectiveRoles repository.EffectiveRoles `json:"effectiveRoles"`
	MasterProfileID *uuid.UUID            `json:"masterProfileId"`
}

type UpdateUserProfileInput struct {
	Username    *string `json:"username"`
	DisplayName *string `json:"displayName"`
	FirstName   *string `json:"firstName"`
	LastName    *string `json:"lastName"`
	BirthDate   *string `json:"birthDate"`
	Gender      *string `json:"gender"`
	City        *string `json:"city"`
	Bio         *string `json:"bio"`
	Locale      *string `json:"locale"`
	ThemePref   *string `json:"themePref"`
	AvatarURL   *string `json:"avatarUrl"`
}

type UserProfileService interface {
	GetMe(ctx context.Context, userID uuid.UUID) (*UserProfileDTO, error)
	UpdateMe(ctx context.Context, userID uuid.UUID, in UpdateUserProfileInput) (*UserProfileDTO, error)
	ListSessions(ctx context.Context, userID uuid.UUID, currentSessionID *uuid.UUID) ([]UserSessionDTO, error)
	RevokeSession(ctx context.Context, userID uuid.UUID, sessionID uuid.UUID, currentSessionID *uuid.UUID) error
	RevokeAllSessions(ctx context.Context, userID uuid.UUID, currentSessionID *uuid.UUID) (int64, error)
	DeleteAccount(ctx context.Context, userID uuid.UUID) error
}

type userProfileService struct {
	repo      repository.UserProfileRepository
	rolesSvc  UserRolesService
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
	return mapProfile(rec, roles, masterProfileID), nil
}

func (s *userProfileService) UpdateMe(ctx context.Context, userID uuid.UUID, in UpdateUserProfileInput) (*UserProfileDTO, error) {
	update, err := validateAndNormalizeProfileUpdate(in)
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

func mapProfile(rec *repository.UserProfileRecord, roles repository.EffectiveRoles, masterProfileID *uuid.UUID) *UserProfileDTO {
	var birthDate *string
	if rec.BirthDate != nil {
		s := rec.BirthDate.Format("2006-01-02")
		birthDate = &s
	}
	return &UserProfileDTO{
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
}

func validateAndNormalizeProfileUpdate(in UpdateUserProfileInput) (repository.UserProfileUpdate, error) {
	var out repository.UserProfileUpdate

	if in.Username != nil {
		v := strings.TrimSpace(*in.Username)
		if v == "" {
			out.Username = nil
		} else {
			if !usernameRe.MatchString(v) {
				return out, ValidationError{Field: "username", Message: "username_invalid"}
			}
			out.Username = &v
		}
	}
	if in.DisplayName != nil {
		v := strings.TrimSpace(*in.DisplayName)
		if utf8.RuneCountInString(v) > 64 {
			return out, ValidationError{Field: "displayName"}
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
			return out, ValidationError{Field: "firstName"}
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
			return out, ValidationError{Field: "lastName"}
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
				return out, ValidationError{Field: "birthDate"}
			}
			min := time.Date(1900, 1, 1, 0, 0, 0, 0, time.UTC)
			if d.Before(min) || d.After(time.Now().UTC()) {
				return out, ValidationError{Field: "birthDate"}
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
				return out, ValidationError{Field: "gender"}
			}
		}
	}
	if in.City != nil {
		v := strings.TrimSpace(*in.City)
		if utf8.RuneCountInString(v) > 64 {
			return out, ValidationError{Field: "city"}
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
			return out, ValidationError{Field: "bio"}
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
			return out, ValidationError{Field: "locale"}
		}
		out.Locale = &v
	}
	if in.ThemePref != nil {
		v := strings.TrimSpace(*in.ThemePref)
		if v != "light" && v != "dark" && v != "system" {
			return out, ValidationError{Field: "themePref"}
		}
		out.ThemePref = &v
	}
	if in.AvatarURL != nil {
		v := strings.TrimSpace(*in.AvatarURL)
		if v == "" {
			out.AvatarURL = nil
		} else {
			u, err := url.Parse(v)
			if err != nil || strings.ToLower(u.Scheme) != "https" || u.Host == "" {
				return out, ValidationError{Field: "avatarUrl"}
			}
			out.AvatarURL = &v
		}
	}

	return out, nil
}
