package model

// GlobalRole matches PostgreSQL enum global_role.
type GlobalRole string

const (
	RoleClient     GlobalRole = "client"
	RoleSalonOwner GlobalRole = "salon_owner"
	RoleMaster     GlobalRole = "master"
	RoleAdvertiser GlobalRole = "advertiser"
	RoleAdmin      GlobalRole = "admin"
)

// WorkingHoursDayOfWeek: 0 = Monday .. 6 = Sunday (column working_hours.day_of_week).

// AppointmentStatus matches PostgreSQL enum appointment_status.
type AppointmentStatus string

const (
	AppointmentPending           AppointmentStatus = "pending"
	AppointmentConfirmed         AppointmentStatus = "confirmed"
	AppointmentCancelledClient   AppointmentStatus = "cancelled_by_client"
	AppointmentCancelledSalon    AppointmentStatus = "cancelled_by_salon"
	AppointmentCompleted         AppointmentStatus = "completed"
	AppointmentNoShow            AppointmentStatus = "no_show"
)

// SalonMemberRole matches PostgreSQL enum salon_member_role.
type SalonMemberRole string

const (
	SalonRoleOwner SalonMemberRole = "owner"
	SalonRoleAdmin SalonMemberRole = "admin"
)

// SubscriptionPlan matches PostgreSQL enum subscription_plan.
type SubscriptionPlan string

const (
	PlanFree SubscriptionPlan = "free"
	PlanPaid SubscriptionPlan = "paid"
)

// SubscriptionStatus matches PostgreSQL enum subscription_status.
type SubscriptionStatus string

const (
	SubActive  SubscriptionStatus = "active"
	SubExpired SubscriptionStatus = "expired"
	SubTrial   SubscriptionStatus = "trial"
)
