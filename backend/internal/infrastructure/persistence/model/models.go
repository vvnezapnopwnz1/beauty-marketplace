package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

// SalonExternalID maps to salon_external_ids.
// PK is (salon_id, source) — one external ID per source per salon.
// UNIQUE (source, external_id) — same external object cannot link to two salons.
type SalonExternalID struct {
	SalonID    uuid.UUID      `gorm:"type:uuid;primaryKey;column:salon_id"`
	Source     string         `gorm:"primaryKey;column:source"`
	ExternalID string         `gorm:"column:external_id;not null"`
	Meta       map[string]any `gorm:"serializer:json;column:meta;type:jsonb"`
	SyncedAt   *time.Time     `gorm:"column:synced_at"`
}

func (SalonExternalID) TableName() string {
	return "salon_external_ids"
}

// User maps to users.
type User struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey"`
	PhoneE164   string         `gorm:"column:phone_e164;not null;uniqueIndex"`
	Username    *string        `gorm:"column:username"`
	FirstName   *string        `gorm:"column:first_name"`
	LastName    *string        `gorm:"column:last_name"`
	BirthDate   *time.Time     `gorm:"column:birth_date;type:date"`
	Gender      *string        `gorm:"column:gender"`
	City        *string        `gorm:"column:city"`
	Bio         *string        `gorm:"column:bio"`
	Locale      string         `gorm:"column:locale;not null;default:ru"`
	ThemePref   string         `gorm:"column:theme_pref;not null;default:system"`
	AvatarURL   *string        `gorm:"column:avatar_url"`
	DisplayName *string        `gorm:"column:display_name"`
	GlobalRole  string         `gorm:"type:global_role;column:global_role;not null;default:client"`
	CreatedAt   time.Time      `gorm:"column:created_at;not null;autoCreateTime"`
	UpdatedAt   time.Time      `gorm:"column:updated_at;not null;autoUpdateTime"`
	DeletedAt   gorm.DeletedAt `gorm:"column:deleted_at;index"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

// Salon maps to salons.
type Salon struct {
	ID                   uuid.UUID         `gorm:"type:uuid;primaryKey"`
	ExternalIDs          []SalonExternalID `gorm:"foreignKey:SalonID"`
	NameOverride         *string           `gorm:"column:name_override"`
	AddressOverride      *string           `gorm:"column:address_override"`
	Timezone             string            `gorm:"column:timezone;not null;default:Europe/Moscow"`
	Description          *string           `gorm:"column:description"`
	PhonePublic          *string           `gorm:"column:phone_public"`
	OnlineBookingEnabled bool              `gorm:"column:online_booking_enabled;not null;default:false"`
	CategoryID           *string           `gorm:"column:category_id"`
	SalonType            *string           `gorm:"column:salon_type"`
	BusinessType         *string           `gorm:"column:business_type;default:venue"`
	Lat                  *float64          `gorm:"column:lat"`
	Lng                  *float64          `gorm:"column:lng"`
	Address              *string           `gorm:"column:address"`
	District             *string           `gorm:"column:district"`
	PhotoURL             *string           `gorm:"column:photo_url"`
	Badge                *string           `gorm:"column:badge"`
	CardGradient         *string           `gorm:"column:card_gradient;default:bg1"`
	Emoji                *string           `gorm:"column:emoji"`
	CachedRating         *float64          `gorm:"column:cached_rating;default:0"`
	CachedReviewCount    *int              `gorm:"column:cached_review_count;default:0"`
	SlotDurationMinutes  int               `gorm:"column:slot_duration_minutes;not null;default:30"`
	CreatedAt            time.Time         `gorm:"column:created_at;not null;autoCreateTime"`
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

// MasterProfile is an independent master profile.
// Lives outside any salon context.
// UserID nullable: NULL = "shadow" profile created by a salon.
type MasterProfile struct {
	ID                uuid.UUID      `gorm:"type:uuid;primaryKey"`
	UserID            *uuid.UUID     `gorm:"type:uuid"`
	DisplayName       string         `gorm:"column:display_name;not null"`
	AvatarURL         *string        `gorm:"column:avatar_url"`
	Bio               *string        `gorm:"column:bio"`
	Specializations   pq.StringArray `gorm:"type:text[];column:specializations;not null;default:'{}'"`
	YearsExperience   *int           `gorm:"column:years_experience"`
	PhoneE164         *string        `gorm:"column:phone_e164"`
	CachedRating      *float64       `gorm:"column:cached_rating"`
	CachedReviewCount int            `gorm:"column:cached_review_count;not null;default:0"`
	IsActive          bool           `gorm:"column:is_active;not null;default:true"`
	CreatedAt         time.Time      `gorm:"column:created_at;not null;autoCreateTime"`
	UpdatedAt         time.Time      `gorm:"column:updated_at;not null;autoUpdateTime"`
}

// MasterService is a master's personal service catalog entry.
// Not tied to any salon.
type MasterService struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey"`
	MasterID        uuid.UUID `gorm:"type:uuid;not null;column:master_id"`
	CategorySlug    *string   `gorm:"column:category_slug"`
	Name            string    `gorm:"column:name;not null"`
	Description     *string   `gorm:"column:description"`
	PriceCents      *int      `gorm:"column:price_cents"`
	DurationMinutes int       `gorm:"column:duration_minutes;not null"`
	IsActive        bool      `gorm:"column:is_active;not null;default:true"`
	SortOrder       int       `gorm:"column:sort_order;not null;default:0"`
	CreatedAt       time.Time `gorm:"column:created_at;not null;autoCreateTime"`
}

