package app

import (
	"context"
	"net/http"
	"time"

	"github.com/beauty-marketplace/backend/internal/auth"
	"github.com/beauty-marketplace/backend/internal/config"
	"github.com/beauty-marketplace/backend/internal/controller"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence"
	"github.com/beauty-marketplace/backend/internal/infrastructure/twogis"
	applogger "github.com/beauty-marketplace/backend/internal/logger"
	"github.com/beauty-marketplace/backend/internal/push"
	"github.com/beauty-marketplace/backend/internal/repository"
	"github.com/beauty-marketplace/backend/internal/service"
	"go.uber.org/fx"
	"go.uber.org/fx/fxevent"
	"go.uber.org/zap"
)

func provideJWTManager(cfg *config.Config) *auth.JWTManager {
	return auth.NewJWTManager(cfg.JWTSecret)
}

func provideNotificationService(
	repo repository.NotificationRepository,
	expo *push.ExpoPusher,
) service.NotificationService {
	return service.NewNotificationService(repo, expo)
}

func provideFileStorage(cfg *config.Config) (service.FileStorage, error) {
	// Use S3PublicURL if set, otherwise fallback to FilePublicBaseURL for backward compatibility
	publicURL := cfg.S3PublicURL
	if publicURL == "" {
		publicURL = cfg.FilePublicBaseURL
	}
	if publicURL == "" {
		publicURL = cfg.ResolvedFilePublicBaseURL()
	}

	switch cfg.StorageType {
	case "s3":
		if cfg.S3Endpoint == "" || cfg.S3AccessKey == "" || cfg.S3SecretKey == "" {
			// Fallback to local if S3 config is incomplete
			return service.NewLocalFileStorage(cfg.FileUploadPath, publicURL), nil
		}
		return service.NewS3FileStorage(
			cfg.S3Endpoint,
			cfg.S3AccessKey,
			cfg.S3SecretKey,
			cfg.S3Bucket,
			cfg.S3Region,
			publicURL,
		)
	default:
		return service.NewLocalFileStorage(cfg.FileUploadPath, publicURL), nil
	}
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
				persistence.NewMasterScheduleRepository,
				fx.As(new(repository.MasterScheduleRepository)),
			),
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
			persistence.NewDeviceRepository,
			fx.Annotate(
				persistence.NewChatRepository,
				fx.As(new(repository.ChatRepository)),
			),
			repository.NewQuickReplyRepository,
			provideFileStorage,
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
			push.NewExpoPusher,
			provideNotificationService,
			service.NewAppointmentNotifier,
			service.NewAuthService,
			service.NewStaffPhoneOTPService,
			service.NewDeviceService,
			service.NewAppointmentChatResolver,
			service.NewInquiryResolver,
			service.NewChatBroadcaster,
			service.NewChatService,
			service.NewQuickReplyService,
			service.NewAppointmentChatHook,
			service.NewChatArchiver,
			controller.NewHealthController,
			fx.Annotate(
				controller.NewSalonController,
			),
			controller.NewPlacesController,
			controller.NewSearchController,
			controller.NewGeoController,
			controller.NewAuthController,
			controller.NewDashboardController,
			controller.NewSalonClientController,
			controller.NewSalonClaimController,
			controller.NewMasterController,
			controller.NewMasterDashboardController,
			fx.Annotate(
				controller.NewUserController,
			),
			controller.NewNotificationController,
			controller.NewDeviceController,
			controller.NewDevController,
			controller.NewFileController,
			controller.NewQuickReplyController,
			controller.NewChatController,
			controller.NewHTTPServer,
		),
		fx.Invoke(func(*http.Server) {}),
		fx.Invoke(func(c service.ChatService, p *push.ExpoPusher) {
			c.SetPusher(p)
		}),
		fx.Invoke(func(lc fx.Lifecycle, a *service.ChatArchiver) {
			ctx, cancel := context.WithCancel(context.Background())
			lc.Append(fx.Hook{
				OnStart: func(_ context.Context) error {
					a.Start(ctx, time.Hour)
					return nil
				},
				OnStop: func(_ context.Context) error {
					cancel()
					return nil
				},
			})
		}),
	)
}
