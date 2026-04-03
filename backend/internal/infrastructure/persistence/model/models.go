package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User maps to users.
type User struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
	PhoneE164   string    `gorm:"column:phone_e164;not null;uniqueIndex"`
	DisplayName *string   `gorm:"column:display_name"`
	CreatedAt   time.Time `gorm:"column:created_at;not null;autoCreateTime"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

// Salon maps to salons.
type Salon struct {
	ID                     uuid.UUID `gorm:"type:uuid;primaryKey"`
	ExternalSource         string    `gorm:"column:external_source;not null;uniqueIndex:uniq_salons_external"`
	ExternalID             string    `gorm:"column:external_id;not null;uniqueIndex:uniq_salons_external"`
	NameOverride           *string   `gorm:"column:name_override"`
	AddressOverride        *string   `gorm:"column:address_override"`
	Timezone               string    `gorm:"column:timezone;not null;default:Europe/Moscow"`
	Description            *string   `gorm:"column:description"`
	PhonePublic            *string   `gorm:"column:phone_public"`
	OnlineBookingEnabled   bool      `gorm:"column:online_booking_enabled;not null;default:false"`
	CreatedAt              time.Time `gorm:"column:created_at;not null;autoCreateTime"`
}

func (s *Salon) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

// SalonMember maps to salon_members (composite PK).
type SalonMember struct {
	SalonID uuid.UUID `gorm:"type:uuid;primaryKey;column:salon_id"`
	UserID  uuid.UUID `gorm:"type:uuid;primaryKey;column:user_id"`
	Role    string    `gorm:"type:salon_member_role;not null;column:role"`
}

func (SalonMember) TableName() string {
	return "salon_members"
}

// Staff maps to staff.
type Staff struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
	SalonID     uuid.UUID `gorm:"type:uuid;not null;column:salon_id"`
	DisplayName string    `gorm:"column:display_name;not null"`
	IsActive    bool      `gorm:"column:is_active;not null;default:true"`
	CreatedAt   time.Time `gorm:"column:created_at;not null;autoCreateTime"`
}

func (s *Staff) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

// SalonService maps to services (reserved word in Go).
type SalonService struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey"`
	SalonID         uuid.UUID `gorm:"type:uuid;not null;column:salon_id"`
	Name            string    `gorm:"column:name;not null"`
	DurationMinutes int       `gorm:"column:duration_minutes;not null"`
	PriceCents      *int64    `gorm:"column:price_cents"`
	IsActive        bool      `gorm:"column:is_active;not null;default:true"`
	SortOrder       int       `gorm:"column:sort_order;not null;default:0"`
}

func (s *SalonService) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

func (SalonService) TableName() string {
	return "services"
}

// WorkingHour maps to working_hours.
// OpensAt/ClosesAt use PostgreSQL time; store as "HH:MM:SS" or full time layout from DB driver.
type WorkingHour struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey"`
	SalonID   uuid.UUID  `gorm:"type:uuid;not null;column:salon_id"`
	DayOfWeek int16      `gorm:"column:day_of_week;not null"`
	OpensAt   string     `gorm:"column:opens_at;type:time;not null"`
	ClosesAt  string     `gorm:"column:closes_at;type:time;not null"`
	ValidFrom *time.Time `gorm:"column:valid_from;type:date"`
	ValidTo   *time.Time `gorm:"column:valid_to;type:date"`
}

func (w *WorkingHour) BeforeCreate(tx *gorm.DB) error {
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}
	return nil
}

func (WorkingHour) TableName() string {
	return "working_hours"
}

// SalonSubscription maps to salon_subscriptions.
type SalonSubscription struct {
	ID                 uuid.UUID  `gorm:"type:uuid;primaryKey"`
	SalonID            uuid.UUID  `gorm:"type:uuid;not null;column:salon_id"`
	Plan               string     `gorm:"type:subscription_plan;not null;column:plan"`
	Status             string     `gorm:"type:subscription_status;not null;column:status"`
	CurrentPeriodEnd   *time.Time `gorm:"column:current_period_end"`
	ExternalPaymentRef *string    `gorm:"column:external_payment_ref"`
	PaymentProvider    *string    `gorm:"column:payment_provider"`
	CreatedAt          time.Time  `gorm:"column:created_at;not null;autoCreateTime"`
}

func (s *SalonSubscription) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

func (SalonSubscription) TableName() string {
	return "salon_subscriptions"
}

// Appointment maps to appointments.
type Appointment struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey"`
	SalonID      uuid.UUID  `gorm:"type:uuid;not null;column:salon_id"`
	ClientUserID uuid.UUID  `gorm:"type:uuid;not null;column:client_user_id"`
	StaffID      *uuid.UUID `gorm:"type:uuid;column:staff_id"`
	ServiceID    uuid.UUID `gorm:"type:uuid;not null;column:service_id"`
	StartsAt     time.Time `gorm:"column:starts_at;not null"`
	EndsAt       time.Time `gorm:"column:ends_at;not null"`
	Status       string    `gorm:"type:appointment_status;not null;default:pending;column:status"`
	ClientNote   *string   `gorm:"column:client_note"`
	CreatedAt    time.Time `gorm:"column:created_at;not null;autoCreateTime"`
	UpdatedAt    time.Time `gorm:"column:updated_at;not null;autoUpdateTime"`
}

func (a *Appointment) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// UserTelegramIdentity maps to user_telegram_identities.
type UserTelegramIdentity struct {
	UserID         uuid.UUID `gorm:"type:uuid;primaryKey;column:user_id"`
	TelegramUserID int64     `gorm:"column:telegram_user_id;not null;uniqueIndex:uniq_telegram_user_id"`
	TelegramChatID *int64    `gorm:"column:telegram_chat_id"`
	LinkedAt       time.Time `gorm:"column:linked_at;not null;autoCreateTime"`
}

func (UserTelegramIdentity) TableName() string {
	return "user_telegram_identities"
}

// Review maps to reviews (phase 2 migration).
type Review struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey"`
	AppointmentID uuid.UUID `gorm:"type:uuid;not null;column:appointment_id;uniqueIndex:uniq_review_appointment"`
	Rating        int16     `gorm:"column:rating;not null"`
	Body          *string   `gorm:"column:body"`
	ResponseText  *string   `gorm:"column:response_text"`
	CreatedAt     time.Time `gorm:"column:created_at;not null;autoCreateTime"`
}

func (r *Review) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

// WaitlistEntry maps to waitlist_entries (phase 2 migration).
type WaitlistEntry struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey"`
	UserID      uuid.UUID  `gorm:"type:uuid;not null;column:user_id"`
	SalonID     uuid.UUID  `gorm:"type:uuid;not null;column:salon_id"`
	ServiceID   *uuid.UUID `gorm:"type:uuid;column:service_id"`
	DesiredFrom *time.Time `gorm:"column:desired_from;type:date"`
	DesiredTo   *time.Time `gorm:"column:desired_to;type:date"`
	Status      string     `gorm:"column:status;not null;default:active"`
	CreatedAt   time.Time  `gorm:"column:created_at;not null;autoCreateTime"`
}

func (w *WaitlistEntry) BeforeCreate(tx *gorm.DB) error {
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}
	return nil
}

func (WaitlistEntry) TableName() string {
	return "waitlist_entries"
}
