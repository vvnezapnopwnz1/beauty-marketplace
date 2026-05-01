# Staff Phone OTP Verification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a salon owner/admin creates or edits a staff member and sets/changes a phone number, require OTP verification of that phone before saving — preventing accidental or malicious assignment of someone else's number.

**Architecture:** Separate `staff_phone_verifications` table (not modifying `otp_codes`) to avoid any risk to the existing login flow. A new lightweight `StaffPhoneOTPService` reuses the existing `OTPSender` infrastructure for delivery. The verification record UUID serves as a one-time proof token consumed by `CreateStaff`/`UpdateStaff`.

**Tech Stack:** Go 1.24, PostgreSQL migration, GORM, Uber Fx DI; React, RTK Query, MUI, react-hook-form

---

## File Structure

### Backend — New Files
| File | Responsibility |
|------|---------------|
| `backend/migrations/000028_staff_phone_verification.up.sql` | DDL for `staff_phone_verifications` table |
| `backend/migrations/000028_staff_phone_verification.down.sql` | Drop table |
| `backend/internal/repository/staff_phone_verification.go` | Interface: `StaffPhoneVerificationRepository` |
| `backend/internal/infrastructure/persistence/staff_phone_verification_repository.go` | GORM implementation |
| `backend/internal/service/staff_phone_otp.go` | `StaffPhoneOTPService`: request, verify, consume |

### Backend — Modified Files
| File | What Changes |
|------|-------------|
| `backend/internal/infrastructure/persistence/model/models.go` | Add `StaffPhoneVerification` struct |
| `backend/internal/service/dashboard_types.go` | Add `PhoneVerificationProof *string` to `StaffInput` |
| `backend/internal/service/dashboard_staff.go` | Gate phone writes behind proof validation |
| `backend/internal/service/dashboard.go` | Inject `StaffPhoneOTPService` into `dashboardService`; add 2 new interface methods |
| `backend/internal/controller/dashboard_controller.go` | Route `phone-otp/*` to new handlers |
| `backend/internal/controller/dashboard_staff_handlers.go` | Add `requestStaffPhoneOTP` + `verifyStaffPhoneOTP` handlers |
| `backend/internal/app/app.go` | Register new repository + service in Fx graph |

### Frontend — Modified Files
| File | What Changes |
|------|-------------|
| `frontend/src/entities/staff/model/staffApi.ts` | Add `requestStaffPhoneOtp` and `verifyStaffPhoneOtp` mutations |
| `frontend/src/pages/dashboard/ui/modals/StaffFormModal.tsx` | Phone field gains inline OTP verification step |
| `frontend/src/shared/api/dashboardApi.ts` | Add `phoneVerificationProof` to `StaffFormPayload` type |

---

## Task 1: Database Migration

**Files:**
- Create: `backend/migrations/000028_staff_phone_verification.up.sql`
- Create: `backend/migrations/000028_staff_phone_verification.down.sql`

- [ ] **Step 1: Write the up migration**

```sql
-- 000028_staff_phone_verification.up.sql
CREATE TABLE staff_phone_verifications (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id      UUID        NOT NULL REFERENCES salons(id),
    phone_e164    TEXT        NOT NULL,
    code          TEXT        NOT NULL,
    attempts      SMALLINT    NOT NULL DEFAULT 0,
    expires_at    TIMESTAMPTZ NOT NULL,
    verified_at   TIMESTAMPTZ,
    consumed_at   TIMESTAMPTZ,
    created_by    UUID        NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_phone_verif_lookup
    ON staff_phone_verifications (phone_e164, salon_id)
    WHERE verified_at IS NULL AND consumed_at IS NULL;

CREATE INDEX idx_staff_phone_verif_proof
    ON staff_phone_verifications (id)
    WHERE verified_at IS NOT NULL AND consumed_at IS NULL;
```

- [ ] **Step 2: Write the down migration**

```sql
-- 000028_staff_phone_verification.down.sql
DROP TABLE IF EXISTS staff_phone_verifications;
```

- [ ] **Step 3: Verify migration applies cleanly**

