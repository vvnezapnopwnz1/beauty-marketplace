# Salon Claim Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a salon owner to find their 2GIS-listed business on the platform, submit a claim, pass manual admin moderation via `/admin/claims`, and receive a fully provisioned dashboard with an onboarding wizard.

**Architecture:** Backend follows Clean Architecture — GORM model in `internal/infrastructure/persistence/model/`, repository interface in `internal/repository/`, service in `internal/service/`, controller in `internal/controller/`, wired via Uber Fx in `internal/app/app.go`. Frontend follows FSD — new feature module `features/claim-salon/`, pages under `pages/`, API client in `shared/api/claimApi.ts`.

**Tech Stack:** Go 1.24 · GORM · net/http (Go 1.22 patterns) · Uber Fx · React 18 · TypeScript · MUI · Redux Toolkit · react-router-dom v6 · FSD

---

## File Map

### New backend files
| File | Responsibility |
|------|---------------|
| `backend/migrations/000020_salon_claims.up.sql` | Создаёт `salon_claims`, enum'ы, индексы, добавляет `salons.onboarding_completed` |
| `backend/migrations/000020_salon_claims.down.sql` | Откат миграции |
| `backend/internal/infrastructure/persistence/model/salon_claim.go` | GORM struct `SalonClaim` |
| `backend/internal/repository/salon_claim.go` | Интерфейс `SalonClaimRepository` + DTO `SalonClaimRow` |
| `backend/internal/infrastructure/persistence/salon_claim_repository.go` | GORM реализация |
| `backend/internal/service/salon_claim_service.go` | Бизнес-логика: Submit, GetStatus, ListForAdmin, Approve, Reject |
| `backend/internal/controller/salon_claim_controller.go` | HTTP хэндлеры claim + admin |

### Modified backend files
| File | Change |
|------|--------|
| `backend/internal/infrastructure/persistence/model/models.go` | Добавить `OnboardingCompleted bool` в `Salon` |
| `backend/internal/app/app.go` | Зарегистрировать новый repo, service, controller в Fx |
| `backend/internal/controller/server.go` | Добавить 5 новых маршрутов |

### New frontend files
| File | Responsibility |
|------|---------------|
| `frontend/src/shared/api/claimApi.ts` | API клиент: POST claim, GET my-status, admin CRUD |
| `frontend/src/shared/config/routes.ts` | Добавить CLAIM, JOIN, ADMIN_CLAIMS, ONBOARDING |
| `frontend/src/features/claim-salon/ui/ClaimChip.tsx` | Маленький chip «Это ваш бизнес?» для SalonPage |
| `frontend/src/features/claim-salon/ui/ClaimSalonPage.tsx` | Форма заявки `/claim-salon` |
| `frontend/src/features/claim-salon/ui/ClaimSuccessScreen.tsx` | Экран успеха после submit |
| `frontend/src/features/claim-salon/ui/ClaimStatusPage.tsx` | Статус заявки `/claim-salon/status` |
| `frontend/src/pages/admin/ui/AdminClaimsPage.tsx` | `/admin/claims` — список + approve/reject |
| `frontend/src/pages/dashboard/ui/OnboardingWizard.tsx` | `/dashboard/onboarding` — 3-шаговый визард |
| `frontend/src/pages/join/ui/JoinPage.tsx` | `/join` — лендинг для поиска своего салона |

### Modified frontend files
| File | Change |
|------|--------|
| `frontend/src/pages/salon/ui/SalonPage.tsx` | + `<ClaimChip>` если `view.mode === 'place'` |
| `frontend/src/app/App.tsx` | + 5 новых роутов |
| `frontend/src/pages/dashboard/ui/DashboardPage.tsx` | + redirect → `/dashboard/onboarding` если `onboarding_completed === false` |
| `frontend/src/shared/ui/NavBar.tsx` | + ссылка `/admin/claims` для `global_role === 'admin'` |

---

## Task 1: Database Migration

**Files:**
- Create: `backend/migrations/000020_salon_claims.up.sql`
- Create: `backend/migrations/000020_salon_claims.down.sql`

- [ ] **Step 1: Write up-migration**

```sql
-- backend/migrations/000020_salon_claims.up.sql
-- +migrate Up

CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected', 'duplicate');
CREATE TYPE claim_relation AS ENUM ('owner', 'manager', 'representative');

CREATE TABLE salon_claims (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relation_type    claim_relation NOT NULL DEFAULT 'owner',
    comment          TEXT,
    source           VARCHAR(50)  NOT NULL,
    external_id      VARCHAR(255) NOT NULL,
    snapshot_name    TEXT         NOT NULL,
    snapshot_address TEXT,
    snapshot_phone   VARCHAR(50),
    snapshot_photo   TEXT,
    status           claim_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by      UUID         REFERENCES users(id),
    reviewed_at      TIMESTAMPTZ,
    salon_id         UUID         REFERENCES salons(id),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_salon_claims_active
    ON salon_claims(user_id, source, external_id)
    WHERE status IN ('pending', 'approved');

CREATE INDEX idx_salon_claims_status
    ON salon_claims(status, created_at DESC);

ALTER TABLE salons
    ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 2: Write down-migration**

```sql
-- backend/migrations/000020_salon_claims.down.sql
-- +migrate Down

ALTER TABLE salons DROP COLUMN IF EXISTS onboarding_completed;

DROP INDEX IF EXISTS idx_salon_claims_status;
DROP INDEX IF EXISTS ux_salon_claims_active;
DROP TABLE IF EXISTS salon_claims;
DROP TYPE IF EXISTS claim_relation;
DROP TYPE IF EXISTS claim_status;
```

- [ ] **Step 3: Run migration**

```bash
make db-migrate
```

Expected: `migrating: 000020_salon_claims` — no errors.

- [ ] **Step 4: Verify schema**

```bash
psql $DATABASE_URL -c "\d salon_claims" | grep -E "id|user_id|status|external_id|onboarding"
psql $DATABASE_URL -c "\d salons" | grep onboarding_completed
```

Expected: all listed columns present.

- [ ] **Step 5: Commit**

```bash
git add backend/migrations/000020_salon_claims.up.sql backend/migrations/000020_salon_claims.down.sql
git commit -m "feat: add salon_claims table and salons.onboarding_completed (migration 000020)"
```

---

## Task 2: GORM Model

**Files:**
- Create: `backend/internal/infrastructure/persistence/model/salon_claim.go`
- Modify: `backend/internal/infrastructure/persistence/model/models.go`

- [ ] **Step 1: Create SalonClaim GORM struct**

```go
// backend/internal/infrastructure/persistence/model/salon_claim.go
package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SalonClaim struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey"`
	UserID          uuid.UUID  `gorm:"type:uuid;not null;column:user_id"`
	RelationType    string     `gorm:"type:claim_relation;not null;default:owner;column:relation_type"`
	Comment         *string    `gorm:"column:comment"`
	Source          string     `gorm:"type:varchar(50);not null;column:source"`
	ExternalID      string     `gorm:"type:varchar(255);not null;column:external_id"`
	SnapshotName    string     `gorm:"type:text;not null;column:snapshot_name"`
	SnapshotAddress *string    `gorm:"column:snapshot_address"`
	SnapshotPhone   *string    `gorm:"column:snapshot_phone"`
	SnapshotPhoto   *string    `gorm:"column:snapshot_photo"`
	Status          string     `gorm:"type:claim_status;not null;default:pending;column:status"`
	RejectionReason *string    `gorm:"column:rejection_reason"`
	ReviewedBy      *uuid.UUID `gorm:"type:uuid;column:reviewed_by"`
	ReviewedAt      *time.Time `gorm:"column:reviewed_at"`
	SalonID         *uuid.UUID `gorm:"type:uuid;column:salon_id"`
	CreatedAt       time.Time  `gorm:"column:created_at;not null;autoCreateTime"`
	UpdatedAt       time.Time  `gorm:"column:updated_at;not null;autoUpdateTime"`
}