// SalonMaster is a master's membership in a salon (formerly Staff).
// Rows are never deleted when a master leaves: is_active=false + left_at=now().
type SalonMaster struct {
	ID                    uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	SalonID               uuid.UUID  `gorm:"type:uuid;not null;column:salon_id" json:"salonId"`
	MasterID              *uuid.UUID `gorm:"type:uuid;column:master_id"`
	DisplayName           string     `gorm:"column:display_name;not null" json:"displayName"`
	DisplayNameOverride   *string    `gorm:"column:display_name_override"`
	Role                  *string    `gorm:"column:role" json:"role,omitempty"`
	Level                 *string    `gorm:"column:level" json:"level,omitempty"`
	Bio                   *string    `gorm:"column:bio" json:"bio,omitempty"`
	Phone                 *string    `gorm:"column:phone" json:"phone,omitempty"`
	TelegramUsername      *string    `gorm:"column:telegram_username" json:"telegramUsername,omitempty"`
	Email                 *string    `gorm:"column:email" json:"email,omitempty"`
	Color                 *string    `gorm:"column:color" json:"color,omitempty"`
	JoinedAt              *time.Time `gorm:"column:joined_at;type:date" json:"joinedAt,omitempty"`
	LeftAt                *time.Time `gorm:"column:left_at"`
	DashboardAccess       bool       `gorm:"column:dashboard_access;not null;default:false" json:"dashboardAccess"`
	TelegramNotifications bool       `gorm:"column:telegram_notifications;not null;default:true" json:"telegramNotifications"`
	IsActive              bool       `gorm:"column:is_active;not null;default:true" json:"isActive"`
	Status                string     `gorm:"type:salon_master_status;column:status;not null;default:active" json:"status"`
	CreatedAt             time.Time  `gorm:"column:created_at;not null;autoCreateTime" json:"createdAt"`
}

func (SalonMaster) TableName() string { return "salon_masters" }

func (s *SalonMaster) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

// ServiceCategory maps to service_categories (system rows: salon_id NULL).
type ServiceCategory struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey"`
	SalonID    *uuid.UUID `gorm:"type:uuid;column:salon_id"`
	Slug       string     `gorm:"column:slug;not null"`
	NameRu     string     `gorm:"column:name_ru;not null"`
	ParentSlug string     `gorm:"column:parent_slug;not null"`
	SortOrder  int        `gorm:"column:sort_order;not null"`
	IsSystem   bool       `gorm:"column:is_system;not null"`
}

