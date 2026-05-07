package service

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/beauty-marketplace/backend/internal/model"
	"github.com/beauty-marketplace/backend/internal/repository"
)

var (
	ErrChatRoomNotFound   = errors.New("chat room not found")
	ErrChatNotParticipant = errors.New("not a chat participant")
	ErrChatRoomReadonly   = errors.New("chat room is readonly")
	ErrChatGuestLocked    = errors.New("guest may send only one message before staff reply")
	ErrChatInvalidParams  = errors.New("invalid chat params")
)

type ChatParticipants struct {
	GuestUserID         *uuid.UUID
	GuestPhone          string
	MasterUserID        *uuid.UUID
	OwnerUserIDs        []uuid.UUID
	ReceptionistUserIDs []uuid.UUID
}

type AppointmentResolver interface {
	ResolveChatParticipants(ctx context.Context, appointmentID uuid.UUID) (ChatParticipants, error)
}

type ChatBroadcaster interface {
	BroadcastChatMessage(ctx context.Context, recipientUserIDs []uuid.UUID, payload json.RawMessage)
	BroadcastToRoom(ctx context.Context, roomID uuid.UUID, payload json.RawMessage)
	SubscribeRoom(roomID uuid.UUID, ch chan<- []byte) (unsubscribe func())
}

type SendMessageParams struct {
	RoomID       uuid.UUID
	Body         string
	SenderUserID *uuid.UUID
	AccessToken  *uuid.UUID // anonymous guest path
}

type SendMessageWithAttachmentParams struct {
	RoomID              uuid.UUID
	Body                string
	SenderUserID        *uuid.UUID
	AccessToken         *uuid.UUID // anonymous guest path
	AttachmentURL       string
	AttachmentType      string
	AttachmentFilename  string
	AttachmentSizeBytes int
}

type ChatService interface {
	EnsureRoomForAppointment(ctx context.Context, appointmentID uuid.UUID) (*model.ChatRoom, error)
	EnsureRoomForInquiry(ctx context.Context, salonID uuid.UUID) (*model.ChatRoom, error)
	GetRoom(ctx context.Context, id uuid.UUID) (*model.ChatRoom, error)
	GetRoomByAccessToken(ctx context.Context, token uuid.UUID) (*model.ChatRoom, error)

	SendMessage(ctx context.Context, p SendMessageParams) (*model.ChatMessage, error)
	SendMessageWithAttachment(ctx context.Context, p SendMessageWithAttachmentParams) (*model.ChatMessage, error)
	PostSystemMessage(ctx context.Context, roomID uuid.UUID, body string) (*model.ChatMessage, error)

	ListMessages(ctx context.Context, roomID uuid.UUID, requesterUserID *uuid.UUID, accessToken *uuid.UUID, limit, offset int) ([]model.ChatMessage, error)
	MarkRoomRead(ctx context.Context, roomID, userID uuid.UUID) error

	LockRoomReadonly(ctx context.Context, roomID uuid.UUID) error

	SetPusher(NotificationPusher)
}

type chatService struct {
	repo        repository.ChatRepository
	resolver    AppointmentResolver
	broadcaster ChatBroadcaster
	pusher      NotificationPusher
}

func NewChatService(repo repository.ChatRepository, resolver AppointmentResolver, broadcaster ChatBroadcaster) ChatService {
	return &chatService{repo: repo, resolver: resolver, broadcaster: broadcaster}
}

func (s *chatService) SetPusher(p NotificationPusher) { s.pusher = p }

func (s *chatService) EnsureRoomForAppointment(ctx context.Context, apptID uuid.UUID) (*model.ChatRoom, error) {
	if existing, err := s.repo.GetRoomByAppointment(ctx, apptID); err != nil {
		return nil, err
	} else if existing != nil {
		return existing, nil
	}
	room := &model.ChatRoom{
		ID:                    uuid.New(),
		Type:                  model.ChatRoomTypeExternal,
		AppointmentID:         &apptID,
		Status:                model.ChatRoomStatusActive,
		LockedUntilFirstReply: true,
		AccessToken:           uuid.New(),
	}
	if err := s.repo.CreateRoom(ctx, room); err != nil {
		return nil, err
	}
	return room, nil
}