func (s *SalonClaim) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

func (SalonClaim) TableName() string { return "salon_claims" }
```

- [ ] **Step 2: Add OnboardingCompleted to Salon struct in models.go**

In `backend/internal/infrastructure/persistence/model/models.go`, find the `Salon` struct and add the field after `SlotDurationMinutes`:

```go
SlotDurationMinutes  int               `gorm:"column:slot_duration_minutes;not null;default:30"`
OnboardingCompleted  bool              `gorm:"column:onboarding_completed;not null;default:false"`
CreatedAt            time.Time         `gorm:"column:created_at;not null;autoCreateTime"`
```

- [ ] **Step 3: Build to verify no compile errors**

```bash
cd backend && go build ./...
```

Expected: exits 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/infrastructure/persistence/model/
git commit -m "feat: add SalonClaim model and Salon.OnboardingCompleted field"
```

---

## Task 3: Repository Interface + Implementation

**Files:**
- Create: `backend/internal/repository/salon_claim.go`
- Create: `backend/internal/infrastructure/persistence/salon_claim_repository.go`

- [ ] **Step 1: Write repository interface**

```go
// backend/internal/repository/salon_claim.go
package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
)

// SalonClaimRow is a claim row enriched with user info for admin display.
type SalonClaimRow struct {
	Claim           model.SalonClaim
	UserPhone       string
	UserDisplayName *string
}

// SalonClaimRepository reads/writes salon claims.
type SalonClaimRepository interface {
	// FindActiveByUserAndPlace returns a pending or approved claim for user+place, or nil.
	FindActiveByUserAndPlace(ctx context.Context, userID uuid.UUID, source, externalID string) (*model.SalonClaim, error)
	// Create inserts a new claim.
	Create(ctx context.Context, c *model.SalonClaim) error
	// GetByID returns a claim by ID (any status), or nil if not found.
	GetByID(ctx context.Context, id uuid.UUID) (*model.SalonClaim, error)
	// ListByStatus returns paginated claims joined with user data for the admin page.
	ListByStatus(ctx context.Context, status string, page, pageSize int) ([]SalonClaimRow, int64, error)
	// ApproveClaim runs the approval transaction atomically:
	// creates salons + salon_external_ids + salon_members + salon_subscriptions,
	// marks the claim approved, marks competing pending claims as duplicate.
	ApproveClaim(ctx context.Context, claimID, reviewerID uuid.UUID) (salonID uuid.UUID, err error)
	// RejectClaim marks a claim as rejected with a reason.
	RejectClaim(ctx context.Context, claimID, reviewerID uuid.UUID, reason string) error
}
```

- [ ] **Step 2: Write GORM implementation**

```go
// backend/internal/infrastructure/persistence/salon_claim_repository.go
package persistence

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"gorm.io/gorm"
)

type salonClaimRepository struct {
	db *gorm.DB
}

// NewSalonClaimRepository constructs SalonClaimRepository.
func NewSalonClaimRepository(db *gorm.DB) repository.SalonClaimRepository {
	return &salonClaimRepository{db: db}
}

func (r *salonClaimRepository) FindActiveByUserAndPlace(ctx context.Context, userID uuid.UUID, source, externalID string) (*model.SalonClaim, error) {
	var c model.SalonClaim
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND source = ? AND external_id = ? AND status IN ('pending','approved')", userID, source, externalID).
		First(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &c, err
}

func (r *salonClaimRepository) Create(ctx context.Context, c *model.SalonClaim) error {
	return r.db.WithContext(ctx).Create(c).Error
}

func (r *salonClaimRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.SalonClaim, error) {
	var c model.SalonClaim
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &c, err
}

func (r *salonClaimRepository) ListByStatus(ctx context.Context, status string, page, pageSize int) ([]repository.SalonClaimRow, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	type scanRow struct {
		model.SalonClaim
		UserPhone       string  `gorm:"column:user_phone"`
		UserDisplayName *string `gorm:"column:user_display_name"`
	}

	q := r.db.WithContext(ctx).Table("salon_claims sc").
		Select("sc.*, u.phone_e164 AS user_phone, u.display_name AS user_display_name").
		Joins("JOIN users u ON u.id = sc.user_id")
	if status != "" {
		q = q.Where("sc.status = ?", status)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []scanRow
	if err := q.Order("sc.created_at DESC").Offset(offset).Limit(pageSize).Scan(&rows).Error; err != nil {
		return nil, 0, err
	}

	result := make([]repository.SalonClaimRow, len(rows))
	for i, row := range rows {
		result[i] = repository.SalonClaimRow{
			Claim:           row.SalonClaim,
			UserPhone:       row.UserPhone,
			UserDisplayName: row.UserDisplayName,
		}
	}
	return result, total, nil
}

func (r *salonClaimRepository) ApproveClaim(ctx context.Context, claimID, reviewerID uuid.UUID) (uuid.UUID, error) {
	var salonID uuid.UUID

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var claim model.SalonClaim
		if err := tx.Where("id = ?", claimID).First(&claim).Error; err != nil {
			return err
		}
		if claim.Status != "pending" {
			return errors.New("claim is not pending")
		}

		// 1. Create salon
		salon := model.Salon{
			NameOverride: &claim.SnapshotName,
			Address:      claim.SnapshotAddress,
			PhonePublic:  claim.SnapshotPhone,
			PhotoURL:     claim.SnapshotPhoto,
			Timezone:     "Europe/Moscow",
		}
		if err := tx.Create(&salon).Error; err != nil {
			return err
		}
		salonID = salon.ID

		// 2. Link external ID
		extID := model.SalonExternalID{
			SalonID:    salon.ID,
			Source:     claim.Source,
			ExternalID: claim.ExternalID,
		}
		if err := tx.Create(&extID).Error; err != nil {
			return err
		}

		// 3. Add owner membership
		member := model.SalonMember{
			SalonID: salon.ID,
			UserID:  claim.UserID,
			Role:    "owner",
		}
		if err := tx.Create(&member).Error; err != nil {
			return err
		}

		// 4. Create subscription (free trial)
		sub := model.SalonSubscription{
			SalonID: salon.ID,
			Plan:    "free",
			Status:  "trial",
		}
		if err := tx.Create(&sub).Error; err != nil {
			return err
		}

		// 5. Mark this claim approved
		now := time.Now()
		if err := tx.Model(&model.SalonClaim{}).Where("id = ?", claimID).Updates(map[string]interface{}{
			"status":      "approved",
			"salon_id":    salon.ID,
			"reviewed_by": reviewerID,
			"reviewed_at": now,
			"updated_at":  now,
		}).Error; err != nil {
			return err
		}

		// 6. Mark competing pending claims as duplicate
		dupReason := "Другая заявка на этот салон была одобрена"
		return tx.Model(&model.SalonClaim{}).
			Where("id <> ? AND source = ? AND external_id = ? AND status = 'pending'",
				claimID, claim.Source, claim.ExternalID).
			Updates(map[string]interface{}{
				"status":           "duplicate",
				"rejection_reason": dupReason,
				"updated_at":       now,
			}).Error
	})

	return salonID, err
}

func (r *salonClaimRepository) RejectClaim(ctx context.Context, claimID, reviewerID uuid.UUID, reason string) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&model.SalonClaim{}).
		Where("id = ? AND status = 'pending'", claimID).
		Updates(map[string]interface{}{
			"status":           "rejected",
			"rejection_reason": reason,
			"reviewed_by":      reviewerID,
			"reviewed_at":      now,
			"updated_at":       now,
		}).Error
}
```

