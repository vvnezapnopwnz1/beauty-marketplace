package service

import (
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
)

type ManualAppointmentInput struct {
	ServiceIDs   []uuid.UUID
	StaffID      *uuid.UUID
	StartsAt     time.Time
	GuestName    string
	GuestPhone   string
	ClientNote   string
	ClientUserID *uuid.UUID
}

type AppointmentServiceDTO struct {
	ID              uuid.UUID `json:"id"`
	Name            string    `json:"name"`
	DurationMinutes int       `json:"durationMinutes"`
	PriceCents      int64     `json:"priceCents"`
}

type AppointmentDetailDTO struct {
	ID             uuid.UUID               `json:"id"`
	SalonID        uuid.UUID               `json:"salonId"`
	StartsAt       time.Time               `json:"startsAt"`
	EndsAt         time.Time               `json:"endsAt"`
	Status         string                  `json:"status"`
	SalonMasterID  *uuid.UUID              `json:"salonMasterId,omitempty"`
	StaffName      *string                 `json:"staffName,omitempty"`
	GuestName      *string                 `json:"guestName,omitempty"`
	GuestPhone     *string                 `json:"guestPhone,omitempty"`
	ClientUserID   *uuid.UUID              `json:"clientUserId,omitempty"`
	ClientNote     *string                 `json:"clientNote,omitempty"`
	SalonClientID  *uuid.UUID              `json:"salonClientId,omitempty"`
	Services       []AppointmentServiceDTO `json:"services"`
	CreatedAt      time.Time               `json:"createdAt"`
}

type UpdateAppointmentInput struct {
	AppointmentID uuid.UUID
	StartsAt      *time.Time
	EndsAt        *time.Time
	StaffID       *uuid.UUID
	ClearStaffID  bool
	ServiceIDs    []uuid.UUID
	ClientNote    *string
	GuestName     *string
	GuestPhone    *string
}

type ServiceInput struct {
	Name               string      `json:"name"`
	Category           *string     `json:"category"`
	CategorySlug       string      `json:"categorySlug"`
	AllowAllCategories bool        `json:"allowAllCategories"`
	Description        *string     `json:"description"`
	DurationMinutes    int         `json:"durationMinutes"`
	PriceCents         *int64      `json:"priceCents"`
	IsActive           bool        `json:"isActive"`
	SortOrder          int         `json:"sortOrder"`
	StaffIDs           []uuid.UUID `json:"staffIds,omitempty"`
}

type WorkingHourInput struct {
	DayOfWeek     int16   `json:"dayOfWeek"`
	OpensAt       string  `json:"opensAt"`
	ClosesAt      string  `json:"closesAt"`
	Closed        bool    `json:"closed"`
	BreakStartsAt *string `json:"breakStartsAt,omitempty"`
	BreakEndsAt   *string `json:"breakEndsAt,omitempty"`
}

type StaffWorkingHourInput struct {
	DayOfWeek     int16   `json:"dayOfWeek"`
	OpensAt       string  `json:"opensAt"`
	ClosesAt      string  `json:"closesAt"`
	IsDayOff      bool    `json:"isDayOff"`
	BreakStartsAt *string `json:"breakStartsAt,omitempty"`
	BreakEndsAt   *string `json:"breakEndsAt,omitempty"`
}

type SalonProfileInput struct {
	NameOverride         *string  `json:"nameOverride"`
	Description          *string  `json:"description"`
	PhonePublic          *string  `json:"phonePublic"`
	CategoryID           *string  `json:"categoryId"`
	SalonType            *string  `json:"salonType"`
	BusinessType         *string  `json:"businessType"`
	OnlineBookingEnabled *bool    `json:"onlineBookingEnabled"`
	AddressOverride      *string  `json:"addressOverride"`
	District             *string  `json:"district"`
	Address              *string  `json:"address"`
	Lat                  *float64 `json:"lat"`
	Lng                  *float64 `json:"lng"`
	PhotoURL             *string  `json:"photoUrl"`
	Timezone             *string  `json:"timezone"`
}

type StaffInput struct {
	DisplayName           string                              `json:"displayName"`
	Role                  *string                             `json:"role"`
	Level                 *string                             `json:"level"`
	Bio                   *string                             `json:"bio"`
	Phone                 *string                             `json:"phone"`
	TelegramUsername      *string                             `json:"telegramUsername"`
	Email                 *string                             `json:"email"`
	Color                 *string                             `json:"color"`
	JoinedAt              *string                             `json:"joinedAt"`
	DashboardAccess       bool                                `json:"dashboardAccess"`
	TelegramNotifications bool                                `json:"telegramNotifications"`
	IsActive              bool                                `json:"isActive"`
	ServiceIDs            []uuid.UUID                         `json:"serviceIds"`
	Specializations       []string                            `json:"specializations"`
	YearsExperience       *int                                `json:"yearsExperience"`
	ServiceAssignments    []SalonMasterServiceAssignmentInput `json:"serviceAssignments,omitempty"`
}

type SalonMasterServiceAssignmentInput struct {
	ServiceID               uuid.UUID `json:"serviceId"`
	PriceOverrideCents      *int64    `json:"priceOverrideCents"`
	DurationOverrideMinutes *int      `json:"durationOverrideMinutes"`
}

type MasterProfileLite struct {
	ID              uuid.UUID `json:"id"`
	Bio             *string   `json:"bio"`
	Specializations []string  `json:"specializations"`
	AvatarURL       *string   `json:"avatarUrl"`
	YearsExperience *int      `json:"yearsExperience"`
	OwnedByUser     bool      `json:"ownedByUser"`
}