func (s *chatService) EnsureRoomForInquiry(ctx context.Context, salonID uuid.UUID) (*model.ChatRoom, error) {
	if existing, err := s.repo.GetRoomBySalon(ctx, salonID); err != nil {
		return nil, err
	} else if existing != nil && existing.Type == model.ChatRoomTypeInquiry {
		return existing, nil
	}
	room := &model.ChatRoom{
		ID:                    uuid.New(),
		Type:                  model.ChatRoomTypeInquiry,
		SalonID:               &salonID,
		Status:                model.ChatRoomStatusActive,
		LockedUntilFirstReply: true, // Apply "first step" rule to inquiry rooms
		AccessToken:           uuid.New(),
	}
	if err := s.repo.CreateRoom(ctx, room); err != nil {
		return nil, err
	}
	return room, nil
}

func (s *chatService) GetRoom(ctx context.Context, id uuid.UUID) (*model.ChatRoom, error) {
	r, err := s.repo.GetRoomByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if r == nil {
		return nil, ErrChatRoomNotFound
	}
	return r, nil
}

func (s *chatService) GetRoomByAccessToken(ctx context.Context, token uuid.UUID) (*model.ChatRoom, error) {
	r, err := s.repo.GetRoomByAccessToken(ctx, token)
	if err != nil {
		return nil, err
	}
	if r == nil {
		return nil, ErrChatRoomNotFound
	}
	return r, nil
}

func (s *chatService) LockRoomReadonly(ctx context.Context, roomID uuid.UUID) error {
	now := time.Now()
	return s.repo.UpdateRoomStatus(ctx, roomID, model.ChatRoomStatusReadonly, &now)
}

func (s *chatService) SendMessage(ctx context.Context, p SendMessageParams) (*model.ChatMessage, error) {
	if p.RoomID == uuid.Nil || p.Body == "" {
		return nil, ErrChatInvalidParams
	}
	room, err := s.repo.GetRoomByID(ctx, p.RoomID)
	if err != nil {
		return nil, err
	}
	if room == nil {
		return nil, ErrChatRoomNotFound
	}
	if room.Status != model.ChatRoomStatusActive {
		return nil, ErrChatRoomReadonly
	}
	if room.AppointmentID == nil {
		return nil, errors.New("phase 1 supports external rooms only")
	}

	parts, err := s.resolver.ResolveChatParticipants(ctx, *room.AppointmentID)
	if err != nil {
		return nil, err
	}

	role, err := s.classifySender(p, room, parts)
	if err != nil {
		return nil, err
	}

	if role == model.ChatSenderRoleGuest && room.LockedUntilFirstReply {
		prior, _ := s.repo.ListMessages(ctx, room.ID, 200, 0)
		for _, m := range prior {
			if m.SenderRole == model.ChatSenderRoleGuest {
				return nil, ErrChatGuestLocked
			}
		}
	}

	msg := &model.ChatMessage{
		RoomID:       room.ID,
		SenderUserID: p.SenderUserID,
		SenderRole:   role,
		Body:         MaskContacts(p.Body),
		IsSystem:     false,
	}
	if err := s.repo.InsertMessage(ctx, msg); err != nil {
		return nil, err
	}

	if room.LockedUntilFirstReply && role != model.ChatSenderRoleGuest {
		if err := s.repo.UnlockRoomFirstReply(ctx, room.ID); err == nil {
			room.LockedUntilFirstReply = false
		}
	}

	s.broadcast(ctx, room, parts, msg, p.SenderUserID)
	return msg, nil
}