- [ ] **Step 3: Build**

```bash
cd backend && go build ./...
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/repository/salon_claim.go \
        backend/internal/infrastructure/persistence/salon_claim_repository.go
git commit -m "feat: add SalonClaimRepository interface and GORM implementation"
```

---

## Task 4: Service Layer

**Files:**
- Create: `backend/internal/service/salon_claim_service.go`

- [ ] **Step 1: Write service**

```go
// backend/internal/service/salon_claim_service.go
package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
)

var (
	ErrClaimAlreadyClaimed   = errors.New("salon already claimed by platform")
	ErrClaimAlreadySubmitted = errors.New("active claim already submitted")
	ErrClaimNotFound         = errors.New("claim not found")
	ErrClaimNotPending       = errors.New("claim is not in pending state")
)

// SubmitClaimInput is the payload for Submit.
type SubmitClaimInput struct {
	UserID          uuid.UUID
	Source          string
	ExternalID      string
	RelationType    string
	Comment         *string
	SnapshotName    string
	SnapshotAddress *string
	SnapshotPhone   *string
	SnapshotPhoto   *string
}

// SalonClaimService handles salon claim business logic.
type SalonClaimService interface {
	// Submit validates and persists a new claim. Returns ErrClaimAlreadyClaimed if
	// the external place is already linked to a platform salon, or ErrClaimAlreadySubmitted
	// if this user already has an active claim for this place.
	Submit(ctx context.Context, in SubmitClaimInput) (*model.SalonClaim, error)
	// GetStatus returns the caller's active claim for a given place, or nil if none.
	GetStatus(ctx context.Context, userID uuid.UUID, source, externalID string) (*model.SalonClaim, error)
	// ListForAdmin returns paginated claims filtered by status for the admin page.
	ListForAdmin(ctx context.Context, status string, page, pageSize int) ([]repository.SalonClaimRow, int64, error)
	// Approve approves a pending claim and creates the salon+members atomically.
	// Returns the new salon UUID.
	Approve(ctx context.Context, claimID, reviewerID uuid.UUID) (uuid.UUID, error)
	// Reject marks a pending claim rejected with a reason.
	Reject(ctx context.Context, claimID, reviewerID uuid.UUID, reason string) error
}

type salonClaimService struct {
	claimRepo repository.SalonClaimRepository
	salonRepo repository.SalonRepository
}

// NewSalonClaimService constructs SalonClaimService.
func NewSalonClaimService(claimRepo repository.SalonClaimRepository, salonRepo repository.SalonRepository) SalonClaimService {
	return &salonClaimService{claimRepo: claimRepo, salonRepo: salonRepo}
}

func (s *salonClaimService) Submit(ctx context.Context, in SubmitClaimInput) (*model.SalonClaim, error) {
	// 409: place already linked to a platform salon
	existing, err := s.salonRepo.FindByExternalID(ctx, in.Source, in.ExternalID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrClaimAlreadyClaimed
	}

	// 409: this user already has an active claim for this place
	active, err := s.claimRepo.FindActiveByUserAndPlace(ctx, in.UserID, in.Source, in.ExternalID)
	if err != nil {
		return nil, err
	}
	if active != nil {
		return nil, ErrClaimAlreadySubmitted
	}

	relType := in.RelationType
	if relType == "" {
		relType = "owner"
	}

	c := &model.SalonClaim{
		UserID:          in.UserID,
		RelationType:    relType,
		Comment:         in.Comment,
		Source:          in.Source,
		ExternalID:      in.ExternalID,
		SnapshotName:    in.SnapshotName,
		SnapshotAddress: in.SnapshotAddress,
		SnapshotPhone:   in.SnapshotPhone,
		SnapshotPhoto:   in.SnapshotPhoto,
		Status:          "pending",
	}
	if err := s.claimRepo.Create(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *salonClaimService) GetStatus(ctx context.Context, userID uuid.UUID, source, externalID string) (*model.SalonClaim, error) {
	return s.claimRepo.FindActiveByUserAndPlace(ctx, userID, source, externalID)
}

func (s *salonClaimService) ListForAdmin(ctx context.Context, status string, page, pageSize int) ([]repository.SalonClaimRow, int64, error) {
	return s.claimRepo.ListByStatus(ctx, status, page, pageSize)
}

func (s *salonClaimService) Approve(ctx context.Context, claimID, reviewerID uuid.UUID) (uuid.UUID, error) {
	claim, err := s.claimRepo.GetByID(ctx, claimID)
	if err != nil {
		return uuid.Nil, err
	}
	if claim == nil {
		return uuid.Nil, ErrClaimNotFound
	}
	if claim.Status != "pending" {
		return uuid.Nil, ErrClaimNotPending
	}
	return s.claimRepo.ApproveClaim(ctx, claimID, reviewerID)
}

func (s *salonClaimService) Reject(ctx context.Context, claimID, reviewerID uuid.UUID, reason string) error {
	claim, err := s.claimRepo.GetByID(ctx, claimID)
	if err != nil {
		return err
	}
	if claim == nil {
		return ErrClaimNotFound
	}
	if claim.Status != "pending" {
		return ErrClaimNotPending
	}
	return s.claimRepo.RejectClaim(ctx, claimID, reviewerID, reason)
}
```

- [ ] **Step 2: Build**

```bash
cd backend && go build ./...
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/service/salon_claim_service.go
git commit -m "feat: add SalonClaimService with Submit/Approve/Reject logic"
```

---

## Task 5: HTTP Controller

**Files:**
- Create: `backend/internal/controller/salon_claim_controller.go`

- [ ] **Step 1: Write controller**

```go
// backend/internal/controller/salon_claim_controller.go
package controller

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/auth"
	"github.com/yourusername/beauty-marketplace/internal/service"
	"go.uber.org/zap"
)

// SalonClaimController handles /api/v1/salons/claim* and /api/v1/admin/claims*.
type SalonClaimController struct {
	svc service.SalonClaimService
	log *zap.Logger
}

// NewSalonClaimController constructs SalonClaimController.
func NewSalonClaimController(svc service.SalonClaimService, log *zap.Logger) *SalonClaimController {
	return &SalonClaimController{svc: svc, log: log}
}

// SubmitClaim handles POST /api/v1/salons/claim (JWT required, any role).
func (h *SalonClaimController) SubmitClaim(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var body struct {
		Source       string  `json:"source"`
		ExternalID   string  `json:"externalId"`
		RelationType string  `json:"relationType"`
		Comment      *string `json:"comment"`
		// Snapshot fields sent by frontend after fetching place details
		SnapshotName    string  `json:"snapshotName"`
		SnapshotAddress *string `json:"snapshotAddress"`
		SnapshotPhone   *string `json:"snapshotPhone"`
		SnapshotPhoto   *string `json:"snapshotPhoto"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}
	if body.Source == "" || body.ExternalID == "" || body.SnapshotName == "" {
		http.Error(w, `{"error":"source, externalId and snapshotName are required"}`, http.StatusBadRequest)
		return
	}

	claim, err := h.svc.Submit(r.Context(), service.SubmitClaimInput{
		UserID:          userID,
		Source:          body.Source,
		ExternalID:      body.ExternalID,
		RelationType:    body.RelationType,
		Comment:         body.Comment,
		SnapshotName:    body.SnapshotName,
		SnapshotAddress: body.SnapshotAddress,
		SnapshotPhone:   body.SnapshotPhone,
		SnapshotPhoto:   body.SnapshotPhoto,
	})

	if errors.Is(err, service.ErrClaimAlreadyClaimed) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "already_claimed"})
		return
	}
	if errors.Is(err, service.ErrClaimAlreadySubmitted) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"error":  "claim_already_submitted",
			"status": "pending",
		})
		return
	}
	if err != nil {
		h.log.Error("submit claim", zap.Error(err))
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"claimId":             claim.ID,
		"status":              claim.Status,
		"estimatedReviewDays": 3,
	})
}

