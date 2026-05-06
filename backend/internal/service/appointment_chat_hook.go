package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// AppointmentChatHook posts system messages to the appointment chat room when
// an appointment lifecycle transition occurs.
//
// Callers (booking, dashboard appointment service) invoke OnEvent after their
// own notification logic. This hook is best-effort and never returns errors —
// failures must not block business operations.
type AppointmentChatHook struct {
	chat ChatService
}

func NewAppointmentChatHook(chat ChatService) *AppointmentChatHook {
	return &AppointmentChatHook{chat: chat}
}

// OnAppointmentCreated initializes the chat room and announces creation.
func (h *AppointmentChatHook) OnAppointmentCreated(ctx context.Context, apptID uuid.UUID) {
	if h == nil || h.chat == nil {
		return
	}
	room, err := h.chat.EnsureRoomForAppointment(ctx, apptID)
	if err != nil {
		return
	}
	_, _ = h.chat.PostSystemMessage(ctx, room.ID, "Запись создана. Можно задать вопрос мастеру.")
}

// OnAppointmentStatusChanged posts a system message describing the new status.
func (h *AppointmentChatHook) OnAppointmentStatusChanged(ctx context.Context, apptID uuid.UUID, newStatus string) {
	if h == nil || h.chat == nil {
		return
	}
	room, err := h.chat.EnsureRoomForAppointment(ctx, apptID)
	if err != nil {
		return
	}
	switch newStatus {
	case "confirmed":
		_, _ = h.chat.PostSystemMessage(ctx, room.ID, "Запись подтверждена.")
	case "cancelled":
		_, _ = h.chat.PostSystemMessage(ctx, room.ID, "Запись отменена.")
		_ = h.chat.LockRoomReadonly(ctx, room.ID)
	case "completed":
		_, _ = h.chat.PostSystemMessage(ctx, room.ID, "Услуга оказана. Чат закроется через 24 часа.")
	case "no_show":
		_, _ = h.chat.PostSystemMessage(ctx, room.ID, "Клиент не пришёл на запись.")
		_ = h.chat.LockRoomReadonly(ctx, room.ID)
	}
}

// OnAppointmentRescheduled posts a system message with the new start time.
func (h *AppointmentChatHook) OnAppointmentRescheduled(ctx context.Context, apptID uuid.UUID, newStartsAt time.Time) {
	if h == nil || h.chat == nil {
		return
	}
	room, err := h.chat.EnsureRoomForAppointment(ctx, apptID)
	if err != nil {
		return
	}
	body := fmt.Sprintf("Запись перенесена на %s.", newStartsAt.Format("02.01.2006 15:04"))
	_, _ = h.chat.PostSystemMessage(ctx, room.ID, body)
}