func (s *chatService) PostSystemMessage(ctx context.Context, roomID uuid.UUID, body string) (*model.ChatMessage, error) {
	room, err := s.repo.GetRoomByID(ctx, roomID)
	if err != nil {
		return nil, err
	}
	if room == nil {
		return nil, ErrChatRoomNotFound
	}
	msg := &model.ChatMessage{
		RoomID:     roomID,
		SenderRole: model.ChatSenderRoleSystem,
		Body:       body,
		IsSystem:   true,
	}
	if err := s.repo.InsertMessage(ctx, msg); err != nil {
		return nil, err
	}
	if room.AppointmentID != nil && s.resolver != nil {
		if parts, err := s.resolver.ResolveChatParticipants(ctx, *room.AppointmentID); err == nil {
			s.broadcast(ctx, room, parts, msg, nil)
		}
	}
	return msg, nil
}

func (s *chatService) ListMessages(ctx context.Context, roomID uuid.UUID, requesterUserID *uuid.UUID, accessToken *uuid.UUID, limit, offset int) ([]model.ChatMessage, error) {
	room, err := s.repo.GetRoomByID(ctx, roomID)
	if err != nil {
		return nil, err
	}
	if room == nil {
		return nil, ErrChatRoomNotFound
	}
	if err := s.assertCanRead(ctx, room, requesterUserID, accessToken); err != nil {
		return nil, err
	}
	return s.repo.ListMessages(ctx, roomID, limit, offset)
}

func (s *chatService) MarkRoomRead(ctx context.Context, roomID, userID uuid.UUID) error {
	room, err := s.repo.GetRoomByID(ctx, roomID)
	if err != nil {
		return err
	}
	if room == nil {
		return ErrChatRoomNotFound
	}
	if err := s.assertCanRead(ctx, room, &userID, nil); err != nil {
		return err
	}
	return s.repo.MarkAllReadInRoom(ctx, roomID, userID)
}

func (s *chatService) classifySender(p SendMessageParams, room *model.ChatRoom, parts ChatParticipants) (model.ChatSenderRole, error) {
	if p.SenderUserID == nil {
		if p.AccessToken == nil || *p.AccessToken != room.AccessToken {
			return "", ErrChatNotParticipant
		}
		return model.ChatSenderRoleGuest, nil
	}
	uid := *p.SenderUserID
	if parts.GuestUserID != nil && uid == *parts.GuestUserID {
		return model.ChatSenderRoleGuest, nil
	}
	if parts.MasterUserID != nil && uid == *parts.MasterUserID {
		return model.ChatSenderRoleMaster, nil
	}
	for _, o := range parts.OwnerUserIDs {
		if uid == o {
			return model.ChatSenderRoleOwner, nil
		}
	}
	for _, r := range parts.ReceptionistUserIDs {
		if uid == r {
			return model.ChatSenderRoleReceptionist, nil
		}
	}
	return "", ErrChatNotParticipant
}

func (s *chatService) assertCanRead(ctx context.Context, room *model.ChatRoom, userID *uuid.UUID, token *uuid.UUID) error {
	if token != nil && *token == room.AccessToken {
		return nil
	}
	if userID == nil {
		return ErrChatNotParticipant
	}
	if room.AppointmentID == nil {
		return ErrChatNotParticipant
	}
	parts, err := s.resolver.ResolveChatParticipants(ctx, *room.AppointmentID)
	if err != nil {
		return err
	}
	for _, p := range collectParticipants(parts) {
		if p == *userID {
			return nil
		}
	}
	return ErrChatNotParticipant
}