// GetMyStatus handles GET /api/v1/salons/claim/my-status?source=2gis&externalId=...
func (h *SalonClaimController) GetMyStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	q := r.URL.Query()
	source := q.Get("source")
	externalID := q.Get("externalId")
	if source == "" || externalID == "" {
		http.Error(w, `{"error":"source and externalId are required"}`, http.StatusBadRequest)
		return
	}

	claim, err := h.svc.GetStatus(r.Context(), userID, source, externalID)
	if err != nil {
		h.log.Error("get claim status", zap.Error(err))
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}
	if claim == nil {
		http.Error(w, `{"error":"no_active_claim"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"claimId":         claim.ID,
		"status":          claim.Status,
		"rejectionReason": claim.RejectionReason,
		"salonId":         claim.SalonID,
		"createdAt":       claim.CreatedAt,
	})
}

// AdminClaimsRoutes handles /api/v1/admin/claims and /api/v1/admin/claims/:id/...
func (h *SalonClaimController) AdminClaimsRoutes(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	// GET /api/v1/admin/claims
	if len(parts) == 4 && r.Method == http.MethodGet {
		h.listClaims(w, r)
		return
	}
	// PUT /api/v1/admin/claims/:id/approve
	// PUT /api/v1/admin/claims/:id/reject
	if len(parts) == 6 && r.Method == http.MethodPut {
		id, err := uuid.Parse(parts[4])
		if err != nil {
			http.Error(w, `{"error":"invalid claim id"}`, http.StatusBadRequest)
			return
		}
		switch parts[5] {
		case "approve":
			h.approveClaim(w, r, id)
		case "reject":
			h.rejectClaim(w, r, id)
		default:
			http.NotFound(w, r)
		}
		return
	}
	http.NotFound(w, r)
}

func (h *SalonClaimController) listClaims(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	status := q.Get("status")
	page, _ := strconv.Atoi(q.Get("page"))
	pageSize, _ := strconv.Atoi(q.Get("page_size"))

	rows, total, err := h.svc.ListForAdmin(r.Context(), status, page, pageSize)
	if err != nil {
		h.log.Error("list claims", zap.Error(err))
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}

	type placeDTO struct {
		Name    string  `json:"name"`
		Address *string `json:"address"`
		Phone   *string `json:"phone"`
		Photo   *string `json:"photoUrl"`
	}
	type userDTO struct {
		ID          string  `json:"id"`
		Phone       string  `json:"phone"`
		DisplayName *string `json:"displayName"`
	}
	type itemDTO struct {
		ID           string   `json:"id"`
		Status       string   `json:"status"`
		RelationType string   `json:"relationType"`
		Comment      *string  `json:"comment"`
		CreatedAt    string   `json:"createdAt"`
		User         userDTO  `json:"user"`
		Place        placeDTO `json:"place"`
	}

	items := make([]itemDTO, len(rows))
	for i, row := range rows {
		items[i] = itemDTO{
			ID:           row.Claim.ID.String(),
			Status:       row.Claim.Status,
			RelationType: row.Claim.RelationType,
			Comment:      row.Claim.Comment,
			CreatedAt:    row.Claim.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			User: userDTO{
				ID:          row.Claim.UserID.String(),
				Phone:       row.UserPhone,
				DisplayName: row.UserDisplayName,
			},
			Place: placeDTO{
				Name:    row.Claim.SnapshotName,
				Address: row.Claim.SnapshotAddress,
				Phone:   row.Claim.SnapshotPhone,
				Photo:   row.Claim.SnapshotPhoto,
			},
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"items": items,
		"total": total,
	})
}

func (h *SalonClaimController) approveClaim(w http.ResponseWriter, r *http.Request, claimID uuid.UUID) {
	reviewerID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	salonID, err := h.svc.Approve(r.Context(), claimID, reviewerID)
	if errors.Is(err, service.ErrClaimNotFound) {
		http.Error(w, `{"error":"claim_not_found"}`, http.StatusNotFound)
		return
	}
	if errors.Is(err, service.ErrClaimNotPending) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "claim_already_approved"})
		return
	}
	if err != nil {
		h.log.Error("approve claim", zap.Error(err))
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"salonId": salonID.String()})
}

func (h *SalonClaimController) rejectClaim(w http.ResponseWriter, r *http.Request, claimID uuid.UUID) {
	reviewerID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var body struct {
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Reason == "" {
		http.Error(w, `{"error":"reason is required"}`, http.StatusBadRequest)
		return
	}

	err := h.svc.Reject(r.Context(), claimID, reviewerID, body.Reason)
	if errors.Is(err, service.ErrClaimNotFound) {
		http.Error(w, `{"error":"claim_not_found"}`, http.StatusNotFound)
		return
	}
	if errors.Is(err, service.ErrClaimNotPending) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "claim_not_pending"})
		return
	}
	if err != nil {
		h.log.Error("reject claim", zap.Error(err))
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "rejected"})
}
```

- [ ] **Step 2: Build**

```bash
cd backend && go build ./...
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/controller/salon_claim_controller.go
git commit -m "feat: add SalonClaimController (submit, my-status, admin approve/reject)"
```

---

## Task 6: Wire Fx + Routes

**Files:**
- Modify: `backend/internal/app/app.go`
- Modify: `backend/internal/controller/server.go`

- [ ] **Step 1: Register in app.go**

In `backend/internal/app/app.go`, add inside `fx.Provide(...)` after `persistence.NewSalonClientRepository`:

```go
persistence.NewSalonClaimRepository,
```

After `service.NewSalonClientService`:

```go
service.NewSalonClaimService,
```

After `controller.NewSalonClientController`:

```go
controller.NewSalonClaimController,
```

- [ ] **Step 2: Add to NewHTTPServer signature in server.go**

In `backend/internal/controller/server.go`, add `claimCtrl *SalonClaimController` to `NewHTTPServer` parameters after `uh *UserController`:

```go
claimCtrl *SalonClaimController,
```

- [ ] **Step 3: Add routes in server.go**

Inside `NewHTTPServer`, after the existing dashboard routes, add:

```go
// Salon claim (JWT required)
mux.HandleFunc("POST /api/v1/salons/claim", withCORS(auth.RequireAuth(jwtMgr, claimCtrl.SubmitClaim)))
mux.HandleFunc("GET /api/v1/salons/claim/my-status", withCORS(auth.RequireAuth(jwtMgr, claimCtrl.GetMyStatus)))

// Admin claims (admin role required)
mux.HandleFunc("/api/v1/admin/claims", withCORS(auth.RequireRole(jwtMgr, claimCtrl.AdminClaimsRoutes, "admin")))
mux.HandleFunc("/api/v1/admin/claims/", withCORS(auth.RequireRole(jwtMgr, claimCtrl.AdminClaimsRoutes, "admin")))
```

- [ ] **Step 4: Build**

```bash
cd backend && go build ./...
```

Expected: exits 0.

- [ ] **Step 5: Smoke test**

```bash
# Start the server
cd backend && go run cmd/api/main.go &
sleep 2

# Should 401 (auth required)
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/v1/salons/claim
# Expected: 401

# Should 401 (admin required)
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/v1/admin/claims
# Expected: 401

kill %1
```

- [ ] **Step 6: Commit**

```bash
git add backend/internal/app/app.go backend/internal/controller/server.go
git commit -m "feat: wire SalonClaimController into Fx and register routes"
```

---

## Task 7: Frontend API Client

**Files:**
- Create: `frontend/src/shared/api/claimApi.ts`
- Modify: `frontend/src/shared/config/routes.ts`

- [ ] **Step 1: Write claimApi.ts**

```typescript
// frontend/src/shared/api/claimApi.ts
import { authFetch } from './authApi'
import { publicApiUrl } from '@shared/lib/apiPublicUrl'

const base = () => publicApiUrl('/api/v1')

// ─── Types ───────────────────────────────────────────────────────────────────

export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'duplicate'
export type ClaimRelation = 'owner' | 'manager' | 'representative'

export interface SubmitClaimPayload {
  source: string
  externalId: string
  relationType: ClaimRelation
  comment?: string
  snapshotName: string
  snapshotAddress?: string
  snapshotPhone?: string
  snapshotPhoto?: string
}

export interface SubmitClaimResponse {
  claimId: string
  status: ClaimStatus
  estimatedReviewDays: number
}

export interface ClaimStatusResponse {
  claimId: string
  status: ClaimStatus
  rejectionReason?: string | null
  salonId?: string | null
  createdAt: string
}

export interface AdminClaimItem {
  id: string
  status: ClaimStatus
  relationType: ClaimRelation
  comment?: string | null
  createdAt: string
  user: { id: string; phone: string; displayName?: string | null }
  place: { name: string; address?: string | null; phone?: string | null; photoUrl?: string | null }
}

export interface AdminClaimsResponse {
  items: AdminClaimItem[]
  total: number
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function submitClaim(payload: SubmitClaimPayload): Promise<SubmitClaimResponse> {
  const res = await authFetch(`${base()}/salons/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = Object.assign(new Error(body.error ?? 'submit_claim_failed'), { status: res.status, body })
    throw err
  }
  return res.json()
}

