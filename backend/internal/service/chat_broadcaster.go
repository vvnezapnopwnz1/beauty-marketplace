package service

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
)

type notificationChatBroadcaster struct {
	notif NotificationService
}

func NewChatBroadcaster(notif NotificationService) ChatBroadcaster {
	return &notificationChatBroadcaster{notif: notif}
}

func (b *notificationChatBroadcaster) BroadcastChatMessage(_ context.Context, recipients []uuid.UUID, payload json.RawMessage) {
	if b.notif == nil {
		return
	}
	b.notif.PublishEvent(recipients, "chat.message", payload)
}
