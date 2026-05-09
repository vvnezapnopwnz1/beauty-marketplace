package repository

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/beauty-marketplace/backend/internal/model"
)

type AppointmentChatRow struct {
	AppointmentID   uuid.UUID
	MasterUserID    *uuid.UUID
	OwnerUserIDs    []uuid.UUID
	ReceptionistIDs []uuid.UUID
	GuestUserID     *uuid.UUID
	GuestPhone      string
}

type SalonChatRow struct {
	SalonID             uuid.UUID
	OwnerUserIDs        []uuid.UUID
	ReceptionistUserIDs []uuid.UUID
	MasterUserIDs       []uuid.UUID
}

type ChatRepository interface {
	GetRoomByAppointment(ctx context.Context, appointmentID uuid.UUID) (*model.ChatRoom, error)
	GetRoomBySalon(ctx context.Context, salonID uuid.UUID) (*model.ChatRoom, error)
	GetRoomByMasterProfile(ctx context.Context, salonID, masterProfileID uuid.UUID) (*model.ChatRoom, error)
	ListInquiryRooms(ctx context.Context, salonID uuid.UUID, limit, offset int) ([]model.ChatRoom, error)
	GetRoomByID(ctx context.Context, id uuid.UUID) (*model.ChatRoom, error)
	GetRoomByAccessToken(ctx context.Context, token uuid.UUID) (*model.ChatRoom, error)
	CreateRoom(ctx context.Context, room *model.ChatRoom) error
	UpdateRoomStatus(ctx context.Context, roomID uuid.UUID, status model.ChatRoomStatus, readonlyAt *time.Time) error
	UnlockRoomFirstReply(ctx context.Context, roomID uuid.UUID) error

	InsertMessage(ctx context.Context, msg *model.ChatMessage) error
	ListMessages(ctx context.Context, roomID uuid.UUID, limit, offset int) ([]model.ChatMessage, error)

	MarkAllReadInRoom(ctx context.Context, roomID, userID uuid.UUID) error

	FindRoomsToReadonly(ctx context.Context, completedBefore time.Time) ([]model.ChatRoom, error)

	GetAppointmentChatContext(ctx context.Context, appointmentID uuid.UUID) (AppointmentChatRow, error)
	GetSalonChatContext(ctx context.Context, salonID uuid.UUID) (SalonChatRow, error)
	GetInquiryParticipants(ctx context.Context, salonID uuid.UUID, masterProfileID *uuid.UUID) (SalonChatRow, error)
	GetUnreadCount(ctx context.Context, roomID, userID uuid.UUID) (int, error)
	GetUnreadCounts(ctx context.Context, roomIDs []uuid.UUID, userID uuid.UUID) (map[uuid.UUID]int, error)
	FindUnansweredInquiries(ctx context.Context, olderThan time.Duration) ([]model.ChatRoom, error)
}
