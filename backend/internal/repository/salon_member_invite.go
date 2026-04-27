package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

// Sentinel errors for salon member invite flows.
var (
	ErrSalonMemberInviteNotFound      = errors.New("salon_member_invite_not_found")
	ErrSalonMemberInviteAlreadyMember = errors.New("user_already_salon_member")
	ErrSalonMemberInviteDuplicate     = errors.New("duplicate_pending_invite")
	ErrSalonMemberInviteForbidden     = errors.New("salon_member_invite_forbidden")
	ErrSalonMemberInviteExpired       = errors.New("salon_member_invite_expired")
)

// SalonMemberInviteListRow is JSON for dashboard / me invite lists.
type SalonMemberInviteListRow struct {
	ID        uuid.UUID  `json:"id" gorm:"column:id"`
	SalonID   uuid.UUID  `json:"salonId" gorm:"column:salon_id"`
	SalonName string     `json:"salonName,omitempty" gorm:"column:salon_name"`
	PhoneE164 string     `json:"phoneE164" gorm:"column:phone_e164"`
	Role      string     `json:"role" gorm:"column:role"`
	Status    string     `json:"status" gorm:"column:status"`
	InvitedBy uuid.UUID  `json:"invitedBy" gorm:"column:invited_by"`
	UserID    *uuid.UUID `json:"userId,omitempty" gorm:"column:user_id"`
	CreatedAt time.Time  `json:"createdAt" gorm:"column:created_at"`
	ExpiresAt time.Time  `json:"expiresAt" gorm:"column:expires_at"`
}

// SalonMemberInviteRepository persists salon_member_invites.
type SalonMemberInviteRepository interface {
	ListBySalon(ctx context.Context, salonID uuid.UUID) ([]SalonMemberInviteListRow, error)
	CreatePending(ctx context.Context, salonID, invitedBy uuid.UUID, phoneE164, role string) (*SalonMemberInviteListRow, error)
	DeletePending(ctx context.Context, salonID, inviteID uuid.UUID) (bool, error)
	ListPendingForUser(ctx context.Context, userID uuid.UUID) ([]SalonMemberInviteListRow, error)
	AcceptPending(ctx context.Context, userID, inviteID uuid.UUID) error
	DeclinePending(ctx context.Context, userID, inviteID uuid.UUID) (bool, error)
	LinkPendingByPhone(ctx context.Context, userID uuid.UUID, phoneE164 string) error
}
