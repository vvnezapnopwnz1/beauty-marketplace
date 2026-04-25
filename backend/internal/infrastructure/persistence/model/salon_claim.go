package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SalonClaim maps to salon_claims.
type SalonClaim struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey"`
	UserID          uuid.UUID  `gorm:"type:uuid;not null;column:user_id"`
	RelationType    string     `gorm:"type:claim_relation;not null;default:owner;column:relation_type"`
	Comment         *string    `gorm:"column:comment"`
	Source          string     `gorm:"type:varchar(50);not null;column:source"`
	ExternalID      string     `gorm:"type:varchar(255);not null;column:external_id"`
	SnapshotName    string     `gorm:"type:text;not null;column:snapshot_name"`
	SnapshotAddress *string    `gorm:"column:snapshot_address"`
	SnapshotPhone   *string    `gorm:"column:snapshot_phone"`
	SnapshotPhoto   *string    `gorm:"column:snapshot_photo"`
	Status          string     `gorm:"type:claim_status;not null;default:pending;column:status"`
	RejectionReason *string    `gorm:"column:rejection_reason"`
	ReviewedBy      *uuid.UUID `gorm:"type:uuid;column:reviewed_by"`
	ReviewedAt      *time.Time `gorm:"column:reviewed_at"`
	SalonID         *uuid.UUID `gorm:"type:uuid;column:salon_id"`
	CreatedAt       time.Time  `gorm:"column:created_at;not null;autoCreateTime"`
	UpdatedAt       time.Time  `gorm:"column:updated_at;not null;autoUpdateTime"`
}

func (s *SalonClaim) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

func (SalonClaim) TableName() string { return "salon_claims" }