export async function fetchMyClaimStatus(source: string, externalId: string): Promise<ClaimStatusResponse | null> {
  const res = await authFetch(`${base()}/salons/claim/my-status?source=${source}&externalId=${encodeURIComponent(externalId)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('fetch_claim_status_failed')
  return res.json()
}

export async function fetchAdminClaims(status = 'pending', page = 1, pageSize = 20): Promise<AdminClaimsResponse> {
  const res = await authFetch(`${base()}/admin/claims?status=${status}&page=${page}&page_size=${pageSize}`)
  if (!res.ok) throw new Error('fetch_admin_claims_failed')
  return res.json()
}

export async function approveClaim(claimId: string): Promise<{ salonId: string }> {
  const res = await authFetch(`${base()}/admin/claims/${claimId}/approve`, { method: 'PUT' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(body.error ?? 'approve_failed'), { status: res.status })
  }
  return res.json()
}

export async function rejectClaim(claimId: string, reason: string): Promise<void> {
  const res = await authFetch(`${base()}/admin/claims/${claimId}/reject`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  if (!res.ok) throw new Error('reject_failed')
}
```

- [ ] **Step 2: Add routes to routes.ts**

In `frontend/src/shared/config/routes.ts`, add:

```typescript
export const ROUTES = {
  HOME: '/',
  SALON: '/salon/:id',
  PLACE: '/place/:externalId',
  MASTER: '/master/:masterProfileId',
  LOGIN: '/login',
  ME: '/me',
  DASHBOARD: '/dashboard',
  MASTER_DASHBOARD: '/master-dashboard',
  MASTER_DASHBOARD_INVITES: '/master-dashboard?section=invites',
  MASTER_DASHBOARD_PROFILE: '/master-dashboard?section=profile',
  CLAIM_SALON: '/claim-salon',
  CLAIM_STATUS: '/claim-salon/status',
  JOIN: '/join',
  ADMIN_CLAIMS: '/admin/claims',
  ONBOARDING: '/dashboard/onboarding',
} as const
```

Also add these helper functions after the existing ones:

```typescript
export const claimSalonPath = (source: string, extId: string) =>
  `/claim-salon?source=${source}&externalId=${encodeURIComponent(extId)}`

export const claimStatusPath = (source: string, extId: string) =>
  `/claim-salon/status?source=${source}&externalId=${encodeURIComponent(extId)}`
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared/api/claimApi.ts frontend/src/shared/config/routes.ts
git commit -m "feat: add claimApi.ts and claim/admin/onboarding routes constants"
```

---

## Task 8: ClaimChip + SalonPage Integration

**Files:**
- Create: `frontend/src/features/claim-salon/ui/ClaimChip.tsx`
- Modify: `frontend/src/pages/salon/ui/SalonPage.tsx`

- [ ] **Step 1: Create ClaimChip**

```tsx
// frontend/src/features/claim-salon/ui/ClaimChip.tsx
import { Box } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { claimSalonPath } from '@shared/config/routes'

interface ClaimChipProps {
  source: string
  externalId: string
}

export function ClaimChip({ source, externalId }: ClaimChipProps) {
  const navigate = useNavigate()

  return (
    <Box
      component="button"
      onClick={() => navigate(claimSalonPath(source, externalId))}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1.2,
        py: 0.4,
        border: '1px dashed rgba(255,255,255,0.5)',
        borderRadius: '100px',
        bgcolor: 'transparent',
        color: 'rgba(255,255,255,0.75)',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
        '&:hover': {
          borderColor: 'rgba(255,255,255,0.9)',
          color: 'white',
        },
      }}
    >
      Это ваш бизнес? →
    </Box>
  )
}
```

- [ ] **Step 2: Add ClaimChip to SalonPage**

In `frontend/src/pages/salon/ui/SalonPage.tsx`:

Add import at the top:
```typescript
import { ClaimChip } from '@features/claim-salon/ui/ClaimChip'
```

Find the hero section where `{view.mode === 'place' && (...)}` badge renders (around line 183-187). Add the ClaimChip right after the `2GIS карточка` badge Box:

```tsx
{view.mode === 'place' && (
  <Box sx={{ px: 1.2, py: 0.35, borderRadius: 100, bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 12, fontWeight: 600 }}>
    2GIS карточка
  </Box>
)}
{view.mode === 'place' && placeExternalId && (
  <ClaimChip source="2gis" externalId={placeExternalId} />
)}
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/claim-salon/ui/ClaimChip.tsx \
        frontend/src/pages/salon/ui/SalonPage.tsx
git commit -m "feat: add ClaimChip to /place/:extId page hero"
```

---

## Task 9: ClaimSalonPage + ClaimSuccessScreen

**Files:**
- Create: `frontend/src/features/claim-salon/ui/ClaimSuccessScreen.tsx`
- Create: `frontend/src/features/claim-salon/ui/ClaimSalonPage.tsx`

- [ ] **Step 1: Create ClaimSuccessScreen**

```tsx
// frontend/src/features/claim-salon/ui/ClaimSuccessScreen.tsx
import { Box, Button, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { claimStatusPath } from '@shared/config/routes'

interface Props {
  source: string
  externalId: string
}

export function ClaimSuccessScreen({ source, externalId }: Props) {
  const navigate = useNavigate()
  return (
    <Box sx={{ textAlign: 'center', py: 6, px: 3, maxWidth: 480, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontFamily: "'Fraunces', serif", mb: 2 }}>
        Заявка принята!
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Мы проверим ваши данные в течение 1–3 рабочих дней и сообщим о решении.
      </Typography>
      <Button variant="outlined" onClick={() => navigate(claimStatusPath(source, externalId))}>
        Проверить статус заявки
      </Button>
    </Box>
  )
}
```

- [ ] **Step 2: Create ClaimSalonPage**

```tsx
// frontend/src/features/claim-salon/ui/ClaimSalonPage.tsx
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Alert, Box, Button, CircularProgress, FormControl,
  InputLabel, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material'
import { NavBar } from '@shared/ui/NavBar'
import { fetchPlaceByExternalId } from '@shared/api/placesApi'
import { submitClaim, type ClaimRelation } from '@shared/api/claimApi'
import { ClaimSuccessScreen } from './ClaimSuccessScreen'

export function ClaimSalonPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const source = params.get('source') ?? '2gis'
  const externalId = params.get('externalId') ?? ''

  const [placeLoading, setPlaceLoading] = useState(true)
  const [place, setPlace] = useState<{ name: string; address?: string; phone?: string; photoUrl?: string } | null>(null)
  const [relation, setRelation] = useState<ClaimRelation>('owner')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!externalId) { setPlaceLoading(false); return }
    fetchPlaceByExternalId(externalId)
      .then(p => setPlace({
        name: p.name,
        address: p.address,
        phone: p.contacts?.find(c => c.type === 'phone')?.value,
        photoUrl: p.photos?.[0],
      }))
      .catch(() => setError('Не удалось загрузить данные салона'))
      .finally(() => setPlaceLoading(false))
  }, [externalId])

  if (!externalId) {
    return (
      <Box><NavBar />
        <Box sx={{ p: 4 }}><Alert severity="error">Не указан externalId салона.</Alert></Box>
      </Box>
    )
  }

  if (success) {
    return (
      <Box minHeight="100vh" bgcolor="background.default">
        <NavBar />
        <ClaimSuccessScreen source={source} externalId={externalId} />
      </Box>
    )
  }

  const handleSubmit = async () => {
    if (!place) return
    setSubmitting(true)
    setError(null)
    try {
      await submitClaim({
        source,
        externalId,
        relationType: relation,
        comment: comment.trim() || undefined,
        snapshotName: place.name,
        snapshotAddress: place.address,
        snapshotPhone: place.phone,
        snapshotPhoto: place.photoUrl,
      })
      setSuccess(true)
    } catch (err: unknown) {
      const e = err as { body?: { error?: string } }
      if (e?.body?.error === 'already_claimed') {
        setError('Этот салон уже зарегистрирован на платформе.')
      } else if (e?.body?.error === 'claim_already_submitted') {
        setError('Вы уже подали заявку на этот салон. Проверьте статус.')
      } else {
        setError('Не удалось отправить заявку. Попробуйте позже.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <NavBar />
      <Box sx={{ maxWidth: 560, mx: 'auto', px: 2, py: 5 }}>
        <Typography variant="h5" sx={{ fontFamily: "'Fraunces', serif", mb: 1 }}>
          Заявить права на салон
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Заполните форму — мы проверим и свяжемся с вами в течение 1–3 дней.
        </Typography>

        {placeLoading && <CircularProgress />}

        {!placeLoading && place && (
          <Stack gap={2.5}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography fontWeight={600}>{place.name}</Typography>
              {place.address && <Typography variant="body2" color="text.secondary">{place.address}</Typography>}
              {place.phone && <Typography variant="body2" color="text.secondary">{place.phone}</Typography>}
            </Box>

            <FormControl fullWidth size="small">
              <InputLabel>Ваша роль</InputLabel>
              <Select
                value={relation}
                label="Ваша роль"
                onChange={e => setRelation(e.target.value as ClaimRelation)}
              >
                <MenuItem value="owner">Владелец</MenuItem>
                <MenuItem value="manager">Управляющий</MenuItem>
                <MenuItem value="representative">Представитель</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Комментарий (необязательно)"
              multiline
              rows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Расскажите, как связаны с этим бизнесом"
            />

            {error && <Alert severity="error">{error}</Alert>}

            <Stack direction="row" gap={1.5}>
              <Button
                variant="contained"
                disabled={submitting}
                onClick={handleSubmit}
                sx={{ flex: 1 }}
              >
                {submitting ? <CircularProgress size={20} /> : 'Отправить заявку'}
              </Button>
              <Button variant="outlined" onClick={() => navigate(-1)}>
                Отмена
              </Button>
            </Stack>
          </Stack>
        )}

        {!placeLoading && !place && !error && (
          <Alert severity="warning">Салон не найден.</Alert>
        )}
        {error && !place && <Alert severity="error">{error}</Alert>}
      </Box>
    </Box>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/claim-salon/
git commit -m "feat: add ClaimSalonPage with 2GIS prefill and submit flow"
```

---

## Task 10: Wire Frontend Routes

**Files:**
- Modify: `frontend/src/app/App.tsx`

- [ ] **Step 1: Add imports and routes**

In `frontend/src/app/App.tsx`, add imports:

```typescript
import { ClaimSalonPage } from '@features/claim-salon/ui/ClaimSalonPage'
import { ClaimStatusPage } from '@features/claim-salon/ui/ClaimStatusPage'
import { AdminClaimsPage } from '@pages/admin/ui/AdminClaimsPage'
import { OnboardingWizard } from '@pages/dashboard/ui/OnboardingWizard'
import { JoinPage } from '@pages/join/ui/JoinPage'
import { ROUTES } from '@shared/config/routes'
```

Add routes inside `<Routes>` after existing routes:

```tsx
<Route path={ROUTES.CLAIM_SALON} element={<RequireAuth><ClaimSalonPage /></RequireAuth>} />
<Route path={ROUTES.CLAIM_STATUS} element={<RequireAuth><ClaimStatusPage /></RequireAuth>} />
<Route path={ROUTES.JOIN} element={<JoinPage />} />
<Route path={ROUTES.ADMIN_CLAIMS} element={<RequireAuth><AdminClaimsPage /></RequireAuth>} />
<Route path={ROUTES.ONBOARDING} element={<RequireAuth><OnboardingWizard /></RequireAuth>} />
```

- [ ] **Step 2: Create stub pages to allow build (fill content in Tasks 11-13)**

Create `frontend/src/features/claim-salon/ui/ClaimStatusPage.tsx`:
```tsx
// frontend/src/features/claim-salon/ui/ClaimStatusPage.tsx
export function ClaimStatusPage() { return null }
```

Create `frontend/src/pages/admin/ui/AdminClaimsPage.tsx`:
```tsx
// frontend/src/pages/admin/ui/AdminClaimsPage.tsx
export function AdminClaimsPage() { return null }
```

Create `frontend/src/pages/dashboard/ui/OnboardingWizard.tsx`:
```tsx
// frontend/src/pages/dashboard/ui/OnboardingWizard.tsx
export function OnboardingWizard() { return null }
```

Create `frontend/src/pages/join/ui/JoinPage.tsx`:
```tsx
// frontend/src/pages/join/ui/JoinPage.tsx
export function JoinPage() { return null }
```

- [ ] **Step 3: Build check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/App.tsx \
        frontend/src/features/claim-salon/ui/ClaimStatusPage.tsx \
        frontend/src/pages/admin/ui/AdminClaimsPage.tsx \
        frontend/src/pages/dashboard/ui/OnboardingWizard.tsx \
        frontend/src/pages/join/ui/JoinPage.tsx
git commit -m "feat: wire claim/admin/onboarding routes in App.tsx (stubs)"
```

---

## Task 11: Admin Claims Page

**Files:**
- Modify: `frontend/src/pages/admin/ui/AdminClaimsPage.tsx`
- Modify: `frontend/src/shared/ui/NavBar.tsx`

- [ ] **Step 1: Write AdminClaimsPage**

```tsx
// frontend/src/pages/admin/ui/AdminClaimsPage.tsx
import { useCallback, useEffect, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Divider,
  Stack, TextField, Typography,
} from '@mui/material'
import { NavBar } from '@shared/ui/NavBar'
import {
  fetchAdminClaims, approveClaim, rejectClaim,
  type AdminClaimItem,
} from '@shared/api/claimApi'

export function AdminClaimsPage() {
  const [claims, setClaims] = useState<AdminClaimItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchAdminClaims('pending')
      setClaims(res.items)
      setTotal(res.total)
    } catch {
      setError('Не удалось загрузить заявки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleApprove = async (id: string) => {
    setActionLoading(true)
    try {
      await approveClaim(id)
      await load()
    } catch (e: unknown) {
      alert((e as Error).message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return
    setActionLoading(true)
    try {
      await rejectClaim(id, rejectReason)
      setRejectingId(null)
      setRejectReason('')
      await load()
    } catch (e: unknown) {
      alert((e as Error).message)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <NavBar />
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 2, py: 4 }}>
        <Typography variant="h5" sx={{ fontFamily: "'Fraunces', serif", mb: 1 }}>
          Заявки на салоны
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Pending: {total}
        </Typography>

        {loading && <CircularProgress />}
        {error && <Alert severity="error">{error}</Alert>}

        <Stack gap={2}>
          {claims.map(claim => (
            <Box
              key={claim.id}
              sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography fontWeight={700} fontSize={16}>{claim.place.name}</Typography>
                  {claim.place.address && (
                    <Typography variant="body2" color="text.secondary">{claim.place.address}</Typography>
                  )}
                  {claim.place.phone && (
                    <Typography variant="body2" color="text.secondary">{claim.place.phone}</Typography>
                  )}
                </Box>
                <Chip
                  label={claim.relationType}
                  size="small"
                  variant="outlined"
                  sx={{ textTransform: 'capitalize' }}
                />
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="body2">
                <strong>Заявитель:</strong> {claim.user.displayName ?? '—'} · {claim.user.phone}
              </Typography>
              {claim.comment && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  «{claim.comment}»
                </Typography>
              )}
              <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                {new Date(claim.createdAt).toLocaleString('ru-RU')}
              </Typography>

              {rejectingId === claim.id ? (
                <Stack direction="row" gap={1} mt={1.5} alignItems="center">
                  <TextField
                    size="small"
                    placeholder="Причина отклонения"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    disabled={!rejectReason.trim() || actionLoading}
                    onClick={() => handleReject(claim.id)}
                  >
                    Подтвердить
                  </Button>
                  <Button size="small" onClick={() => { setRejectingId(null); setRejectReason('') }}>
                    Отмена
                  </Button>
                </Stack>
              ) : (
                <Stack direction="row" gap={1} mt={1.5}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    disabled={actionLoading}
                    onClick={() => handleApprove(claim.id)}
                  >
                    Одобрить
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => setRejectingId(claim.id)}
                  >
                    Отклонить
                  </Button>
                </Stack>
              )}
            </Box>
          ))}

          {!loading && claims.length === 0 && (
            <Typography color="text.secondary">Нет pending-заявок.</Typography>
          )}
        </Stack>
      </Box>
    </Box>
  )
}
```

- [ ] **Step 2: Add admin link to NavBar**

In `frontend/src/shared/ui/NavBar.tsx`, find where `global_role` or `effectiveRoles` is read. Add a link to `/admin/claims` visible only for `global_role === 'admin'`:

```tsx
// Import at top of NavBar.tsx (if not already present):
import { useSelector } from 'react-redux'
import { selectAuth } from '@features/auth-by-phone/model/authSlice'
import { ROUTES } from '@shared/config/routes'

// Inside NavBar, where nav items are rendered:
const auth = useSelector(selectAuth)
const isAdmin = auth.user?.globalRole === 'admin'

// Then in the JSX, somewhere appropriate (e.g. after "Кабинет"):
{isAdmin && (
  <Button component={Link} to={ROUTES.ADMIN_CLAIMS} size="small" color="warning">
    Заявки
  </Button>
)}
```

> **Note:** Exact insertion point depends on NavBar.tsx structure. Find the block that renders `salon_owner` dashboard link and add the admin link nearby.

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/ui/AdminClaimsPage.tsx \
        frontend/src/shared/ui/NavBar.tsx
git commit -m "feat: add AdminClaimsPage with approve/reject and admin NavBar link"
```

---

## Task 12: Onboarding Wizard

**Files:**
- Modify: `frontend/src/pages/dashboard/ui/OnboardingWizard.tsx`
- Modify: `frontend/src/pages/dashboard/ui/DashboardPage.tsx`

- [ ] **Step 1: Write OnboardingWizard**

```tsx
// frontend/src/pages/dashboard/ui/OnboardingWizard.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert, Box, Button, CircularProgress, MobileStepper,
  Stack, TextField, Typography,
} from '@mui/material'
import { NavBar } from '@shared/ui/NavBar'
import { ROUTES } from '@shared/config/routes'
import { fetchDashboardProfile, updateDashboardProfile } from '@shared/api/dashboardApi'

export function OnboardingWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps = ['Профиль', 'Услуги', 'Расписание']

  const handleFinish = async () => {
    setSaving(true)
    setError(null)
    try {
      if (name.trim()) {
        await updateDashboardProfile({ nameOverride: name.trim(), onlineBookingEnabled: true })
      } else {
        await updateDashboardProfile({ onlineBookingEnabled: true })
      }
      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch {
      setError('Не удалось сохранить. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <NavBar />
      <Box sx={{ maxWidth: 560, mx: 'auto', px: 2, py: 5 }}>
        <Typography variant="h5" sx={{ fontFamily: "'Fraunces', serif", mb: 0.5 }}>
          Настройка салона
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Шаг {step + 1} из {steps.length}: {steps[step]}
        </Typography>

        <MobileStepper
          variant="dots"
          steps={steps.length}
          activeStep={step}
          position="static"
          sx={{ mb: 3, bgcolor: 'transparent', p: 0 }}
          nextButton={null}
          backButton={null}
        />

        {step === 0 && (
          <Stack gap={2}>
            <TextField
              label="Название салона"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Уже заполнено из 2GIS — можно изменить"
              fullWidth
            />
            <Typography variant="body2" color="text.secondary">
              Фото и категория — можно добавить позже в настройках профиля.
            </Typography>
          </Stack>
        )}

        {step === 1 && (
          <Box>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Услуги можно добавить позже в разделе «Услуги» дашборда.
            </Typography>
          </Box>
        )}

        {step === 2 && (
          <Box>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Расписание работы настраивается в разделе «Настройки» → «Расписание».
            </Typography>
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        <Stack direction="row" gap={1.5} mt={4}>
          {step > 0 && (
            <Button variant="outlined" onClick={() => setStep(s => s - 1)}>
              Назад
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button variant="contained" sx={{ flex: 1 }} onClick={() => setStep(s => s + 1)}>
              Далее
            </Button>
          ) : (
            <Button
              variant="contained"
              sx={{ flex: 1 }}
              disabled={saving}
              onClick={handleFinish}
            >
              {saving ? <CircularProgress size={20} /> : 'Перейти в кабинет'}
            </Button>
          )}
          <Button color="inherit" onClick={handleFinish} disabled={saving}>
            Пропустить всё
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}
```

- [ ] **Step 2: Add onboarding_completed to dashboard profile API**

In `frontend/src/shared/api/dashboardApi.ts`, find the profile type and add `onboardingCompleted?: boolean`. Find `updateDashboardProfile` and ensure it can pass `onlineBookingEnabled: true`. Verify `fetchDashboardProfile` returns the profile — if it already has a `profile.onlineBookingEnabled` field, this is where we'll check `onboarding_completed`.

> Check `dashboardApi.ts` to see current shape of GET/PUT /api/v1/dashboard/profile. If `onboardingCompleted` is not in the response type yet, add it:
```typescript
onboardingCompleted?: boolean
```

- [ ] **Step 3: Add redirect in DashboardPage**

In `frontend/src/pages/dashboard/ui/DashboardPage.tsx`, after the profile is loaded, add a redirect to `/dashboard/onboarding` if `onboardingCompleted === false` (and the user has `salon_owner` role):

```typescript
// Near the top of DashboardPage, after profile fetch:
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@shared/config/routes'

// Inside the component, after profile is loaded:
useEffect(() => {
  if (profile && profile.onboardingCompleted === false) {
    navigate(ROUTES.ONBOARDING, { replace: true })
  }
}, [profile, navigate])
```

> **Note:** Only redirect if `onboardingCompleted === false` (explicit false, not undefined), so existing salons (which have `DEFAULT false` in DB but were created before this migration) are NOT redirected — they already have real data.

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/dashboard/ui/OnboardingWizard.tsx \
        frontend/src/pages/dashboard/ui/DashboardPage.tsx \
        frontend/src/shared/api/dashboardApi.ts
git commit -m "feat: add OnboardingWizard and DashboardPage onboarding redirect"
```

---

## Task 13: /join Landing Page

**Files:**
- Modify: `frontend/src/pages/join/ui/JoinPage.tsx`

- [ ] **Step 1: Write JoinPage**

```tsx
// frontend/src/pages/join/ui/JoinPage.tsx
import { useState } from 'react'
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { NavBar } from '@shared/ui/NavBar'
import { claimSalonPath } from '@shared/config/routes'
import { searchPlaces } from '@shared/api/placesApi'

interface PlaceResult {
  externalId: string
  name: string
  address: string
}

export function JoinPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await searchPlaces({ q: query.trim(), pageSize: 10 })
      setResults(res.items.map(p => ({
        externalId: p.externalId,
        name: p.name,
        address: p.address ?? '',
      })))
      setSearched(true)
    } catch {
      setError('Ошибка поиска. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <NavBar />
      <Box sx={{ maxWidth: 640, mx: 'auto', px: 2, py: 6, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontFamily: "'Fraunces', serif", mb: 1 }}>
          Добавьте свой салон
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Найдите ваш бизнес в 2GIS и заявите права — получите дашборд с онлайн-записью.
        </Typography>

        <Stack direction="row" gap={1} sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Название или адрес вашего салона"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void handleSearch()}
          />
          <Button variant="contained" disabled={loading} onClick={handleSearch} sx={{ minWidth: 120 }}>
            {loading ? <CircularProgress size={20} /> : 'Найти'}
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Stack gap={1.5} textAlign="left">
          {results.map(p => (
            <Box
              key={p.externalId}
              sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => navigate(claimSalonPath('2gis', p.externalId))}
            >
              <Typography fontWeight={600}>{p.name}</Typography>
              <Typography variant="body2" color="text.secondary">{p.address}</Typography>
            </Box>
          ))}
          {searched && results.length === 0 && (
            <Typography color="text.secondary">Ничего не найдено. Попробуйте другое название.</Typography>
          )}
        </Stack>
      </Box>
    </Box>
  )
}
```

> **Note:** `searchPlaces` must accept `{ q: string; pageSize?: number }` and return `{ items: Array<{ externalId: string; name: string; address?: string }> }`. Check `placesApi.ts` for the exact function signature — adapt the call if needed.

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/join/ui/JoinPage.tsx
git commit -m "feat: add /join landing page with 2GIS search"
```

