package persistence

import (
	"context"

	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

type healthRepository struct {
	db *gorm.DB
}

// NewHealthRepository implements repository.HealthRepository using GORM's sql.DB.
func NewHealthRepository(db *gorm.DB) repository.HealthRepository {
	return &healthRepository{db: db}
}

func (r *healthRepository) Ping(ctx context.Context) error {
	sqlDB, err := r.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.PingContext(ctx)
}
