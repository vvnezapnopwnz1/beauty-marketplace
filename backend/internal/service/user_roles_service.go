package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/repository"
)

type UserRolesService interface {
	Resolve(ctx context.Context, userID uuid.UUID) (repository.EffectiveRoles, error)
}

type userRolesService struct {
	repo repository.UserRolesRepository
}

func NewUserRolesService(repo repository.UserRolesRepository) UserRolesService {
	return &userRolesService{repo: repo}
}

func (s *userRolesService) Resolve(ctx context.Context, userID uuid.UUID) (repository.EffectiveRoles, error) {
	role, err := s.repo.GetGlobalRoleByUserID(ctx, userID)
	if err != nil {
		return repository.EffectiveRoles{}, err
	}
	memberships, err := s.repo.ListSalonMembershipsByUserID(ctx, userID)
	if err != nil {
		return repository.EffectiveRoles{}, err
	}
	isMaster, err := s.repo.HasMasterProfileByUserID(ctx, userID)
	if err != nil {
		return repository.EffectiveRoles{}, err
	}
	pendingInvites, err := s.repo.CountPendingInvitesByUserID(ctx, userID)
	if err != nil {
		return repository.EffectiveRoles{}, err
	}

	refs := make([]repository.SalonMembershipRef, 0, len(memberships))
	for _, m := range memberships {
		refs = append(refs, repository.SalonMembershipRef{
			SalonID:   m.SalonID,
			SalonName: m.SalonName,
			Role:      m.Role,
		})
	}
	out := repository.EffectiveRoles{
		IsClient:         true,
		IsMaster:         isMaster,
		IsPlatformAdmin:  role == "admin",
		SalonMemberships: refs,
		PendingInvites:   pendingInvites,
	}
	return out, nil
}