Run:
```bash
cd backend && go run ./cmd/api
```
Expected: Server starts, migration applies without errors. Check logs for `000028`.

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/000028_staff_phone_verification.up.sql backend/migrations/000028_staff_phone_verification.down.sql
git commit -m "feat: add staff_phone_verifications migration (000028)"
```

---

## Task 2: GORM Model

**Files:**
- Modify: `backend/internal/infrastructure/persistence/model/models.go`

- [ ] **Step 1: Add StaffPhoneVerification struct**

Add after the `OtpCode` struct (around line 585):

```go
type StaffPhoneVerification struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey"`
	SalonID    uuid.UUID  `gorm:"type:uuid;not null;column:salon_id"`
	PhoneE164  string     `gorm:"column:phone_e164;not null"`
	Code       string     `gorm:"column:code;not null"`
	Attempts   int16      `gorm:"column:attempts;not null;default:0"`
	ExpiresAt  time.Time  `gorm:"column:expires_at;not null"`
	VerifiedAt *time.Time `gorm:"column:verified_at"`
	ConsumedAt *time.Time `gorm:"column:consumed_at"`
	CreatedBy  uuid.UUID  `gorm:"type:uuid;not null;column:created_by"`
	CreatedAt  time.Time  `gorm:"column:created_at;not null;autoCreateTime"`
}

func (v *StaffPhoneVerification) BeforeCreate(tx *gorm.DB) error {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	return nil
}

func (StaffPhoneVerification) TableName() string {
	return "staff_phone_verifications"
}
```

- [ ] **Step 2: Verify compilation**

Run:
```bash
cd backend && go build ./...
```
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/infrastructure/persistence/model/models.go
git commit -m "feat: add StaffPhoneVerification GORM model"
```

---

## Task 3: Repository Interface + Implementation

**Files:**
- Create: `backend/internal/repository/staff_phone_verification.go`
- Create: `backend/internal/infrastructure/persistence/staff_phone_verification_repository.go`

- [ ] **Step 1: Write the repository interface**

```go
// backend/internal/repository/staff_phone_verification.go
package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
)

type StaffPhoneVerificationRepository interface {
	Create(ctx context.Context, v *model.StaffPhoneVerification) error
	FindActive(ctx context.Context, phoneE164 string, salonID uuid.UUID) (*model.StaffPhoneVerification, error)
	IncrementAttempts(ctx context.Context, id uuid.UUID) error
	MarkVerified(ctx context.Context, id uuid.UUID) error
	FindValidProof(ctx context.Context, proofID uuid.UUID, phoneE164 string, salonID uuid.UUID) (*model.StaffPhoneVerification, error)
	Consume(ctx context.Context, id uuid.UUID) error
}
```

- [ ] **Step 2: Write the persistence implementation**

```go
// backend/internal/infrastructure/persistence/staff_phone_verification_repository.go
package persistence

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

type staffPhoneVerificationRepository struct {
	db *gorm.DB
}

func NewStaffPhoneVerificationRepository(db *gorm.DB) repository.StaffPhoneVerificationRepository {
	return &staffPhoneVerificationRepository{db: db}
}

func (r *staffPhoneVerificationRepository) Create(ctx context.Context, v *model.StaffPhoneVerification) error {
	return r.db.WithContext(ctx).Create(v).Error
}

func (r *staffPhoneVerificationRepository) FindActive(ctx context.Context, phoneE164 string, salonID uuid.UUID) (*model.StaffPhoneVerification, error) {
	var v model.StaffPhoneVerification
	err := r.db.WithContext(ctx).
		Where("phone_e164 = ? AND salon_id = ? AND verified_at IS NULL AND consumed_at IS NULL AND expires_at > ? AND attempts < 5",
			phoneE164, salonID, time.Now()).
		Order("created_at DESC").
		First(&v).Error
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *staffPhoneVerificationRepository) IncrementAttempts(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&model.StaffPhoneVerification{}).
		Where("id = ?", id).
		UpdateColumn("attempts", gorm.Expr("attempts + 1")).Error
}

func (r *staffPhoneVerificationRepository) MarkVerified(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&model.StaffPhoneVerification{}).
		Where("id = ?", id).
		UpdateColumn("verified_at", time.Now()).Error
}

func (r *staffPhoneVerificationRepository) FindValidProof(ctx context.Context, proofID uuid.UUID, phoneE164 string, salonID uuid.UUID) (*model.StaffPhoneVerification, error) {
	var v model.StaffPhoneVerification
	err := r.db.WithContext(ctx).
		Where("id = ? AND phone_e164 = ? AND salon_id = ? AND verified_at IS NOT NULL AND consumed_at IS NULL AND expires_at > ?",
			proofID, phoneE164, salonID, time.Now()).
		First(&v).Error
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *staffPhoneVerificationRepository) Consume(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&model.StaffPhoneVerification{}).
		Where("id = ?", id).
		UpdateColumn("consumed_at", time.Now()).Error
}
```

- [ ] **Step 3: Verify compilation**

