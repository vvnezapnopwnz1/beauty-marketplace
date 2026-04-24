package persistence

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

type UserProfileRepository struct {
	db *gorm.DB
}

func NewUserProfileRepository(db *gorm.DB) *UserProfileRepository {
	return &UserProfileRepository{db: db}
}

func (r *UserProfileRepository) GetByID(ctx context.Context, userID uuid.UUID) (*repository.UserProfileRecord, error) {
	var u model.User
	if err := r.db.WithContext(ctx).Where("id = ?", userID).First(&u).Error; err != nil {
		return nil, err
	}
	return &repository.UserProfileRecord{
		ID:          u.ID,
		PhoneE164:   u.PhoneE164,
		Username:    u.Username,
		DisplayName: u.DisplayName,
		FirstName:   u.FirstName,
		LastName:    u.LastName,
		BirthDate:   u.BirthDate,
		Gender:      u.Gender,
		City:        u.City,
		Bio:         u.Bio,
		Locale:      u.Locale,
		ThemePref:   u.ThemePref,
		AvatarURL:   u.AvatarURL,
		GlobalRole:  u.GlobalRole,
		CreatedAt:   u.CreatedAt,
		UpdatedAt:   u.UpdatedAt,
	}, nil
}

func (r *UserProfileRepository) UpdateByID(ctx context.Context, userID uuid.UUID, in repository.UserProfileUpdate) error {
	updates := map[string]any{
		"username":     in.Username,
		"display_name": in.DisplayName,
		"first_name":   in.FirstName,
		"last_name":    in.LastName,
		"birth_date":   in.BirthDate,
		"gender":       in.Gender,
		"city":         in.City,
		"bio":          in.Bio,
		"avatar_url":   in.AvatarURL,
	}
	if in.Locale != nil {
		updates["locale"] = *in.Locale
	}
	if in.ThemePref != nil {
		updates["theme_pref"] = *in.ThemePref
	}

	return r.db.WithContext(ctx).
		Model(&model.User{}).
		Where("id = ?", userID).
		Updates(updates).Error
}

func (r *UserProfileRepository) IsUsernameTakenCI(ctx context.Context, username string, exceptUserID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.User{}).
		Where("username IS NOT NULL").
		Where("deleted_at IS NULL").
		Where("id <> ?", exceptUserID).
		Where("LOWER(username) = ?", strings.ToLower(username)).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *UserProfileRepository) FindMasterProfileIDByUserID(ctx context.Context, userID uuid.UUID) (*uuid.UUID, error) {
	var row struct {
		ID uuid.UUID `gorm:"column:id"`
	}
	err := r.db.WithContext(ctx).
		Table("master_profiles").
		Select("id").
		Where("user_id = ?", userID).
		Order("created_at ASC").
		Limit(1).
		Scan(&row).Error
	if err != nil {
		return nil, err
	}
	if row.ID == uuid.Nil {
		return nil, nil
	}
	return &row.ID, nil
}

func (r *UserProfileRepository) ListActiveSessions(ctx context.Context, userID uuid.UUID) ([]repository.UserSessionRecord, error) {
	var rows []struct {
		ID        uuid.UUID `gorm:"column:id"`
		CreatedAt time.Time `gorm:"column:created_at"`
		ExpiresAt time.Time `gorm:"column:expires_at"`
	}
	if err := r.db.WithContext(ctx).
		Table("refresh_tokens").
		Select("id, created_at, expires_at").
		Where("user_id = ? AND revoked = false AND expires_at > NOW()", userID).
		Order("created_at DESC").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]repository.UserSessionRecord, len(rows))
	for i := range rows {
		out[i] = repository.UserSessionRecord{
			ID:        rows[i].ID,
			CreatedAt: rows[i].CreatedAt,
			ExpiresAt: rows[i].ExpiresAt,
		}
	}
	return out, nil
}

func (r *UserProfileRepository) RevokeSessionByID(ctx context.Context, userID, sessionID uuid.UUID) (bool, error) {
	tx := r.db.WithContext(ctx).
		Model(&model.RefreshToken{}).
		Where("id = ? AND user_id = ? AND revoked = false", sessionID, userID).
		Update("revoked", true)
	if tx.Error != nil {
		return false, tx.Error
	}
	return tx.RowsAffected > 0, nil
}

func (r *UserProfileRepository) RevokeAllSessionsExcept(ctx context.Context, userID uuid.UUID, exceptSessionID *uuid.UUID) (int64, error) {
	q := r.db.WithContext(ctx).
		Model(&model.RefreshToken{}).
		Where("user_id = ? AND revoked = false", userID)
	if exceptSessionID != nil {
		q = q.Where("id <> ?", *exceptSessionID)
	}
	tx := q.Update("revoked", true)
	if tx.Error != nil {
		return 0, tx.Error
	}
	return tx.RowsAffected, nil
}

func (r *UserProfileRepository) ListOwnedSalonIDs(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) {
	var out []uuid.UUID
	if err := r.db.WithContext(ctx).
		Table("salon_members").
		Select("salon_id").
		Where("user_id = ? AND role = 'owner'", userID).
		Scan(&out).Error; err != nil {
		return nil, err
	}
	return out, nil
}

func (r *UserProfileRepository) SoftDeleteUserByID(ctx context.Context, userID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&model.User{}).
		Where("id = ?", userID).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}
