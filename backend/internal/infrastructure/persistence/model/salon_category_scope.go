package model

import (
	"time"

	"github.com/google/uuid"
)

// SalonCategoryScope maps to salon_service_category_scopes.
type SalonCategoryScope struct {
	SalonID    uuid.UUID `gorm:"type:uuid;primaryKey;column:salon_id"`
	ParentSlug string    `gorm:"column:parent_slug;primaryKey;not null"`
	CreatedAt  time.Time `gorm:"column:created_at;not null;autoCreateTime"`
}

func (SalonCategoryScope) TableName() string { return "salon_service_category_scopes" }