Run:
```bash
cd backend && go build ./...
```
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/repository/staff_phone_verification.go backend/internal/infrastructure/persistence/staff_phone_verification_repository.go
git commit -m "feat: add StaffPhoneVerificationRepository interface and GORM impl"
```

---

## Task 4: StaffPhoneOTPService

**Files:**
- Create: `backend/internal/service/staff_phone_otp.go`

This service reuses the existing `OTPSender` (sms + telegram) from `otp_sender.go`. It does NOT issue JWT tokens — only creates/verifies codes and returns proof UUIDs.

- [ ] **Step 1: Write the service**

```go
// backend/internal/service/staff_phone_otp.go
package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/config"
	"github.com/yourusername/beauty-marketplace/internal/errs"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

const staffPhoneOTPTTL = 10 * time.Minute

type StaffPhoneOTPService struct {
	repo       repository.StaffPhoneVerificationRepository
	smsSender  OTPSender
	tgSender   OTPSender
	logger     *zap.Logger
	devBypass  bool
	devMagic   string
}

type StaffPhoneOTPRequestParams struct {
	Phone   string `json:"phone"`
	Channel string `json:"channel"`
}

type StaffPhoneOTPVerifyParams struct {
	Phone string `json:"phone"`
	Code  string `json:"code"`
}

func NewStaffPhoneOTPService(
	repo repository.StaffPhoneVerificationRepository,
	telegramRepo repository.TelegramLinkRepository,
	logger *zap.Logger,
	cfg *config.Config,
) *StaffPhoneOTPService {
	return &StaffPhoneOTPService{
		repo:      repo,
		smsSender: NewStderrOTPSender(logger),
		tgSender:  NewTelegramOTPSender(cfg.TelegramBotToken, telegramRepo, logger),
		logger:    logger,
		devBypass: cfg.DevOTPBypass,
		devMagic:  "1234",
	}
}

func (s *StaffPhoneOTPService) Request(ctx context.Context, salonID, actorUserID uuid.UUID, params StaffPhoneOTPRequestParams) (*OTPRequestResult, error) {
	code, err := generateOTP(otpLength)
	if err != nil {
		return nil, fmt.Errorf("generate otp: %w", err)
	}

	expiresAt := time.Now().Add(staffPhoneOTPTTL)
	v := &model.StaffPhoneVerification{
		SalonID:   salonID,
		PhoneE164: params.Phone,
		Code:      code,
		ExpiresAt: expiresAt,
		CreatedBy: actorUserID,
	}
	if err := s.repo.Create(ctx, v); err != nil {
		return nil, fmt.Errorf("save staff phone verification: %w", err)
	}

	sender := s.smsSender
	if params.Channel == "telegram" {
		sender = s.tgSender
	}
	if err := sender.Send(ctx, params.Phone, code); err != nil {
		return nil, fmt.Errorf("send otp via %s: %w", sender.Channel(), err)
	}
	s.logger.Info("staff phone otp sent",
		zap.String("phone", params.Phone),
		zap.String("channel", sender.Channel()),
		zap.String("salon_id", salonID.String()),
	)

	return &OTPRequestResult{ExpiresAt: expiresAt}, nil
}

func (s *StaffPhoneOTPService) Verify(ctx context.Context, salonID uuid.UUID, params StaffPhoneOTPVerifyParams) (uuid.UUID, error) {
	v, err := s.repo.FindActive(ctx, params.Phone, salonID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return uuid.Nil, errs.ErrOTPNotFound
		}
		return uuid.Nil, fmt.Errorf("find staff phone verification: %w", err)
	}

	codeOK := v.Code == params.Code
	if !codeOK && s.devBypass && params.Code == s.devMagic {
		codeOK = true
		s.logger.Info("staff phone OTP: dev bypass", zap.String("phone", params.Phone))
	}
	if !codeOK {
		_ = s.repo.IncrementAttempts(ctx, v.ID)
		return uuid.Nil, errs.ErrOTPInvalid
	}

	if err := s.repo.MarkVerified(ctx, v.ID); err != nil {
		return uuid.Nil, fmt.Errorf("mark verified: %w", err)
	}

	return v.ID, nil
}

func (s *StaffPhoneOTPService) ValidateAndConsumeProof(ctx context.Context, proofID uuid.UUID, phoneE164 string, salonID uuid.UUID) error {
	if s.devBypass {
		return nil
	}
	v, err := s.repo.FindValidProof(ctx, proofID, phoneE164, salonID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("invalid or expired phone verification proof")
		}
		return fmt.Errorf("find proof: %w", err)
	}
	return s.repo.Consume(ctx, v.ID)
}
```

Note on `ValidateAndConsumeProof`: when `devBypass` is true, the proof check is skipped entirely so dev/testing workflows with `DEV_OTP_BYPASS=true` continue to work without friction.

- [ ] **Step 2: Verify compilation**

Run:
```bash
cd backend && go build ./...
```
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/service/staff_phone_otp.go
git commit -m "feat: add StaffPhoneOTPService for staff phone verification"
```

