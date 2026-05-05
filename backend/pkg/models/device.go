// File: backend/pkg/models/device.go
package models

import (
    "time"

    model "github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
)

// Device represents a registered mobile device for push notifications
type Device struct {
    DeviceID    string     `gorm:"primaryKey;type:uuid" json:"device_id"`
    UserID      string     `gorm:"type:uuid;not null" json:"user_id"`
    DeviceToken string     `gorm:"type:varchar(255);uniqueIndex;not null" json:"device_token"`
    Platform    string     `gorm:"type:varchar(10);check:platform IN ('ios', 'android')" json:"platform"`
    AppVersion  string     `gorm:"type:varchar(50)" json:"app_version,omitempty"`
    CreatedAt   time.Time  `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt   time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
    User        *model.User `gorm:"foreignKey:user_id" json:"-"`
}

func (Device) TableName() string {
    return "devices"
}