func (ServiceCategory) TableName() string { return "service_categories" }

// SalonService maps to services (reserved word in Go).
type SalonService struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey"`
	SalonID         uuid.UUID `gorm:"type:uuid;not null;column:salon_id"`
	Name            string    `gorm:"column:name;not null"`
	Category        *string   `gorm:"column:category"`
	CategorySlug    *string   `gorm:"column:category_slug"`
	Description     *string   `gorm:"column:description"`
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
	ID            uuid.UUID  `gorm:"type:uuid;primaryKey"`
	SalonID       uuid.UUID  `gorm:"type:uuid;not null;column:salon_id"`
	DayOfWeek     int16      `gorm:"column:day_of_week;not null"`
	OpensAt       string     `gorm:"column:opens_at;type:time;not null"`
	ClosesAt      string     `gorm:"column:closes_at;type:time;not null"`
	IsClosed      bool       `gorm:"column:is_closed;not null;default:false"`
	BreakStartsAt *string    `gorm:"column:break_starts_at;type:time"`
	BreakEndsAt   *string    `gorm:"column:break_ends_at;type:time"`
	ValidFrom     *time.Time `gorm:"column:valid_from;type:date"`
	ValidTo       *time.Time `gorm:"column:valid_to;type:date"`
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

// SalonMasterHour maps to salon_master_hours (per-master schedule).
type SalonMasterHour struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey"`
	SalonMasterID uuid.UUID `gorm:"type:uuid;not null;column:staff_id"`
	DayOfWeek     int16     `gorm:"column:day_of_week;not null"`
	OpensAt       string    `gorm:"column:opens_at;type:time;not null"`
	ClosesAt      string    `gorm:"column:closes_at;type:time;not null"`
	IsDayOff      bool      `gorm:"column:is_day_off;not null;default:false"`
	BreakStartsAt *string   `gorm:"column:break_starts_at;type:time"`
	BreakEndsAt   *string   `gorm:"column:break_ends_at;type:time"`
}

func (s *SalonMasterHour) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

func (SalonMasterHour) TableName() string { return "salon_master_hours" }

// SalonMasterService maps to salon_master_services (many-to-many link).
type SalonMasterService struct {
	SalonMasterID           uuid.UUID `gorm:"type:uuid;primaryKey;column:staff_id"`
	ServiceID               uuid.UUID `gorm:"type:uuid;primaryKey;column:service_id"`
	PriceOverrideCents      *int      `gorm:"column:price_override_cents"`
	DurationOverrideMinutes *int      `gorm:"column:duration_override_minutes"`
}

func (SalonMasterService) TableName() string { return "salon_master_services" }

// SalonDateOverride maps to salon_date_overrides.
type SalonDateOverride struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey"`
	SalonID  uuid.UUID `gorm:"type:uuid;not null;column:salon_id"`
	OnDate   time.Time `gorm:"column:on_date;type:date;not null"`
	IsClosed bool      `gorm:"column:is_closed;not null;default:true"`
	Note     *string   `gorm:"column:note"`
}

func (o *SalonDateOverride) BeforeCreate(tx *gorm.DB) error {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	return nil
}

func (SalonDateOverride) TableName() string {
	return "salon_date_overrides"
}

// SalonMasterAbsence maps to salon_master_absences.
type SalonMasterAbsence struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey"`
	SalonMasterID uuid.UUID `gorm:"type:uuid;not null;column:staff_id"`
	StartsOn      time.Time `gorm:"column:starts_on;type:date;not null"`
	EndsOn        time.Time `gorm:"column:ends_on;type:date;not null"`
	Kind          string    `gorm:"column:kind;not null;default:vacation"`
}

func (a *SalonMasterAbsence) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