---

## Task 5: Fx Wiring

**Files:**
- Modify: `backend/internal/app/app.go`

- [ ] **Step 1: Register the new repository and service**

In `app.go`, inside the `fx.Provide(...)` block, add after the existing `persistence.NewSalonMemberInviteRepository` annotated block (~line 61):

```go
fx.Annotate(
	persistence.NewStaffPhoneVerificationRepository,
	fx.As(new(repository.StaffPhoneVerificationRepository)),
),
```

And add the service after `service.NewAuthService` (~line 83):

```go
service.NewStaffPhoneOTPService,
```

- [ ] **Step 2: Verify compilation and startup**

Run:
```bash
cd backend && go build ./... && go run ./cmd/api
```
Expected: Build succeeds, server starts. Fx resolves all dependencies without cycle errors.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/app/app.go
git commit -m "feat: wire StaffPhoneVerificationRepository and StaffPhoneOTPService in Fx"
```

---

## Task 6: Dashboard Controller — OTP Endpoints

**Files:**
- Modify: `backend/internal/controller/dashboard_controller.go`
- Modify: `backend/internal/controller/dashboard_staff_handlers.go`

- [ ] **Step 1: Inject StaffPhoneOTPService into DashboardController**

In `dashboard_controller.go`, add the service field and update the constructor:

```go
// DashboardController struct — add field:
type DashboardController struct {
	svc      service.DashboardService
	booking  service.BookingService
	clients  *SalonClientController
	phoneOTP *service.StaffPhoneOTPService
	log      *zap.Logger
}

// Constructor — add parameter:
func NewDashboardController(
	svc service.DashboardService,
	booking service.BookingService,
	clients *SalonClientController,
	phoneOTP *service.StaffPhoneOTPService,
	log *zap.Logger,
) *DashboardController {
	return &DashboardController{svc: svc, booking: booking, clients: clients, phoneOTP: phoneOTP, log: log}
}
```

- [ ] **Step 2: Add route for phone-otp in DashboardRoutes**

In `dashboard_controller.go`, inside the `switch parts[0]` block (around line 115 where `"salon-masters"` is handled), add a new case before the `default`:

```go
case "phone-otp":
	if role == "receptionist" {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}
	h.handleStaffPhoneOTP(w, r, salonID, parts)
```

- [ ] **Step 3: Add handler methods in dashboard_staff_handlers.go**

Append to `dashboard_staff_handlers.go`:

```go
func (h *DashboardController) handleStaffPhoneOTP(w http.ResponseWriter, r *http.Request, salonID uuid.UUID, parts []string) {
	if len(parts) != 2 {
		http.NotFound(w, r)
		return
	}
	switch parts[1] {
	case "request":
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		h.requestStaffPhoneOTP(w, r, salonID)
	case "verify":
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		h.verifyStaffPhoneOTP(w, r, salonID)
	default:
		http.NotFound(w, r)
	}
}

