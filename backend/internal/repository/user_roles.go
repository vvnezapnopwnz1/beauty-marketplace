package repository

import (
	"context"

	"github.com/google/uuid"
)

type SalonMembershipRef struct {
	SalonID   uuid.UUID `json:"salonId"`
	SalonName string    `json:"salonName"`
	Role      string    `json:"role"`
}

type EffectiveRoles struct {
	IsClient         bool                 `json:"isClient"`
	IsMaster         bool                 `json:"isMaster"`
	IsPlatformAdmin  bool                 `json:"isPlatformAdmin"`
	SalonMemberships []SalonMembershipRef `json:"salonMemberships"`
	PendingInvites   int                  `json:"pendingInvites"`
}

type UserRoleMembership struct {
	SalonID   uuid.UUID
	SalonName string
	Role      string
}

type UserRolesRepository interface {
	GetGlobalRoleByUserID(ctx context.Context, userID uuid.UUID) (string, error)
	ListSalonMembershipsByUserID(ctx context.Context, userID uuid.UUID) ([]UserRoleMembership, error)
	HasMasterProfileByUserID(ctx context.Context, userID uuid.UUID) (bool, error)
	CountPendingInvitesByUserID(ctx context.Context, userID uuid.UUID) (int, error)
}