func (s *chatService) broadcast(ctx context.Context, room *model.ChatRoom, parts ChatParticipants, msg *model.ChatMessage, exclude *uuid.UUID) {
	rcpts := filterUUID(collectParticipants(parts), exclude)
	body := map[string]any{
		"type":       "chat.message",
		"roomId":     msg.RoomID,
		"messageId":  msg.ID,
		"senderRole": msg.SenderRole,
		"body":       msg.Body,
		"isSystem":   msg.IsSystem,
		"createdAt":  msg.CreatedAt,
	}
	if room != nil && room.AppointmentID != nil {
		body["appointmentId"] = *room.AppointmentID
	}
	payload, _ := json.Marshal(body)
	if s.broadcaster != nil {
		if len(rcpts) > 0 {
			s.broadcaster.BroadcastChatMessage(ctx, rcpts, payload)
		}
		s.broadcaster.BroadcastToRoom(ctx, msg.RoomID, payload)
	}
	if len(rcpts) == 0 {
		return
	}
	if s.pusher != nil {
		ids := make([]string, 0, len(rcpts))
		for _, u := range rcpts {
			ids = append(ids, u.String())
		}
		title := "Новое сообщение в чате"
		if msg.IsSystem {
			title = "Системное уведомление"
		}
		s.pusher.PushForUsers(ctx, ids, title, msg.Body, payload)
	}
}

func collectParticipants(p ChatParticipants) []uuid.UUID {
	var out []uuid.UUID
	if p.GuestUserID != nil {
		out = append(out, *p.GuestUserID)
	}
	if p.MasterUserID != nil {
		out = append(out, *p.MasterUserID)
	}
	out = append(out, p.OwnerUserIDs...)
	out = append(out, p.ReceptionistUserIDs...)
	return out
}

func filterUUID(in []uuid.UUID, exclude *uuid.UUID) []uuid.UUID {
	if exclude == nil {
		return in
	}
	out := make([]uuid.UUID, 0, len(in))
	for _, u := range in {
		if u != *exclude {
			out = append(out, u)
		}
	}
	return out
}

// SendMessageWithAttachment sends a message with attachment
func (s *chatService) SendMessageWithAttachment(ctx context.Context, p SendMessageWithAttachmentParams) (*model.ChatMessage, error) {
	if p.RoomID == uuid.Nil || p.Body == "" {
		return nil, ErrChatInvalidParams
	}
	if p.AttachmentURL == "" {
		return nil, ErrChatInvalidParams
	}

	room, err := s.repo.GetRoomByID(ctx, p.RoomID)
	if err != nil {
		return nil, err
	}
	if room == nil {
		return nil, ErrChatRoomNotFound
	}
	if room.Status == model.ChatRoomStatusReadonly {
		return nil, ErrChatRoomReadonly
	}

	// Determine sender role and user ID
	senderRole, senderUserID, err := s.resolveSender(ctx, p.RoomID, p.SenderUserID, p.AccessToken)
	if err != nil {
		return nil, err
	}

	// Apply guest lock rule
	if senderRole == model.ChatSenderRoleGuest && room.LockedUntilFirstReply {
		// Check if there are any existing messages from staff
		messages, err := s.repo.ListMessages(ctx, p.RoomID, 1, 0)
		if err != nil {
			return nil, err
		}
		hasStaffReply := false
		for _, msg := range messages {
			if msg.SenderRole != model.ChatSenderRoleGuest {
				hasStaffReply = true
				break
			}
		}
		if !hasStaffReply {
			return nil, ErrChatGuestLocked
		}
	}

	// Create message with attachment
	msg := &model.ChatMessage{
		ID:                  uuid.New(),
		RoomID:              p.RoomID,
		SenderUserID:        senderUserID,
		SenderRole:          senderRole,
		Body:                p.Body,
		IsSystem:            false,
		AttachmentURL:       &p.AttachmentURL,
		AttachmentType:      &p.AttachmentType,
		AttachmentFilename:  &p.AttachmentFilename,
		AttachmentSizeBytes: &p.AttachmentSizeBytes,
	}

	if err := s.repo.InsertMessage(ctx, msg); err != nil {
		return nil, err
	}

	// Unlock room after first guest message
	if room.LockedUntilFirstReply && senderRole == model.ChatSenderRoleGuest {
		if err := s.repo.UnlockRoomFirstReply(ctx, p.RoomID); err != nil {
			// Log error but don't fail the message
			// TODO: Add proper logging
		}
	}

	// Broadcast to participants
	s.broadcastMessage(ctx, msg, room)

	return msg, nil
}
