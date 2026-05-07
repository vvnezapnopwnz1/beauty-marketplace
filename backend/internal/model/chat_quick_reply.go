package model

import (
	"time"

	"github.com/google/uuid"
)

type ChatQuickReply struct {
	ID        uuid.UUID  `gorm:"primaryKey" json:"id"`
	SalonID   uuid.UUID  `gorm:"column:salon_id" json:"salonId"`
	Title     string     `json:"title"`
	Message   string     `json:"message"`
	SortOrder int        `gorm:"column:sort_order" json:"sortOrder"`
	IsActive  bool       `gorm:"column:is_active" json:"isActive"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

func (ChatQuickReply) TableName() string { return "chat_quick_replies" }
