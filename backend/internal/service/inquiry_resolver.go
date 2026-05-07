package service

import (
	"context"

	"github.com/google/uuid"

	"github.com/beauty-marketplace/backend/internal/repository"
)

type InquiryResolver interface {
	ResolveInquiryParticipants(ctx context.Context, salonID uuid.UUID) (ChatParticipants, error)
}

type inquiryResolver struct {
	repo repository.ChatRepository
}

func NewInquiryResolver(repo repository.ChatRepository) InquiryResolver {
	return &inquiryResolver{repo: repo}
}

func (r *inquiryResolver) ResolveInquiryParticipants(ctx context.Context, salonID uuid.UUID) (ChatParticipants, error) {
	// For inquiry rooms, guest starts as nil (no guest user yet)
	// We need to get salon staff: owners, receptionists, and masters
	row, err := r.repo.GetSalonChatContext(ctx, salonID)
	if err != nil {
		return ChatParticipants{}, err
	}

	// For inquiry rooms, we support multiple masters
	// We'll use the first master as MasterUserID for compatibility
	// but the escalation logic will handle all masters
	var masterUserID *uuid.UUID
	if len(row.MasterUserIDs) > 0 {
		masterUserID = &row.MasterUserIDs[0]
	}

	return ChatParticipants{
		GuestUserID:         nil, // No guest user initially
		GuestPhone:          "",  // Will be set when guest sends first message
		MasterUserID:        masterUserID,
		OwnerUserIDs:        row.OwnerUserIDs,
		ReceptionistUserIDs: row.ReceptionistUserIDs,
	}, nil
}
