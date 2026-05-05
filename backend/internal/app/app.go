package app

import (
	"net/http"

	"github.com/beauty-marketplace/backend/internal/auth"
	"github.com/beauty-marketplace/backend/internal/config"
	"github.com/beauty-marketplace/backend/internal/controller"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence"
	"github.com/beauty-marketplace/backend/internal/infrastructure/twogis"
	applogger "github.com/beauty-marketplace/backend/internal/logger"
	"github.com/beauty-marketplace/backend/internal/repository"
	"github.com/beauty-marketplace/backend/internal/service"
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
			persistence.NewSalonClientRepository,
			persistence.NewSalonClaimRepository,
			persistence.NewTelegramLinkRepository,
			persistence.NewTelegramOutboxWriter,
			persistence.NewUserAppointmentRepository,
			persistence.NewNotificationRepository,
			persistence.NewMasterPublicRepository,
			persistence.NewMasterDashboardRepository,
			fx.Annotate(
				persistence.NewAuthRepository,
				fx.As(new(repository.AuthRepository)),
			),
			fx.Annotate(
				persistence.NewUserProfileRepository,
				fx.As(new(repository.UserProfileRepository)),
			),
			fx.Annotate(
				persistence.NewUserRolesRepository,
				fx.As(new(repository.UserRolesRepository)),
			),
			fx.Annotate(
				persistence.NewSalonMemberInviteRepository,
				fx.As(new(repository.SalonMemberInviteRepository)),
			),
			fx.Annotate(
				persistence.NewStaffPhoneVerificationRepository,
				fx.As(new(repository.StaffPhoneVerificationRepository)),
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
			service.NewUserAppointmentService,
			service.NewDashboardService,
			service.NewSalonClientService,
			service.NewSalonClaimService,
			service.NewMasterPublicService,
			service.NewMasterDashboardService,
			service.NewUserRolesService,
			service.NewUserProfileService,
			service.NewNotificationService,
			service.NewAppointmentNotifier,
			service.NewAuthService,
			service.NewStaffPhoneOTPService,
			controller.NewHealthController,
			controller.NewSalonController,
			controller.NewPlacesController,
			controller.NewSearchController,
			controller.NewGeoController,
			controller.NewAuthController,
			controller.NewDashboardController,
			controller.NewSalonClientController,
			controller.NewSalonClaimController,
			controller.NewMasterController,
			controller.NewMasterDashboardController,
			controller.NewUserController,
			controller.NewNotificationController,
			controller.NewDevController,
			controller.NewHTTPServer,
		),
		fx.Invoke(func(*http.Server) {}),
	)
}
