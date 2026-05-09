package model

import (
	"time"

	"github.com/google/uuid"
)

type ChatRoomType string

const (
	ChatRoomTypeExternal ChatRoomType = "external"
	ChatRoomTypeInternal ChatRoomType = "internal"
	ChatRoomTypeInquiry  ChatRoomType = "inquiry"
)

type ChatRoomStatus string

const (
	ChatRoomStatusActive   ChatRoomStatus = "active"
	ChatRoomStatusReadonly ChatRoomStatus = "readonly"
	ChatRoomStatusArchived ChatRoomStatus = "archived"
)

type ChatRoom struct {
	ID                    uuid.UUID      `gorm:"primaryKey" json:"id"`
	Type                  ChatRoomType   `json:"type"`
	AppointmentID         *uuid.UUID     `gorm:"column:appointment_id" json:"appointmentId,omitempty"`
	SalonID               *uuid.UUID     `gorm:"column:salon_id" json:"salonId,omitempty"`
	MasterProfileID       *uuid.UUID     `gorm:"column:master_profile_id" json:"masterProfileId,omitempty"`
	Status                ChatRoomStatus `json:"status"`
	LockedUntilFirstReply bool           `gorm:"column:locked_until_first_reply" json:"lockedUntilFirstReply"`
	AccessToken           uuid.UUID      `gorm:"column:access_token" json:"-"`
	ReadonlyAt            *time.Time     `gorm:"column:readonly_at" json:"readonlyAt,omitempty"`
	CreatedAt             time.Time      `json:"createdAt"`
	UpdatedAt             time.Time      `json:"updatedAt"`
}

func (ChatRoom) TableName() string { return "chat_rooms" }

type ChatSenderRole string

const (
	ChatSenderRoleGuest        ChatSenderRole = "guest"
	ChatSenderRoleMaster       ChatSenderRole = "master"
	ChatSenderRoleOwner        ChatSenderRole = "owner"
	ChatSenderRoleReceptionist ChatSenderRole = "receptionist"
	ChatSenderRoleSystem       ChatSenderRole = "system"
)

type ChatMessage struct {
	ID                  uuid.UUID      `gorm:"primaryKey" json:"id"`
	RoomID              uuid.UUID      `gorm:"column:room_id" json:"roomId"`
	SenderUserID        *uuid.UUID     `gorm:"column:sender_user_id" json:"senderUserId,omitempty"`
	SenderRole          ChatSenderRole `gorm:"column:sender_role" json:"senderRole"`
	Body                string         `json:"body"`
	IsSystem            bool           `gorm:"column:is_system" json:"isSystem"`
	AttachmentURL       *string        `gorm:"column:attachment_url" json:"attachmentUrl,omitempty"`
	AttachmentType      *string        `gorm:"column:attachment_type" json:"attachmentType,omitempty"`
	AttachmentFilename  *string        `gorm:"column:attachment_filename" json:"attachmentFilename,omitempty"`
	AttachmentSizeBytes *int           `gorm:"column:attachment_size_bytes" json:"attachmentSizeBytes,omitempty"`
	CreatedAt           time.Time      `json:"createdAt"`
}

func (ChatMessage) TableName() string { return "chat_messages" }

type ChatMessageRead struct {
	MessageID uuid.UUID `gorm:"column:message_id;primaryKey" json:"messageId"`
	UserID    uuid.UUID `gorm:"column:user_id;primaryKey" json:"userId"`
	ReadAt    time.Time `gorm:"column:read_at" json:"readAt"`
}

func (ChatMessageRead) TableName() string { return "chat_message_reads" }