type SalonMasterServiceOut struct {
	ServiceID               uuid.UUID `json:"serviceId"`
	ServiceName             string    `json:"serviceName"`
	SalonPriceCents         *int64    `json:"salonPriceCents"`
	SalonDurationMinutes    int       `json:"salonDurationMinutes"`
	PriceOverrideCents      *int64    `json:"priceOverrideCents"`
	DurationOverrideMinutes *int      `json:"durationOverrideMinutes"`
}

type SalonMasterDashboardDetail struct {
	ID                    uuid.UUID               `json:"id"`
	SalonID               uuid.UUID               `json:"salonId"`
	DisplayName           string                  `json:"displayName"`
	Color                 *string                 `json:"color,omitempty"`
	IsActive              bool                    `json:"isActive"`
	Status                string                  `json:"status"`
	Role                  *string                 `json:"role,omitempty"`
	Level                 *string                 `json:"level,omitempty"`
	Bio                   *string                 `json:"bio,omitempty"`
	Phone                 *string                 `json:"phone,omitempty"`
	TelegramUsername      *string                 `json:"telegramUsername,omitempty"`
	Email                 *string                 `json:"email,omitempty"`
	JoinedAt              *time.Time              `json:"joinedAt,omitempty"`
	DashboardAccess       bool                    `json:"dashboardAccess"`
	TelegramNotifications bool                    `json:"telegramNotifications"`
	CreatedAt             time.Time               `json:"createdAt"`
	MasterProfile         *MasterProfileLite      `json:"masterProfile,omitempty"`
	Services              []SalonMasterServiceOut `json:"services"`
	ServiceIds            []uuid.UUID             `json:"serviceIds"` //nolint:tagliatelle // API contract
}

type SalonMasterDashboardListItem struct {
	ID                    uuid.UUID               `json:"id"`
	SalonID               uuid.UUID               `json:"salonId"`
	DisplayName           string                  `json:"displayName"`
	Color                 *string                 `json:"color,omitempty"`
	IsActive              bool                    `json:"isActive"`
	Status                string                  `json:"status"`
	Role                  *string                 `json:"role,omitempty"`
	Level                 *string                 `json:"level,omitempty"`
	JoinedAt              *time.Time              `json:"joinedAt,omitempty"`
	DashboardAccess       bool                    `json:"dashboardAccess"`
	TelegramNotifications bool                    `json:"telegramNotifications"`
	MasterProfile         *MasterProfileLite      `json:"masterProfile,omitempty"`
	Services              []SalonMasterServiceOut `json:"services"`
	LoadPercentWeek       float64                 `json:"loadPercentWeek"`
	RatingAvg             *float64                `json:"ratingAvg"`
	ReviewCount           int64                   `json:"reviewCount"`
	CompletedVisits       int64                   `json:"completedVisits"`
	RevenueMonthCents     int64                   `json:"revenueMonthCents"`
}

type StaffMetricsDTO struct {
	Rating            *float64 `json:"rating"`
	ReviewCount       int64    `json:"reviewCount"`
	TotalVisits       int64    `json:"totalVisits"`
	RevenueMonthCents int64    `json:"revenueMonthCents"`
	LoadPercent       float64  `json:"loadPercent"`
	UpcomingCount     int64    `json:"upcomingCount"`
}

type SalonScheduleBundle struct {
	SlotDurationMinutes int                       `json:"slotDurationMinutes"`
	WorkingHours        []model.WorkingHour       `json:"workingHours"`
	DateOverrides       []model.SalonDateOverride `json:"dateOverrides"`
}

type StaffScheduleBundle struct {
	Rows     []model.SalonMasterHour    `json:"rows"`
	Absences []model.SalonMasterAbsence `json:"absences"`
}

type DateOverrideInput struct {
	OnDate   string  `json:"onDate"`
	IsClosed bool    `json:"isClosed"`
	Note     *string `json:"note"`
}

type StaffAbsenceInput struct {
	StartsOn string `json:"startsOn"`
	EndsOn   string `json:"endsOn"`
	Kind     string `json:"kind"`
}

type SalonSchedulePayload struct {
	SlotDurationMinutes *int               `json:"slotDurationMinutes,omitempty"`
	WorkingHours        []WorkingHourInput `json:"workingHours,omitempty"`
	DateOverrides       []DateOverrideInput `json:"dateOverrides,omitempty"`
}

type StaffSchedulePayload struct {
	Rows     []StaffWorkingHourInput `json:"rows,omitempty"`
	Absences []StaffAbsenceInput     `json:"absences,omitempty"`
}

type DashboardStats struct {
	AppointmentsToday          int64   `json:"appointmentsToday"`
	AppointmentsTodayConfirmed int64   `json:"appointmentsTodayConfirmed"`
	NewAppointmentsWeek        int64   `json:"newAppointmentsWeek"`
	NewAppointmentsPrevWeek    int64   `json:"newAppointmentsPrevWeek"`
	WeekChangePct              float64 `json:"weekChangePct"`
	LoadPct                    float64 `json:"loadPct"`
	Rating                     float64 `json:"rating"`
	ReviewCount                int     `json:"reviewCount"`
	PendingCount               int64   `json:"pendingCount"`
}

type ServiceCategoryItemDTO struct {
	Slug       string `json:"slug"`
	NameRu     string `json:"nameRu"`
	ParentSlug string `json:"parentSlug"`
	SortOrder  int    `json:"sortOrder"`
}

type ServiceCategoryGroupDTO struct {
	ParentSlug string                   `json:"parentSlug"`
	Label      string                   `json:"label"`
	Items      []ServiceCategoryItemDTO `json:"items"`
}

type ServiceCategoriesResponse struct {
	SalonType *string                   `json:"salonType"`
	Groups    []ServiceCategoryGroupDTO `json:"groups"`
}
