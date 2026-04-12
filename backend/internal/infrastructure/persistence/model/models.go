package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SalonExternalID maps to salon_external_ids.
// PK is (salon_id, source) — one external ID per source per salon.
// UNIQUE (source, external_id) — same external object cannot link to two salons.
type SalonExternalID struct {
	SalonID    uuid.UUID              `gorm:"type:uuid;primaryKey;column:salon_id"`
	Source     string                 `gorm:"primaryKey;column:source"`
	ExternalID string                 `gorm:"column:external_id;not null"`
	Meta       map[string]any         `gorm:"serializer:json;column:meta;type:jsonb"`
	SyncedAt   *time.Time             `gorm:"column:synced_at"`
}

func (SalonExternalID) TableName() string {
	return "salon_external_ids"
}

// User maps to users.
type User struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
	PhoneE164   string    `gorm:"column:phone_e164;not null;uniqueIndex"`
	DisplayName *string   `gorm:"column:display_name"`
	GlobalRole  string    `gorm:"type:global_role;column:global_role;not null;default:client"`
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
	ID                     uuid.UUID         `gorm:"type:uuid;primaryKey"`
	ExternalIDs            []SalonExternalID `gorm:"foreignKey:SalonID"`
	NameOverride           *string           `gorm:"column:name_override"`
	AddressOverride        *string   `gorm:"column:address_override"`
	Timezone               string    `gorm:"column:timezone;not null;default:Europe/Moscow"`
	Description            *string   `gorm:"column:description"`
	PhonePublic            *string   `gorm:"column:phone_public"`
	OnlineBookingEnabled   bool      `gorm:"column:online_booking_enabled;not null;default:false"`
	CategoryID             *string   `gorm:"column:category_id"`
	BusinessType           *string   `gorm:"column:business_type;default:venue"`
	Lat                    *float64  `gorm:"column:lat"`
	Lng                    *float64  `gorm:"column:lng"`
	Address                *string   `gorm:"column:address"`
	District               *string   `gorm:"column:district"`
	PhotoURL               *string   `gorm:"column:photo_url"`
	Badge                  *string   `gorm:"column:badge"`
	CardGradient           *string   `gorm:"column:card_gradient;default:bg1"`
	Emoji                  *string   `gorm:"column:emoji"`
	CachedRating           *float64  `gorm:"column:cached_rating;default:0"`
	CachedReviewCount      *int      `gorm:"column:cached_review_count;default:0"`
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
	IsClosed  bool       `gorm:"column:is_closed;not null;default:false"`
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

// StaffWorkingHour maps to staff_working_hours (per-staff schedule).
type StaffWorkingHour struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	StaffID   uuid.UUID `gorm:"type:uuid;not null;column:staff_id"`
	DayOfWeek int16     `gorm:"column:day_of_week;not null"`
	OpensAt   string    `gorm:"column:opens_at;type:time;not null"`
	ClosesAt  string    `gorm:"column:closes_at;type:time;not null"`
	IsDayOff  bool      `gorm:"column:is_day_off;not null;default:false"`
}

func (s *StaffWorkingHour) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

func (StaffWorkingHour) TableName() string {
	return "staff_working_hours"
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
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey"`
	SalonID        uuid.UUID  `gorm:"type:uuid;not null;column:salon_id"`
	ClientUserID   *uuid.UUID `gorm:"type:uuid;column:client_user_id"`
	GuestName      *string    `gorm:"column:guest_name"`
	GuestPhoneE164 *string    `gorm:"column:guest_phone_e164"`
	StaffID        *uuid.UUID `gorm:"type:uuid;column:staff_id"`
	ServiceID      uuid.UUID  `gorm:"type:uuid;not null;column:service_id"`
	StartsAt       time.Time  `gorm:"column:starts_at;not null"`
	EndsAt         time.Time  `gorm:"column:ends_at;not null"`
	Status         string     `gorm:"type:appointment_status;not null;default:pending;column:status"`
	ClientNote     *string    `gorm:"column:client_note"`
	CreatedAt      time.Time  `gorm:"column:created_at;not null;autoCreateTime"`
	UpdatedAt      time.Time  `gorm:"column:updated_at;not null;autoUpdateTime"`
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

// OtpCode maps to otp_codes.
type OtpCode struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	PhoneE164 string    `gorm:"column:phone_e164;not null"`
	Code      string    `gorm:"column:code;not null"`
	Attempts  int16     `gorm:"column:attempts;not null;default:0"`
	ExpiresAt time.Time `gorm:"column:expires_at;not null"`
	Used      bool      `gorm:"column:used;not null;default:false"`
	CreatedAt time.Time `gorm:"column:created_at;not null;autoCreateTime"`
}

func (o *OtpCode) BeforeCreate(tx *gorm.DB) error {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	return nil
}

func (OtpCode) TableName() string {
	return "otp_codes"
}

// RefreshToken maps to refresh_tokens.
type RefreshToken struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;column:user_id"`
	TokenHash string    `gorm:"column:token_hash;not null"`
	ExpiresAt time.Time `gorm:"column:expires_at;not null"`
	Revoked   bool      `gorm:"column:revoked;not null;default:false"`
	CreatedAt time.Time `gorm:"column:created_at;not null;autoCreateTime"`
}

func (r *RefreshToken) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

func (RefreshToken) TableName() string {
	return "refresh_tokens"
}
