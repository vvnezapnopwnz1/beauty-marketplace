package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type UserProfileRecord struct {
	ID          uuid.UUID
	PhoneE164   string
	Username    *string
	DisplayName *string
	FirstName   *string
	LastName    *string
	BirthDate   *time.Time
	Gender      *string
	City        *string
	Bio         *string
	Locale      string
	ThemePref   string
	AvatarURL   *string
	GlobalRole  string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type UserProfileUpdate struct {
	Username    *string
	DisplayName *string
	FirstName   *string
	LastName    *string
	BirthDate   *time.Time
	Gender      *string
	City        *string
	Bio         *string
	Locale      *string
	ThemePref   *string
	AvatarURL   *string
}

type UserSessionRecord struct {
	ID        uuid.UUID
	CreatedAt time.Time
	ExpiresAt time.Time
}

type UserProfileRepository interface {
	GetByID(ctx context.Context, userID uuid.UUID) (*UserProfileRecord, error)
	UpdateByID(ctx context.Context, userID uuid.UUID, in UserProfileUpdate) error
	IsUsernameTakenCI(ctx context.Context, username string, exceptUserID uuid.UUID) (bool, error)
	FindMasterProfileIDByUserID(ctx context.Context, userID uuid.UUID) (*uuid.UUID, error)
	ListActiveSessions(ctx context.Context, userID uuid.UUID) ([]UserSessionRecord, error)
	RevokeSessionByID(ctx context.Context, userID, sessionID uuid.UUID) (bool, error)
	RevokeAllSessionsExcept(ctx context.Context, userID uuid.UUID, exceptSessionID *uuid.UUID) (int64, error)
	ListOwnedSalonIDs(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error)
	SoftDeleteUserByID(ctx context.Context, userID uuid.UUID) error
}
