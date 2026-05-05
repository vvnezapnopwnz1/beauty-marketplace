// File: backend/internal/repository/device_repository.go
package repository

import (
    "context"
    "github.com/yourusername/beauty-marketplace/pkg/models"
)

// DeviceRepository defines operations for device persistence
type DeviceRepository interface {
    // Create registers a new device for push notifications
    Create(ctx context.Context, device *models.Device) error
    
    // GetByToken finds a device by its push token
    GetByToken(ctx context.Context, token string) (*models.Device, error)
    
    // GetByUser fetches all devices for a given user
    GetByUser(ctx context.Context, userID string) ([]models.Device, error)
    
    // Update replaces an existing device's token (for token rotation)
    Update(ctx context.Context, device *models.Device) error
    
    // Delete removes a device registration
    Delete(ctx context.Context, deviceID string) error
    
    // DeleteByUser removes all devices for a user (on logout/account delete)
    DeleteByUser(ctx context.Context, userID string) error
}