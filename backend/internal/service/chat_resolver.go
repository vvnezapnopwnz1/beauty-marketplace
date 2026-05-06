package service

import (
	"context"

	"github.com/google/uuid"

	"github.com/beauty-marketplace/backend/internal/repository"
)

type apptResolver struct {
	repo repository.ChatRepository
}

func NewAppointmentChatResolver(repo repository.ChatRepository) AppointmentResolver {
	return &apptResolver{repo: repo}
}

func (r *apptResolver) ResolveChatParticipants(ctx context.Context, appointmentID uuid.UUID) (ChatParticipants, error) {
	row, err := r.repo.GetAppointmentChatContext(ctx, appointmentID)
	if err != nil {
		return ChatParticipants{}, err
	}
	return ChatParticipants{
		GuestUserID:         row.GuestUserID,
		GuestPhone:          row.GuestPhone,
		MasterUserID:        row.MasterUserID,
		OwnerUserIDs:        row.OwnerUserIDs,
		ReceptionistUserIDs: row.ReceptionistIDs,
	}, nil
}
