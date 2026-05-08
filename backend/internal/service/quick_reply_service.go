package service

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/beauty-marketplace/backend/internal/model"
	"github.com/beauty-marketplace/backend/internal/repository"
)

var (
	ErrQuickReplyNotFound = errors.New("quick reply not found")
	ErrQuickReplyAccess   = errors.New("access denied to quick reply")
	ErrInvalidParams      = errors.New("invalid params")
)

type QuickReplyService interface {
	GetQuickRepliesBySalon(ctx context.Context, salonID uuid.UUID) ([]model.ChatQuickReply, error)
	CreateQuickReply(ctx context.Context, salonID uuid.UUID, title, message string, sortOrder int) (*model.ChatQuickReply, error)
	UpdateQuickReply(ctx context.Context, id, salonID uuid.UUID, title, message *string, sortOrder *int) (*model.ChatQuickReply, error)
	DeleteQuickReply(ctx context.Context, id, salonID uuid.UUID) error
	ReorderQuickReplies(ctx context.Context, salonID uuid.UUID, replyIDs []uuid.UUID) error
}

type quickReplyService struct {
	repo repository.QuickReplyRepository
}

func NewQuickReplyService(repo repository.QuickReplyRepository) QuickReplyService {
	return &quickReplyService{repo: repo}
}

func (s *quickReplyService) GetQuickRepliesBySalon(ctx context.Context, salonID uuid.UUID) ([]model.ChatQuickReply, error) {
	return s.repo.GetBySalon(ctx, salonID)
}

func (s *quickReplyService) CreateQuickReply(ctx context.Context, salonID uuid.UUID, title, message string, sortOrder int) (*model.ChatQuickReply, error) {
	if title == "" || message == "" {
		return nil, ErrInvalidParams
	}

	reply := &model.ChatQuickReply{
		ID:        uuid.New(),
		SalonID:   salonID,
		Title:     title,
		Message:   message,
		SortOrder: sortOrder,
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.repo.Create(ctx, reply); err != nil {
		return nil, err
	}

	return reply, nil
}

func (s *quickReplyService) UpdateQuickReply(ctx context.Context, id, salonID uuid.UUID, title, message *string, sortOrder *int) (*model.ChatQuickReply, error) {
	reply, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if reply == nil {
		return nil, ErrQuickReplyNotFound
	}
	if reply.SalonID != salonID {
		return nil, ErrQuickReplyAccess
	}

	if title != nil {
		reply.Title = *title
	}
	if message != nil {
		reply.Message = *message
	}
	if sortOrder != nil {
		reply.SortOrder = *sortOrder
	}
	reply.UpdatedAt = time.Now()

	if err := s.repo.Update(ctx, reply); err != nil {
		return nil, err
	}

	return reply, nil
}

func (s *quickReplyService) DeleteQuickReply(ctx context.Context, id, salonID uuid.UUID) error {
	reply, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if reply == nil {
		return ErrQuickReplyNotFound
	}
	if reply.SalonID != salonID {
		return ErrQuickReplyAccess
	}

	return s.repo.Delete(ctx, id)
}

func (s *quickReplyService) ReorderQuickReplies(ctx context.Context, salonID uuid.UUID, replyIDs []uuid.UUID) error {
	return s.repo.Reorder(ctx, salonID, replyIDs)
}
