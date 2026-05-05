package persistence

import (
	"github.com/beauty-marketplace/backend/internal/repository"
	"gorm.io/gorm"
)

type dashboardRepository struct {
	db *gorm.DB
}

// NewDashboardRepository constructs DashboardRepository.
func NewDashboardRepository(db *gorm.DB) repository.DashboardRepository {
	return &dashboardRepository{db: db}
}
