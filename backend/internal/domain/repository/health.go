package repository

import "context"

// HealthRepository checks infrastructure readiness (e.g. database connectivity).
type HealthRepository interface {
	Ping(ctx context.Context) error
}
