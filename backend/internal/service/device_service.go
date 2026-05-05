package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/beauty-marketplace/backend/internal/repository"
	"github.com/beauty-marketplace/backend/pkg/models"
)

var ErrDeviceTokenTaken = errors.New("device token already registered for another user")

type DeviceService struct {
	deviceRepo repository.DeviceRepository
}

func NewDeviceService(deviceRepo repository.DeviceRepository) *DeviceService {
	return &DeviceService{deviceRepo: deviceRepo}
}

func (s *DeviceService) RegisterDevice(ctx context.Context, userID string, token string, platform string, appVersion string) (*models.Device, error) {
	existing, err := s.deviceRepo.GetByToken(ctx, token)
	if err == nil {
		if existing.UserID != userID {
			return nil, ErrDeviceTokenTaken
		}

		existing.Platform = platform
		existing.AppVersion = appVersion
		if err := s.deviceRepo.Update(ctx, existing); err != nil {
			return nil, fmt.Errorf("failed to update device: %w", err)
		}
		return existing, nil
	}

	device := &models.Device{
		UserID:      userID,
		DeviceToken: token,
		Platform:    platform,
		AppVersion:  appVersion,
	}

	if err := s.deviceRepo.Create(ctx, device); err != nil {
		return nil, fmt.Errorf("failed to register device: %w", err)
	}

	return device, nil
}

func (s *DeviceService) RemoveDevice(ctx context.Context, deviceID string) error {
	return s.deviceRepo.Delete(ctx, deviceID)
}

func (s *DeviceService) ClearAllDevices(ctx context.Context, userID string) error {
	return s.deviceRepo.DeleteByUser(ctx, userID)
}
