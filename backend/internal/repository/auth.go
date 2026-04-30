package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
)

type AuthRepository interface {
	CreateOTP(ctx context.Context, otp *model.OtpCode) error
	FindActiveOTP(ctx context.Context, phone string) (*model.OtpCode, error)
	MarkOTPUsed(ctx context.Context, id uuid.UUID) error
	IncrementOTPAttempts(ctx context.Context, id uuid.UUID) error

	FindUserByPhone(ctx context.Context, phone string) (*model.User, error)
	FindUserByID(ctx context.Context, id uuid.UUID) (*model.User, error)
	CreateUser(ctx context.Context, user *model.User) error
	UpdateDisplayName(ctx context.Context, userID uuid.UUID, displayName string) error

	SaveRefreshToken(ctx context.Context, rt *model.RefreshToken) error
	FindRefreshToken(ctx context.Context, tokenHash string) (*model.RefreshToken, error)
	RevokeRefreshToken(ctx context.Context, id uuid.UUID) error
	RevokeAllUserTokens(ctx context.Context, userID uuid.UUID) error
	CleanExpiredOTPs(ctx context.Context, before time.Time) error
}
