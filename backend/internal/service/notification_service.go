package service

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/repository"
)

type NotificationService interface {
	List(ctx context.Context, userID uuid.UUID, unreadOnly bool, limit, offset int) ([]repository.NotificationRow, error)
	Count(ctx context.Context, userID uuid.UUID) (NotificationCounters, error)
	MarkSeen(ctx context.Context, userID, notificationID uuid.UUID) (bool, error)
	MarkAllSeen(ctx context.Context, userID uuid.UUID) (int64, error)
	MarkRead(ctx context.Context, userID, notificationID uuid.UUID) (bool, error)
	MarkAllRead(ctx context.Context, userID uuid.UUID) (int64, error)
	CreateForUsers(ctx context.Context, userIDs []uuid.UUID, notifType, title, body string, data json.RawMessage) error
	Subscribe(userID uuid.UUID) (<-chan repository.NotificationRow, func())
}

type NotificationCounters struct {
	Unread int64
	Unseen int64
}

type notificationService struct {
	repo repository.NotificationRepository

	mu   sync.RWMutex
	subs map[uuid.UUID]map[chan repository.NotificationRow]struct{}
}

func NewNotificationService(repo repository.NotificationRepository) NotificationService {
	return &notificationService{
		repo: repo,
		subs: make(map[uuid.UUID]map[chan repository.NotificationRow]struct{}),
	}
}

func (s *notificationService) List(
	ctx context.Context,
	userID uuid.UUID,
	unreadOnly bool,
	limit,
	offset int,
) ([]repository.NotificationRow, error) {
	return s.repo.ListByUser(ctx, userID, unreadOnly, limit, offset)
}

func (s *notificationService) Count(ctx context.Context, userID uuid.UUID) (NotificationCounters, error) {
	unread, err := s.repo.CountUnreadByUser(ctx, userID)
	if err != nil {
		return NotificationCounters{}, err
	}
	unseen, err := s.repo.CountUnseenByUser(ctx, userID)
	if err != nil {
		return NotificationCounters{}, err
	}
	return NotificationCounters{Unread: unread, Unseen: unseen}, nil
}

func (s *notificationService) MarkSeen(ctx context.Context, userID, notificationID uuid.UUID) (bool, error) {
	return s.repo.MarkSeen(ctx, userID, notificationID)
}

func (s *notificationService) MarkAllSeen(ctx context.Context, userID uuid.UUID) (int64, error) {
	return s.repo.MarkAllSeen(ctx, userID)
}

func (s *notificationService) MarkRead(ctx context.Context, userID, notificationID uuid.UUID) (bool, error) {
	return s.repo.MarkRead(ctx, userID, notificationID)
}

func (s *notificationService) MarkAllRead(ctx context.Context, userID uuid.UUID) (int64, error) {
	return s.repo.MarkAllRead(ctx, userID)
}

func (s *notificationService) CreateForUsers(
	ctx context.Context,
	userIDs []uuid.UUID,
	notifType, title, body string,
	data json.RawMessage,
) error {
	uniq := uniqueIDs(userIDs)
	if len(uniq) == 0 {
		return nil
	}
	rows := make([]repository.NotificationCreate, 0, len(uniq))
	for _, userID := range uniq {
		id := userID
		rows = append(rows, repository.NotificationCreate{
			UserID: &id, Type: notifType, Title: title, Body: body, Data: data,
		})
	}
	created, err := s.repo.CreateBulk(ctx, rows)
	if err != nil {
		return err
	}
	for i := range created {
		if rows[i].UserID != nil {
			s.publish(*rows[i].UserID, created[i])
		}
	}
	return nil
}

func (s *notificationService) Subscribe(userID uuid.UUID) (<-chan repository.NotificationRow, func()) {
	ch := make(chan repository.NotificationRow, 16)
	s.mu.Lock()
	if s.subs[userID] == nil {
		s.subs[userID] = make(map[chan repository.NotificationRow]struct{})
	}
	s.subs[userID][ch] = struct{}{}
	s.mu.Unlock()

	unsubscribe := func() {
		s.mu.Lock()
		if set, ok := s.subs[userID]; ok {
			delete(set, ch)
			if len(set) == 0 {
				delete(s.subs, userID)
			}
		}
		s.mu.Unlock()
		close(ch)
	}
	return ch, unsubscribe
}

func (s *notificationService) publish(userID uuid.UUID, row repository.NotificationRow) {
	s.mu.RLock()
	set := s.subs[userID]
	channels := make([]chan repository.NotificationRow, 0, len(set))
	for ch := range set {
		channels = append(channels, ch)
	}
	s.mu.RUnlock()
	for _, ch := range channels {
		select {
		case ch <- row:
		default:
		}
	}
}

func uniqueIDs(ids []uuid.UUID) []uuid.UUID {
	seen := make(map[uuid.UUID]struct{}, len(ids))
	out := make([]uuid.UUID, 0, len(ids))
	for _, id := range ids {
		if id == uuid.Nil {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}