---

## Task 14: Backend Profile — expose onboarding_completed

The dashboard profile GET endpoint needs to return `onboardingCompleted`, and the PUT endpoint needs to accept it.

**Files:**
- Modify: `backend/internal/service/dashboard_*.go` (whichever file has `GetProfile`/`UpdateProfile`)
- Modify: `backend/internal/controller/dashboard_controller.go`

- [ ] **Step 1: Find the profile handlers**

```bash
grep -n "GetProfile\|UpdateProfile\|onboarding\|nameOverride\|name_override" \
  backend/internal/service/dashboard_*.go \
  backend/internal/controller/dashboard_controller.go | head -30
```

- [ ] **Step 2: Add onboarding_completed to profile DTO and handler**

In the GET profile handler (in `dashboard_controller.go`), find where the salon profile is serialized to JSON and add:

```go
"onboardingCompleted": salon.OnboardingCompleted,
```

In the PUT profile handler, find where profile fields are updated and add handling for `onboardingCompleted`:

```go
// If body has onboardingCompleted: true, set it
if body.OnboardingCompleted {
    updates["onboarding_completed"] = true
}
```

> Look for `name_override`, `online_booking_enabled` in the PUT handler — add `onboarding_completed` in the same pattern.

- [ ] **Step 3: Build**

