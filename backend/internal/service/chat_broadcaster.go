package service

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/google/uuid"
)

type notificationChatBroadcaster struct {
	notif NotificationService

	mu          sync.RWMutex
	roomSubs    map[uuid.UUID][]chan<- []byte
	subSequence uint64
}

func NewChatBroadcaster(notif NotificationService) ChatBroadcaster {
	return &notificationChatBroadcaster{
		notif:    notif,
		roomSubs: make(map[uuid.UUID][]chan<- []byte),
	}
}

func (b *notificationChatBroadcaster) BroadcastChatMessage(_ context.Context, recipients []uuid.UUID, payload json.RawMessage) {
	if b.notif == nil {
		return
	}
	b.notif.PublishEvent(recipients, "chat.message", payload)
}

func (b *notificationChatBroadcaster) BroadcastToRoom(_ context.Context, roomID uuid.UUID, payload json.RawMessage) {
	b.mu.RLock()
	subs := append([]chan<- []byte(nil), b.roomSubs[roomID]...)
	b.mu.RUnlock()
	for _, ch := range subs {
		select {
		case ch <- payload:
		default:
			// non-blocking: drop if subscriber is slow/full
		}
	}
}

func (b *notificationChatBroadcaster) SubscribeRoom(roomID uuid.UUID, ch chan<- []byte) func() {
	b.mu.Lock()
	b.roomSubs[roomID] = append(b.roomSubs[roomID], ch)
	b.mu.Unlock()

	return func() {
		b.mu.Lock()
		defer b.mu.Unlock()
		subs := b.roomSubs[roomID]
		for i, c := range subs {
			if c == ch {
				b.roomSubs[roomID] = append(subs[:i], subs[i+1:]...)
				break
			}
		}
		if len(b.roomSubs[roomID]) == 0 {
			delete(b.roomSubs, roomID)
		}
	}
}