func (SalonMasterAbsence) TableName() string { return "salon_master_absences" }

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
	SalonMasterID  *uuid.UUID `gorm:"type:uuid;column:salon_master_id" json:"salonMasterId"`
	ServiceID      uuid.UUID  `gorm:"type:uuid;not null;column:service_id"`
	StartsAt       time.Time  `gorm:"column:starts_at;not null"`
	EndsAt         time.Time  `gorm:"column:ends_at;not null"`
	Status         string     `gorm:"type:appointment_status;not null;default:pending;column:status"`
	ClientNote     *string    `gorm:"column:client_note"`
	SalonClientID  *uuid.UUID `gorm:"type:uuid;column:salon_client_id"`
	CreatedAt      time.Time  `gorm:"column:created_at;not null;autoCreateTime"`
	UpdatedAt      time.Time  `gorm:"column:updated_at;not null;autoUpdateTime"`
}

func (a *Appointment) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// AppointmentLineItem is a snapshot of one booked service (multi-service guest flow).
type AppointmentLineItem struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey"`
	AppointmentID   uuid.UUID `gorm:"type:uuid;not null;column:appointment_id;index:idx_appointment_line_items_appointment_id"`
	ServiceID       uuid.UUID `gorm:"type:uuid;not null;column:service_id"`
	ServiceName     string    `gorm:"column:service_name;not null"`
	DurationMinutes int       `gorm:"column:duration_minutes;not null"`
	PriceCents      int64     `gorm:"column:price_cents;not null;default:0"`
	SortOrder       int       `gorm:"column:sort_order;not null;default:0"`
	CreatedAt       time.Time `gorm:"column:created_at;not null;autoCreateTime"`
}

func (l *AppointmentLineItem) BeforeCreate(tx *gorm.DB) error {
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	return nil
}

func (AppointmentLineItem) TableName() string {
	return "appointment_line_items"
}

// SalonClient maps to salon_clients.
type SalonClient struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey"`
	SalonID     uuid.UUID  `gorm:"type:uuid;not null;column:salon_id"`
	UserID      *uuid.UUID `gorm:"type:uuid;column:user_id"`
	PhoneE164   *string    `gorm:"column:phone_e164"`
	DisplayName string     `gorm:"column:display_name;not null"`
	Notes       *string    `gorm:"column:notes"`
	CreatedAt   time.Time  `gorm:"column:created_at;not null;autoCreateTime"`
	UpdatedAt   time.Time  `gorm:"column:updated_at;not null;autoUpdateTime"`
}

func (c *SalonClient) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

func (SalonClient) TableName() string { return "salon_clients" }

// SalonClientTag maps to salon_client_tags.
// salon_id NULL = system tag visible to all.
type SalonClientTag struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey"`
	SalonID   *uuid.UUID `gorm:"type:uuid;column:salon_id"`
	Name      string     `gorm:"column:name;not null"`
	Color     string     `gorm:"column:color;not null"`
	CreatedAt time.Time  `gorm:"column:created_at;not null;autoCreateTime"`
}

func (t *SalonClientTag) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}

func (SalonClientTag) TableName() string { return "salon_client_tags" }

// SalonClientTagAssignment maps to salon_client_tag_assignments.
type SalonClientTagAssignment struct {
	SalonClientID uuid.UUID `gorm:"type:uuid;primaryKey;column:salon_client_id"`
	TagID         uuid.UUID `gorm:"type:uuid;primaryKey;column:tag_id"`
}

func (SalonClientTagAssignment) TableName() string { return "salon_client_tag_assignments" }

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

// TelegramPhoneLink maps to telegram_phone_links.
type TelegramPhoneLink struct {
	PhoneE164  string    `gorm:"column:phone_e164;primaryKey"`
	ChatID     int64     `gorm:"column:chat_id;not null"`
	TelegramID *int64    `gorm:"column:telegram_id"`
	FirstName  *string   `gorm:"column:first_name"`
	LinkedAt   time.Time `gorm:"column:linked_at;not null;autoCreateTime"`
	UpdatedAt  time.Time `gorm:"column:updated_at;not null;autoUpdateTime"`
}

func (TelegramPhoneLink) TableName() string {
	return "telegram_phone_links"
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