```bash
cd backend && go build ./...
```

Expected: exits 0.

- [ ] **Step 4: Smoke test profile endpoint**

With a valid JWT for a salon_owner:
```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/dashboard/profile | jq .onboardingCompleted
```

Expected: `false` for a freshly claimed salon.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/service/ backend/internal/controller/dashboard_controller.go
git commit -m "feat: expose onboarding_completed in dashboard profile GET/PUT"
```

---

## Self-Review

After writing the plan, checking against the spec:

**Spec Coverage:**
- ✅ Migration `000020_salon_claims` + `salons.onboarding_completed` → Task 1
- ✅ GORM model `SalonClaim` → Task 2
- ✅ Repository interface + GORM impl → Task 3
- ✅ Service Submit (409 already_claimed, 409 duplicate claim) → Task 4
- ✅ Service Approve (full transaction, duplicate rejection) → Task 3 (ApproveClaim in repo)
- ✅ Service Reject → Task 4
- ✅ HTTP POST /api/v1/salons/claim → Task 5
- ✅ HTTP GET /api/v1/salons/claim/my-status → Task 5
- ✅ HTTP GET/PUT /api/v1/admin/claims → Task 5
- ✅ Fx + routes wired → Task 6
- ✅ claimApi.ts → Task 7
- ✅ ROUTES constants → Task 7
- ✅ ClaimChip on SalonPage → Task 8
- ✅ ClaimSalonPage with 2GIS prefill → Task 9
- ✅ ClaimSuccessScreen → Task 9
- ✅ App.tsx routes → Task 10
- ✅ AdminClaimsPage → Task 11
- ✅ NavBar admin link → Task 11
- ✅ OnboardingWizard → Task 12
- ✅ DashboardPage onboarding redirect → Task 12
- ✅ /join landing page → Task 13
- ✅ onboarding_completed in profile API → Task 14

**Out of Scope (not in this plan, per spec):**
- ClaimStatusPage full implementation (stub only) — simple page, can extend later
- SearchResultCard hover tooltip — not critical for MVP flow
- SMS/email notifications — spec marks as phase 2

**Type consistency check:**
- `SubmitClaimInput` defined in Task 4, used in Task 5 ✅
- `SalonClaimService` interface defined in Task 4, wired in Task 6 ✅
- `submitClaim` in Task 7 expects `snapshotName` which is sent by `ClaimSalonPage` in Task 9 ✅
- `approveClaim` / `rejectClaim` in Task 7 match admin handler in Task 11 ✅
- `onboardingCompleted` field added to both backend (Task 14) and frontend type (Task 12) ✅
