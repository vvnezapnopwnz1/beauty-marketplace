package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
)

// DashboardService is the salon-owner dashboard API logic.
type DashboardService interface {
	Membership(ctx context.Context, userID, salonID uuid.UUID) (*repository.SalonMembership, error)

	ListAppointments(ctx context.Context, salonID uuid.UUID, f repository.AppointmentListFilter) ([]repository.AppointmentListRow, int64, error)
	GetAppointment(ctx context.Context, salonID, appointmentID uuid.UUID) (*AppointmentDetailDTO, error)
	CreateManualAppointment(ctx context.Context, salonID uuid.UUID, in ManualAppointmentInput) (*model.Appointment, error)
	UpdateAppointmentStatus(ctx context.Context, salonID, appointmentID uuid.UUID, newStatus string) error
	UpdateAppointment(ctx context.Context, salonID uuid.UUID, in UpdateAppointmentInput) error

	ListServices(ctx context.Context, salonID uuid.UUID) ([]model.SalonService, error)
	ServiceStaffNamesMap(ctx context.Context, salonID uuid.UUID) (map[uuid.UUID][]string, error)
	CreateService(ctx context.Context, salonID uuid.UUID, in ServiceInput) (*model.SalonService, error)
	UpdateService(ctx context.Context, salonID, serviceID uuid.UUID, in ServiceInput) (*model.SalonService, error)
	DeleteService(ctx context.Context, salonID, serviceID uuid.UUID) error

	ListStaff(ctx context.Context, salonID uuid.UUID) ([]model.SalonMaster, error)
	ListStaffDashboard(ctx context.Context, salonID uuid.UUID) ([]SalonMasterDashboardListItem, error)
	GetStaff(ctx context.Context, salonID, staffID uuid.UUID) (*model.SalonMaster, []uuid.UUID, error)
	GetSalonMasterDashboardDetail(ctx context.Context, salonID, salonMasterID uuid.UUID) (*SalonMasterDashboardDetail, error)
	CreateStaff(ctx context.Context, salonID uuid.UUID, in StaffInput) (*model.SalonMaster, error)
	UpdateStaff(ctx context.Context, salonID, staffID uuid.UUID, in StaffInput) (*model.SalonMaster, error)
	DeleteStaff(ctx context.Context, salonID, staffID uuid.UUID) error

	LookupMasterByPhone(ctx context.Context, phoneE164 string) (*model.MasterProfile, bool, error)
	CreateMasterInvite(ctx context.Context, salonID, masterProfileID uuid.UUID) (*model.SalonMaster, error)
	ReplaceSalonMasterServices(ctx context.Context, salonID, salonMasterID uuid.UUID, rows []SalonMasterServiceAssignmentInput) error

	StaffMetrics(ctx context.Context, salonID, staffID uuid.UUID, period string) (*StaffMetricsDTO, error)

	GetSchedule(ctx context.Context, salonID uuid.UUID) ([]model.WorkingHour, error)
	GetSalonScheduleBundle(ctx context.Context, salonID uuid.UUID) (*SalonScheduleBundle, error)
	PutSchedule(ctx context.Context, salonID uuid.UUID, rows []WorkingHourInput) error
	PutSalonScheduleBundle(ctx context.Context, salonID uuid.UUID, in SalonSchedulePayload) error

	GetStaffSchedule(ctx context.Context, salonID, staffID uuid.UUID) ([]model.SalonMasterHour, error)
	GetStaffScheduleBundle(ctx context.Context, salonID, staffID uuid.UUID) (*StaffScheduleBundle, error)
	PutStaffSchedule(ctx context.Context, salonID, staffID uuid.UUID, rows []StaffWorkingHourInput) error
	PutStaffScheduleBundle(ctx context.Context, salonID, staffID uuid.UUID, in StaffSchedulePayload) error

	Stats(ctx context.Context, salonID uuid.UUID, period string) (*DashboardStats, error)
	GetSalonProfile(ctx context.Context, salonID uuid.UUID) (*model.Salon, error)
	GetSalonCategoryScopes(ctx context.Context, salonID uuid.UUID) ([]string, error)
	PutSalonProfile(ctx context.Context, salonID uuid.UUID, in SalonProfileInput) (*model.Salon, error)

	ListServiceCategories(ctx context.Context, salonID uuid.UUID, fullList bool) (*ServiceCategoriesResponse, error)

	ListSalonMemberUsers(ctx context.Context, salonID uuid.UUID) ([]repository.SalonMemberUserRow, error)
	RemoveSalonMember(ctx context.Context, salonID, targetUserID uuid.UUID) (bool, error)
	UpdateSalonMemberRole(ctx context.Context, salonID, targetUserID uuid.UUID, role string) (bool, error)

	ListStaffInvites(ctx context.Context, salonID uuid.UUID) ([]repository.SalonMemberInviteListRow, error)
	CreateStaffInvite(ctx context.Context, salonID, invitedBy uuid.UUID, phoneE164, role string) (*repository.SalonMemberInviteListRow, error)
	RevokeStaffInvite(ctx context.Context, salonID, inviteID uuid.UUID) (bool, error)
	ListMySalonInvites(ctx context.Context, userID uuid.UUID) ([]repository.SalonMemberInviteListRow, error)
	AcceptMySalonInvite(ctx context.Context, userID, inviteID uuid.UUID) error
	DeclineMySalonInvite(ctx context.Context, userID, inviteID uuid.UUID) (bool, error)
}

type dashboardService struct {
	dash     repository.DashboardRepository
	clients  repository.SalonClientRepository
	invites  repository.SalonMemberInviteRepository
	notifier AppointmentNotifier
}

// NewDashboardService constructs DashboardService.
func NewDashboardService(
	dash repository.DashboardRepository,
	clients repository.SalonClientRepository,
	invites repository.SalonMemberInviteRepository,
	notifier AppointmentNotifier,
) DashboardService {
	return &dashboardService{dash: dash, clients: clients, invites: invites, notifier: notifier}
}
