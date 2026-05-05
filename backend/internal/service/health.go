package service

import (
	"context"

	"github.com/beauty-marketplace/backend/internal/repository"
)

// HealthService exposes application-level readiness checks.
type HealthService interface {
	Check(ctx context.Context) error
}

type healthService struct {
	health repository.HealthRepository
}

// NewHealthService wires health checks.
func NewHealthService(health repository.HealthRepository) HealthService {
	return &healthService{health: health}
}

func (s *healthService) Check(ctx context.Context) error {
	return s.health.Ping(ctx)
}
