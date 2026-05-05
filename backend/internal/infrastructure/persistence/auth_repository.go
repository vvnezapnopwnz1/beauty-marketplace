package persistence

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
	"gorm.io/gorm"
)

type AuthRepository struct {
	db *gorm.DB
}

func NewAuthRepository(db *gorm.DB) *AuthRepository {
	return &AuthRepository{db: db}
}

func (r *AuthRepository) CreateOTP(ctx context.Context, otp *model.OtpCode) error {
	return r.db.WithContext(ctx).Create(otp).Error
}

func (r *AuthRepository) FindActiveOTP(ctx context.Context, phone string) (*model.OtpCode, error) {
	var otp model.OtpCode
	err := r.db.WithContext(ctx).
		Where("phone_e164 = ? AND used = false AND expires_at > ? AND attempts < 5", phone, time.Now()).
		Order("created_at DESC").
		First(&otp).Error
	if err != nil {
		return nil, err
	}
	return &otp, nil
}

func (r *AuthRepository) MarkOTPUsed(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&model.OtpCode{}).
		Where("id = ?", id).
		Update("used", true).Error
}

func (r *AuthRepository) IncrementOTPAttempts(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&model.OtpCode{}).
		Where("id = ?", id).
		UpdateColumn("attempts", gorm.Expr("attempts + 1")).Error
}

func (r *AuthRepository) FindUserByPhone(ctx context.Context, phone string) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).
		Unscoped().
		Where("phone_e164 = ?", phone).
		Order("deleted_at NULLS FIRST").
		First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *AuthRepository) FindUserByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *AuthRepository) CreateUser(ctx context.Context, user *model.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *AuthRepository) UpdateDisplayName(ctx context.Context, userID uuid.UUID, displayName string) error {
	return r.db.WithContext(ctx).
		Model(&model.User{}).
		Where("id = ?", userID).
		UpdateColumn("display_name", displayName).Error
}

func (r *AuthRepository) SaveRefreshToken(ctx context.Context, rt *model.RefreshToken) error {
	return r.db.WithContext(ctx).Create(rt).Error
}

func (r *AuthRepository) FindRefreshToken(ctx context.Context, tokenHash string) (*model.RefreshToken, error) {
	var rt model.RefreshToken
	err := r.db.WithContext(ctx).
		Where("token_hash = ? AND revoked = false AND expires_at > ?", tokenHash, time.Now()).
		First(&rt).Error
	if err != nil {
		return nil, err
	}
	return &rt, nil
}

func (r *AuthRepository) RevokeRefreshToken(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&model.RefreshToken{}).
		Where("id = ?", id).
		Update("revoked", true).Error
}

func (r *AuthRepository) RevokeAllUserTokens(ctx context.Context, userID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&model.RefreshToken{}).
		Where("user_id = ? AND revoked = false", userID).
		Update("revoked", true).Error
}

func (r *AuthRepository) CleanExpiredOTPs(ctx context.Context, before time.Time) error {
	return r.db.WithContext(ctx).
		Where("expires_at < ?", before).
		Delete(&model.OtpCode{}).Error
}
