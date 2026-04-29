package persistence

import (
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

type dashboardRepository struct {
	db *gorm.DB
}

// NewDashboardRepository constructs DashboardRepository.
func NewDashboardRepository(db *gorm.DB) repository.DashboardRepository {
	return &dashboardRepository{db: db}
}
