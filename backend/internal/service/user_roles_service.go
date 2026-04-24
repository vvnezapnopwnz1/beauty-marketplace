package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/repository"
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

	out := repository.EffectiveRoles{
		IsClient:        true,
		IsMaster:        isMaster,
		IsPlatformAdmin: role == "admin",
		OwnerOfSalons:   make([]repository.SalonRef, 0),
		AdminOfSalons:   make([]repository.SalonRef, 0),
	}
	for _, m := range memberships {
		switch m.Role {
		case "owner":
			out.OwnerOfSalons = append(out.OwnerOfSalons, repository.SalonRef{SalonID: m.SalonID})
		case "admin":
			out.AdminOfSalons = append(out.AdminOfSalons, repository.SalonRef{SalonID: m.SalonID})
		}
	}
	return out, nil
}
