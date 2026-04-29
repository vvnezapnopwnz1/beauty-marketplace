package repository

// DashboardRepository reads/writes salon-owner dashboard data (scoped by salon_id).
// It composes domain-specific sub-interfaces for cleaner dependency boundaries.
type DashboardRepository interface {
	DashboardAppointmentRepository
	DashboardServiceRepository
	DashboardStaffRepository
	DashboardScheduleRepository
	DashboardStatsRepository
	DashboardSalonRepository
}
