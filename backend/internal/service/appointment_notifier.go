package service

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/repository"
)

type AppointmentNotifier interface {
	NotifySalonMembers(ctx context.Context, salonID uuid.UUID, salonMasterID *uuid.UUID, notifType, title, body string, data json.RawMessage)
}

type appointmentNotifier struct {
	dash          repository.DashboardRepository
	notifications NotificationService
}

func NewAppointmentNotifier(
	dash repository.DashboardRepository,
	notifications NotificationService,
) AppointmentNotifier {
	return &appointmentNotifier{dash: dash, notifications: notifications}
}

func (n *appointmentNotifier) NotifySalonMembers(
	ctx context.Context,
	salonID uuid.UUID,
	salonMasterID *uuid.UUID,
	notifType, title, body string,
	data json.RawMessage,
) {
	if n == nil || n.notifications == nil {
		return
	}
	members, err := n.dash.ListSalonMemberUsers(ctx, salonID)
	if err != nil {
		return
	}
	userIDs := make([]uuid.UUID, 0, len(members)+1)
	for _, m := range members {
		userIDs = append(userIDs, m.UserID)
	}
	if salonMasterID != nil {
		if mp, err := n.dash.GetMasterProfileBySalonMaster(ctx, *salonMasterID); err == nil && mp != nil && mp.UserID != nil {
			userIDs = append(userIDs, *mp.UserID)
		}
	}
	_ = n.notifications.CreateForUsers(ctx, userIDs, notifType, title, body, data)
}
