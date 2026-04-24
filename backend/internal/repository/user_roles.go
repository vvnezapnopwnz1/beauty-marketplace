package repository

import (
	"context"

	"github.com/google/uuid"
)

type SalonRef struct {
	SalonID uuid.UUID `json:"salonId"`
}

type EffectiveRoles struct {
	IsClient        bool       `json:"isClient"`
	IsMaster        bool       `json:"isMaster"`
	IsPlatformAdmin bool       `json:"isPlatformAdmin"`
	OwnerOfSalons   []SalonRef `json:"ownerOfSalons"`
	AdminOfSalons   []SalonRef `json:"adminOfSalons"`
}

type UserRoleMembership struct {
	SalonID uuid.UUID
	Role    string
}

type UserRolesRepository interface {
	GetGlobalRoleByUserID(ctx context.Context, userID uuid.UUID) (string, error)
	ListSalonMembershipsByUserID(ctx context.Context, userID uuid.UUID) ([]UserRoleMembership, error)
	HasMasterProfileByUserID(ctx context.Context, userID uuid.UUID) (bool, error)
}
