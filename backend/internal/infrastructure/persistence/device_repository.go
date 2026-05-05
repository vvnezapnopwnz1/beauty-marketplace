// File: backend/internal/infrastructure/persistence/device_repository.go
package persistence

import (
	"context"
	"errors"
	"fmt"

	"github.com/beauty-marketplace/backend/internal/repository"
	"github.com/beauty-marketplace/backend/pkg/models"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

var (
	ErrDeviceNotFound = errors.New("device not found")
	ErrDuplicateToken = errors.New("device token already registered")
)

type deviceRepository struct {
	db *gorm.DB
}

// Ensure compilation-time compliance
var _ repository.DeviceRepository = (*deviceRepository)(nil)

func NewDeviceRepository(db *gorm.DB) repository.DeviceRepository {
	return &deviceRepository{db: db}
}

func (r *deviceRepository) Create(ctx context.Context, device *models.Device) error {
	result := r.db.WithContext(ctx).Create(device)
	if result.Error != nil {
		if isUniqueConstraintError(result.Error, "device_token") {
			return ErrDuplicateToken
		}
		return fmt.Errorf("failed to create device: %w", result.Error)
	}
	return nil
}

func (r *deviceRepository) GetByToken(ctx context.Context, token string) (*models.Device, error) {
	var device models.Device
	err := r.db.WithContext(ctx).Where("device_token = ?", token).First(&device).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDeviceNotFound
		}
		return nil, fmt.Errorf("failed to get device by token: %w", err)
	}
	return &device, nil
}

func (r *deviceRepository) GetByUser(ctx context.Context, userID string) ([]models.Device, error) {
	var devices []models.Device
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Find(&devices).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get devices for user: %w", err)
	}
	return devices, nil
}

func (r *deviceRepository) Update(ctx context.Context, device *models.Device) error {
	result := r.db.WithContext(ctx).Save(device)
	if result.Error != nil {
		if isUniqueConstraintError(result.Error, "device_token") {
			return ErrDuplicateToken
		}
		return fmt.Errorf("failed to update device: %w", result.Error)
	}
	return nil
}

func (r *deviceRepository) Delete(ctx context.Context, deviceID string) error {
	result := r.db.WithContext(ctx).Delete(&models.Device{}, deviceID)
	if result.Error != nil {
		return fmt.Errorf("failed to delete device: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrDeviceNotFound
	}
	return nil
}

func (r *deviceRepository) DeleteByUser(ctx context.Context, userID string) error {
	result := r.db.WithContext(ctx).Where("user_id = ?", userID).Delete(&models.Device{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete devices for user: %w", result.Error)
	}
	return nil
}

// Helper: check if error is due to unique constraint violation
func isUniqueConstraintError(err error, column string) bool {
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		// PostgreSQL unique violation code: 23505
		return pqErr.Code == "23505"
	}
	return false
}