func (h *DashboardController) requestStaffPhoneOTP(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	uid, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var body service.StaffPhoneOTPRequestParams
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if body.Phone == "" {
		jsonError(w, "phone is required", http.StatusBadRequest)
		return
	}
	result, err := h.phoneOTP.Request(r.Context(), salonID, uid, body)
	if err != nil {
		h.log.Error("staff phone otp request", zap.Error(err))
		jsonError(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

func (h *DashboardController) verifyStaffPhoneOTP(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	var body service.StaffPhoneOTPVerifyParams
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if body.Phone == "" || body.Code == "" {
		jsonError(w, "phone and code are required", http.StatusBadRequest)
		return
	}
	proofID, err := h.phoneOTP.Verify(r.Context(), salonID, body)
	if err != nil {
		status := http.StatusUnprocessableEntity
		if err.Error() == "otp_not_found" || err.Error() == "otp_invalid" {
			status = http.StatusUnprocessableEntity
		}
		jsonError(w, err.Error(), status)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{
		"phoneVerificationProof": proofID.String(),
	})
}
```

Note: the `auth` and `json` imports are needed. Check existing imports in `dashboard_staff_handlers.go` — `auth` is imported via `"github.com/yourusername/beauty-marketplace/internal/auth"` and `json` via `"encoding/json"`. Both should already be available in the file.

- [ ] **Step 4: Verify compilation**

Run:
```bash
cd backend && go build ./...
```
Expected: Build succeeds.

- [ ] **Step 5: Test endpoints manually**

Start the server and test with curl:

```bash
# Request OTP for a staff phone
curl -X POST http://localhost:8080/api/v1/dashboard/phone-otp/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "X-Salon-Id: <salon-uuid>" \
  -d '{"phone": "+79161234567", "channel": "sms"}'

# Verify OTP (use code from server logs in dev mode)
curl -X POST http://localhost:8080/api/v1/dashboard/phone-otp/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "X-Salon-Id: <salon-uuid>" \
  -d '{"phone": "+79161234567", "code": "1234"}'
```

Expected: request returns `{"expiresAt": "..."}`, verify returns `{"phoneVerificationProof": "<uuid>"}`.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/controller/dashboard_controller.go backend/internal/controller/dashboard_staff_handlers.go
git commit -m "feat: add POST phone-otp/request and phone-otp/verify dashboard endpoints"
```

---

## Task 7: Gate CreateStaff / UpdateStaff with Proof

**Files:**
- Modify: `backend/internal/service/dashboard_types.go` (line ~106)
- Modify: `backend/internal/service/dashboard_staff.go` (lines 20, 117)
- Modify: `backend/internal/service/dashboard.go` (lines 70-85)

- [ ] **Step 1: Add PhoneVerificationProof to StaffInput**

In `dashboard_types.go`, add after the `ServiceAssignments` field (line ~123):

```go
PhoneVerificationProof *string `json:"phoneVerificationProof,omitempty"`
```

The full `StaffInput` struct will now include this as the last field.

- [ ] **Step 2: Inject StaffPhoneOTPService into dashboardService**

In `dashboard.go`, modify the struct and constructor:

```go
type dashboardService struct {
	dash     repository.DashboardRepository
	clients  repository.SalonClientRepository
	invites  repository.SalonMemberInviteRepository
	notifier AppointmentNotifier
	phoneOTP *StaffPhoneOTPService
}

func NewDashboardService(
	dash repository.DashboardRepository,
	clients repository.SalonClientRepository,
	invites repository.SalonMemberInviteRepository,
	notifier AppointmentNotifier,
	phoneOTP *StaffPhoneOTPService,
) DashboardService {
	return &dashboardService{dash: dash, clients: clients, invites: invites, notifier: notifier, phoneOTP: phoneOTP}
}
```

- [ ] **Step 3: Add proof validation in CreateStaff**

In `dashboard_staff.go`, after the existing phone normalization on line 39 (`PhoneE164: normalizePhoneE164Ptr(in.Phone)`), add proof validation **before** creating the MasterProfile. Insert after line 33 (`bioPtr = &b`) / before line 34 (`mp := &model.MasterProfile{`):

```go
	normalizedPhone := normalizePhoneE164Ptr(in.Phone)
	if normalizedPhone != nil {
		if in.PhoneVerificationProof == nil || *in.PhoneVerificationProof == "" {
			return nil, fmt.Errorf("phone verification proof is required when setting phone")
		}
		proofID, err := uuid.Parse(*in.PhoneVerificationProof)
		if err != nil {
			return nil, fmt.Errorf("invalid phone verification proof")
		}
		if err := s.phoneOTP.ValidateAndConsumeProof(ctx, proofID, *normalizedPhone, salonID); err != nil {
			return nil, fmt.Errorf("phone verification failed: %w", err)
		}
	}
```

And then use `normalizedPhone` in the MasterProfile creation instead of calling `normalizePhoneE164Ptr` again:

```go
	mp := &model.MasterProfile{
		DisplayName:     n,
		Bio:             bioPtr,
		Specializations: specs,
		YearsExperience: in.YearsExperience,
		PhoneE164:       normalizedPhone,
	}
```

- [ ] **Step 4: Add proof validation in UpdateStaff**

In `dashboard_staff.go`, inside `UpdateStaff`, the phone update for the shadow `master_profiles` happens around lines 183-189. Wrap the phone change with proof validation. Replace the block at lines 183-189:

```go
			if in.Phone != nil {
				newPhone := normalizePhoneE164Ptr(in.Phone)
				phoneChanged := false
				if newPhone == nil && mp.PhoneE164 != nil {
					phoneChanged = true
				} else if newPhone != nil && (mp.PhoneE164 == nil || *newPhone != *mp.PhoneE164) {
					phoneChanged = true
				}
				if phoneChanged && newPhone != nil {
					if in.PhoneVerificationProof == nil || *in.PhoneVerificationProof == "" {
						return nil, fmt.Errorf("phone verification proof is required when changing phone")
					}
					proofID, err := uuid.Parse(*in.PhoneVerificationProof)
					if err != nil {
						return nil, fmt.Errorf("invalid phone verification proof")
					}
					if err := s.phoneOTP.ValidateAndConsumeProof(ctx, proofID, *newPhone, salonID); err != nil {
						return nil, fmt.Errorf("phone verification failed: %w", err)
					}
				}
				if newPhone == nil {
					mp.PhoneE164 = nil
				} else {
					mp.PhoneE164 = newPhone
				}
			}
```

Also update `st.Phone = in.Phone` (line 132) to remain as-is — `salon_masters.phone` is the display field; the proof gates the `master_profiles.phone_e164` which drives the claim mechanism.

- [ ] **Step 5: Verify compilation**

Run:
```bash
cd backend && go build ./...
```
Expected: Build succeeds.

- [ ] **Step 6: Run tests**

Run:
```bash
cd backend && go test ./...
```
Expected: All tests pass. If existing tests call `CreateStaff` with a phone but no proof, they will fail — update those test fixtures to either skip the phone or add `DEV_OTP_BYPASS` behavior.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/service/dashboard_types.go backend/internal/service/dashboard_staff.go backend/internal/service/dashboard.go
git commit -m "feat: gate CreateStaff/UpdateStaff phone writes behind OTP proof"
```

---

## Task 8: Frontend — RTK Query Endpoints

**Files:**
- Modify: `frontend/src/entities/staff/model/staffApi.ts`
- Modify: `frontend/src/shared/api/dashboardApi.ts`

- [ ] **Step 1: Add phoneVerificationProof to StaffFormPayload**

In `dashboardApi.ts`, add the field to the `StaffFormPayload` type (around line 240, after `serviceAssignments`):

```typescript
  phoneVerificationProof?: string | null
```

- [ ] **Step 2: Add OTP mutations to staffApi.ts**

In `staffApi.ts`, inside the `injectEndpoints` call, add two new mutation endpoints:

```typescript
    requestStaffPhoneOtp: build.mutation<
      { expiresAt: string },
      { phone: string; channel: 'sms' | 'telegram' }
    >({
      query: (body) => ({
        url: '/api/v1/dashboard/phone-otp/request',
        method: 'POST',
        body,
      }),
    }),

    verifyStaffPhoneOtp: build.mutation<
      { phoneVerificationProof: string },
      { phone: string; code: string }
    >({
      query: (body) => ({
        url: '/api/v1/dashboard/phone-otp/verify',
        method: 'POST',
        body,
      }),
    }),
```

And export the hooks at the bottom of the file:

```typescript
export const {
  // ... existing exports ...
  useRequestStaffPhoneOtpMutation,
  useVerifyStaffPhoneOtpMutation,
} = staffApi;
```

- [ ] **Step 3: Verify build**

Run:
```bash
cd frontend && npm run build
```
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/entities/staff/model/staffApi.ts frontend/src/shared/api/dashboardApi.ts
git commit -m "feat: add staff phone OTP RTK Query mutations"
```

---

## Task 9: Frontend — StaffFormModal OTP UI

**Files:**
- Modify: `frontend/src/pages/dashboard/ui/modals/StaffFormModal.tsx`

This is the largest frontend change. The phone field gains an inline OTP verification step: when the user enters/changes a phone number, a "Verify" button appears. Clicking it sends OTP, then shows a code input. After verification, the proof UUID is stored in local state and sent with the form payload.

- [ ] **Step 1: Add state and imports**

At the top of `StaffFormModal.tsx`, add imports for the new hooks:

```typescript
import {
  useRequestStaffPhoneOtpMutation,
  useVerifyStaffPhoneOtpMutation,
} from '@/entities/staff/model/staffApi';
```

Inside the component, add state for the OTP flow:

```typescript
const [phoneVerified, setPhoneVerified] = useState(false);
const [phoneProof, setPhoneProof] = useState<string | null>(null);
const [otpStep, setOtpStep] = useState<'idle' | 'sent' | 'verified'>('idle');
const [otpCode, setOtpCode] = useState('');
const [otpChannel, setOtpChannel] = useState<'sms' | 'telegram'>('sms');
const [otpError, setOtpError] = useState<string | null>(null);
const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

const [requestOtp, { isLoading: isRequestingOtp }] = useRequestStaffPhoneOtpMutation();
const [verifyOtp, { isLoading: isVerifyingOtp }] = useVerifyStaffPhoneOtpMutation();
```

- [ ] **Step 2: Add phone normalization and change detection**

```typescript
const watchedPhone = useWatch({ control, name: 'phone' });

const normalizePhone = (raw: string | undefined | null): string | null => {
  if (!raw) return null;
  let p = raw.replace(/[\s\-()]/g, '');
  if (p.startsWith('8') && p.length === 11) p = '+7' + p.slice(1);
  if (/^\+7\d{10}$/.test(p)) return p;
  return null;
};

const currentNormalized = normalizePhone(watchedPhone);
const isPhoneValid = currentNormalized !== null;

// Reset OTP state when phone changes
useEffect(() => {
  if (currentNormalized !== verifiedPhone) {
    setPhoneVerified(false);
    setPhoneProof(null);
    setOtpStep('idle');
    setOtpCode('');
    setOtpError(null);
  }
}, [currentNormalized, verifiedPhone]);
```

- [ ] **Step 3: Add OTP handler functions**

```typescript
const handleRequestOtp = async () => {
  if (!currentNormalized) return;
  setOtpError(null);
  try {
    await requestOtp({ phone: currentNormalized, channel: otpChannel }).unwrap();
    setOtpStep('sent');
  } catch (e: any) {
    setOtpError(e?.data?.error || 'Ошибка отправки кода');
  }
};

const handleVerifyOtp = async () => {
  if (!currentNormalized || !otpCode) return;
  setOtpError(null);
  try {
    const result = await verifyOtp({ phone: currentNormalized, code: otpCode }).unwrap();
    setPhoneProof(result.phoneVerificationProof);
    setPhoneVerified(true);
    setVerifiedPhone(currentNormalized);
    setOtpStep('verified');
  } catch (e: any) {
    setOtpError(e?.data?.error || 'Неверный код');
  }
};
```

- [ ] **Step 4: Replace the phone TextField with the verification UI**

Find the existing phone `<TextField>` in the Contacts section (around lines 596-612). Replace it with:

```tsx
<TextField
  label="Телефон"
  placeholder="+7 916 234-56-78"
  size="small"
  fullWidth
  {...register('phone')}
  disabled={otpStep === 'sent'}
/>

{isPhoneValid && otpStep === 'idle' && !phoneVerified && (
  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
    <ToggleButtonGroup
      value={otpChannel}
      exclusive
      onChange={(_, v) => v && setOtpChannel(v)}
      size="small"
    >
      <ToggleButton value="sms">SMS</ToggleButton>
      <ToggleButton value="telegram">Telegram</ToggleButton>
    </ToggleButtonGroup>
    <Button
      size="small"
      variant="outlined"
      onClick={handleRequestOtp}
      disabled={isRequestingOtp}
    >
      {isRequestingOtp ? 'Отправка...' : 'Подтвердить номер'}
    </Button>
  </Box>
)}

{otpStep === 'sent' && (
  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
    <TextField
      label="Код"
      size="small"
      value={otpCode}
      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
      inputProps={{ maxLength: 4, style: { letterSpacing: 8, textAlign: 'center', fontWeight: 700 } }}
      sx={{ width: 120 }}
      autoFocus
    />
    <Button
      size="small"
      variant="contained"
      onClick={handleVerifyOtp}
      disabled={otpCode.length < 4 || isVerifyingOtp}
    >
      {isVerifyingOtp ? '...' : 'Проверить'}
    </Button>
    <Button size="small" onClick={() => { setOtpStep('idle'); setOtpCode(''); }}>
      Назад
    </Button>
  </Box>
)}

{otpStep === 'verified' && (
  <Alert severity="success" sx={{ mt: 1 }}>
    Номер подтверждён
  </Alert>
)}

{otpError && (
  <Alert severity="error" sx={{ mt: 1 }}>
    {otpError}
  </Alert>
)}
```

Add imports at the top if not already present: `ToggleButtonGroup`, `ToggleButton`, `Alert` from `@mui/material`, and `useEffect` from `react`.

- [ ] **Step 5: Pass proof in form submission**

In the `onSubmit` function (around lines 242-278), add `phoneVerificationProof` to the payload object:

```typescript
const payload: StaffFormPayload = {
  // ... existing fields ...
  phoneVerificationProof: phoneProof,
};
```

- [ ] **Step 6: Block submission when phone is set but unverified**

In the submit button or form validation, add a check. The simplest approach — disable the submit button:

Find the submit `<Button>` (around line 800+) and add to its `disabled` condition:

```typescript
disabled={isSubmitting || (isPhoneValid && !phoneVerified)}
```

- [ ] **Step 7: Handle edit mode — skip verification if phone unchanged**

When editing an existing staff member, if the phone hasn't changed, the proof isn't needed. In the `useEffect` that loads edit data (look for where `prefill` or `reset` is called with existing staff data), after setting form values, also set the verified state:

```typescript
// After reset(existingData) for edit mode:
if (existingStaff?.phone) {
  const existingNormalized = normalizePhone(existingStaff.phone);
  if (existingNormalized) {
    setVerifiedPhone(existingNormalized);
    setPhoneVerified(true);
    setOtpStep('verified');
  }
}
```

This way, editing a staff member with an existing phone shows "verified" by default, and only requires re-verification if the phone changes.

- [ ] **Step 8: Verify in browser**

Run:
```bash
cd frontend && npm run dev
```

Test in browser:
1. Open dashboard → Staff → Create new staff member
2. Enter a phone number → "Подтвердить номер" button appears
3. Click it → Code field appears
4. Enter "1234" (dev bypass) → "Номер подтверждён" alert
5. Submit the form → Staff created successfully
6. Edit the same staff → Phone shows as verified
7. Change the phone → Verification resets, requires new OTP
8. Clear the phone → No verification needed, save succeeds

- [ ] **Step 9: Run lint and build**

```bash
cd frontend && npm run lint && npm run build
```
Expected: No errors.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/pages/dashboard/ui/modals/StaffFormModal.tsx
git commit -m "feat: add inline OTP phone verification to StaffFormModal"
```

---

## Task 10: Vault Documentation Update

**Files:**
- Modify: `docs/vault/entities/master-profiles-salon-masters.md`
- Modify: `docs/vault/product/status.md`

- [ ] **Step 1: Update master-profiles-salon-masters.md**

Add a note in the relevant section about the new phone verification flow:

```markdown
### Phone Verification (OTP) при создании/редактировании мастера

При указании или изменении телефона в форме создания/редактирования мастера в дашборде требуется OTP-подтверждение номера. Владелец/администратор вводит код, отправленный на указанный телефон (SMS или Telegram).

Это предотвращает:
- Ошибочную привязку чужого номера к теневому `master_profiles`
- Нежелательный auto-claim при входе владельца другого номера
- Злоупотребление со стороны персонала салона

**Эндпоинты:**
- `POST /api/v1/dashboard/phone-otp/request` — отправка кода
- `POST /api/v1/dashboard/phone-otp/verify` — верификация, возврат `phoneVerificationProof`
- `phoneVerificationProof` передаётся в теле `POST/PUT salon-masters`

**Таблица:** `staff_phone_verifications` (миграция 000028)
```

- [ ] **Step 2: Update product/status.md**

Add to the "Последние изменения" section at the top:

```markdown
### Последние изменения (2026-05-01)

- **Staff phone OTP verification:** при указании или смене телефона мастера в дашборде теперь требуется OTP-подтверждение (SMS/Telegram). Новая таблица `staff_phone_verifications` (миграция 000028), сервис `StaffPhoneOTPService`, эндпоинты `POST /api/v1/dashboard/phone-otp/request|verify`. Фронт: inline OTP-шаг в `StaffFormModal`, RTK Query мутации в `staffApi.ts`. `StaffInput.PhoneVerificationProof` гейтит запись телефона в `master_profiles.phone_e164` при create/update. Dev bypass (`DEV_OTP_BYPASS`) сохраняет совместимость с тестовыми окружениями.
```

- [ ] **Step 3: Commit**

```bash
git add docs/vault/entities/master-profiles-salon-masters.md docs/vault/product/status.md
git commit -m "docs: update vault with staff phone OTP verification"
```

---

## Verification Checklist

After all tasks are complete, run the full verification:

```bash
# Backend
cd backend && go test ./... && go build ./...

# Frontend
cd frontend && npm run lint && npm run build
```

Manual testing:
1. Create staff with phone → must verify OTP first
2. Create staff without phone → no OTP needed
3. Edit staff, change phone → must verify new phone
4. Edit staff, keep same phone → no re-verification
5. Edit staff, clear phone → no OTP needed
6. Invalid/expired proof → error from backend
7. Dev bypass mode → works without real OTP

---

## Out of Scope (Future Iterations)

- **P0 — Unique phone_e164 for shadow profiles:** Add `UNIQUE (phone_e164) WHERE user_id IS NULL AND phone_e164 IS NOT NULL` on `master_profiles` to prevent duplicate shadows. Separate migration + product rules for reuse vs reject.
- **P0 — Pending status when phone specified:** Change `CreateStaff` to set `status=pending` instead of `active` when phone is set, requiring explicit accept by the master.
- **SMS provider for production:** Currently OTP goes to stderr (dev) or Telegram. Real SMS (SMSC, МТС Exolve) needed before launch.
- **Rate limiting on phone-otp/request:** Reuse or extend the `maxOTPPerMin` anti-spam for the new endpoint.
