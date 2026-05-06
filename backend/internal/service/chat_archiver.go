package service

import (
	"context"
	"time"

	"go.uber.org/zap"

	"github.com/beauty-marketplace/backend/internal/model"
	"github.com/beauty-marketplace/backend/internal/repository"
)

type ChatArchiver struct {
	repo  repository.ChatRepository
	grace time.Duration
	log   *zap.Logger
}

func NewChatArchiver(repo repository.ChatRepository, log *zap.Logger) *ChatArchiver {
	if log == nil {
		log = zap.NewNop()
	}
	return &ChatArchiver{repo: repo, grace: 24 * time.Hour, log: log}
}

func (a *ChatArchiver) RunOnce(ctx context.Context) (int, error) {
	cutoff := time.Now().Add(-a.grace)
	rooms, err := a.repo.FindRoomsToReadonly(ctx, cutoff)
	if err != nil {
		return 0, err
	}
	now := time.Now()
	count := 0
	for _, r := range rooms {
		if err := a.repo.UpdateRoomStatus(ctx, r.ID, model.ChatRoomStatusReadonly, &now); err != nil {
			a.log.Warn("chat archiver: failed to lock room", zap.String("room", r.ID.String()), zap.Error(err))
			continue
		}
		count++
	}
	return count, nil
}

func (a *ChatArchiver) Start(ctx context.Context, period time.Duration) {
	go func() {
		t := time.NewTicker(period)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				if _, err := a.RunOnce(ctx); err != nil {
					a.log.Error("chat archiver tick failed", zap.Error(err))
				}
			}
		}
	}()
}
