package app

import (
	"net/http"

	"github.com/yourusername/beauty-marketplace/internal/auth"
	"github.com/yourusername/beauty-marketplace/internal/config"
	"github.com/yourusername/beauty-marketplace/internal/controller"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/twogis"
	applogger "github.com/yourusername/beauty-marketplace/internal/logger"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"github.com/yourusername/beauty-marketplace/internal/service"
	"go.uber.org/fx"
	"go.uber.org/fx/fxevent"
	"go.uber.org/zap"
)

func provideJWTManager(cfg *config.Config) *auth.JWTManager {
	return auth.NewJWTManager(cfg.JWTSecret)
}

// New builds the fx application graph for the HTTP API.
func New() *fx.App {
	return fx.New(
		fx.WithLogger(func(log *zap.Logger) fxevent.Logger {
			return &fxevent.ZapLogger{Logger: log}
		}),
		fx.Provide(
			config.Load,
			applogger.New,
			persistence.NewDB,
			persistence.NewHealthRepository,
			persistence.NewSalonRepository,
			persistence.NewAppointmentRepository,
			persistence.NewBookingSlotsRepository,
			persistence.NewDashboardRepository,
			persistence.NewMasterPublicRepository,
			persistence.NewMasterDashboardRepository,
			fx.Annotate(
				persistence.NewAuthRepository,
				fx.As(new(repository.AuthRepository)),
			),
			fx.Annotate(
				twogis.NewCatalogAdapter,
				fx.As(new(service.PlacesProvider)),
			),
			provideJWTManager,
			service.NewPlacesService,
			service.NewSearchService,
			service.NewGeoService,
			service.NewHealthService,
			service.NewSalonService,
			service.NewBookingService,
			service.NewDashboardService,
			service.NewMasterPublicService,
			service.NewMasterDashboardService,
			service.NewAuthService,
			controller.NewHealthController,
			controller.NewSalonController,
			controller.NewPlacesController,
			controller.NewSearchController,
			controller.NewGeoController,
			controller.NewAuthController,
			controller.NewDashboardController,
			controller.NewMasterController,
			controller.NewMasterDashboardController,
			controller.NewHTTPServer,
		),
		fx.Invoke(func(*http.Server) {}),
	)
}
