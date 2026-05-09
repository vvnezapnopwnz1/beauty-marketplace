# Master Self-Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow any authenticated user to start a 5-step onboarding wizard from the `/for-masters` landing page, become a master, and publish their public profile — without breaking existing salon-claim, auto-claim, or shadow-profile flows. Close the privacy gap where shadow profiles are currently visible on `/master/:id` without the master's consent.

**Architecture:** Idempotent `POST /api/v1/me/master-onboarding/start` handles three states (already-master / shadow-by-phone / nothing). New `published_at` column on `master_profiles` gates the public `/master/:id` route only; `salon_masters`-based listings remain unchanged. New `onboarding_step` enum tracks wizard progress for resumability. Frontend wizard reuses existing `/api/v1/master-dashboard/profile|services|schedule` endpoints + adds `start`, `onboarding/step`, `publish`.

**Tech Stack:** Go 1.24 (`net/http`, Fx, GORM, PostgreSQL), React + TypeScript + Vite + MUI + RTK Query.

**Naming note vs. spec:** spec uses `?redirect=` for the OAuth-style return param. Existing codebase uses `?returnTo=` (`RequireAuth.tsx:14-17`, `LoginPage.tsx:15`, `OtpStep.tsx:46`). This plan uses `returnTo` for consistency with the existing codebase.

---

## File Structure

**Backend — created:**
- `backend/migrations/000042_master_profiles_publishing.up.sql`
- `backend/migrations/000042_master_profiles_publishing.down.sql`
- `backend/migrations/000043_master_profiles_onboarding_step.up.sql`
- `backend/migrations/000043_master_profiles_onboarding_step.down.sql`
- `backend/internal/service/master_onboarding.go` — new service for `start` / `advance step` / `publish`
- `backend/internal/service/master_onboarding_test.go` — unit tests for the new service

**Backend — modified:**
- `backend/internal/infrastructure/persistence/model/models.go:125-139` — `MasterProfile` GORM struct
- `backend/internal/repository/master_dashboard.go` — interface: add `CreateOwnedProfile`, `AdvanceOnboardingStep`, `Publish`, `LoadByUserID`
- `backend/internal/infrastructure/persistence/master_dashboard_repository.go` — implementations
- `backend/internal/infrastructure/persistence/master_public_repository.go:135-147` — gate `GetMasterProfilePublic` by `published_at IS NOT NULL`
- `backend/internal/infrastructure/persistence/master_public_repository.go:36-111` — emit `published_at` in `ListSalonMastersPublic` row
- `backend/internal/repository/master_public.go:11-23` — add `IsPublished bool` to `SalonMasterPublicRow`
- `backend/internal/service/master_public.go:11-39` — add `IsPublished bool` to `MasterProfilePublicNested`; populate in service mapper
- `backend/internal/service/master_dashboard.go:141-149` — add `PublishedAt` and `OnboardingStep` to `MasterProfileCabinetDTO`; populate in `MyProfile`
- `backend/internal/controller/master_dashboard_controller.go:120` — add cases `onboarding` and `publish` in route dispatcher
- `backend/internal/controller/server.go:75` — register `POST /api/v1/me/master-onboarding/start` HandleFunc
- `backend/internal/app/app.go:160` — wire new service into Fx graph

**Frontend — created:**
- `frontend/src/shared/lib/safeRedirect.ts` — open-redirect guard helper
- `frontend/src/entities/master-onboarding/api/masterOnboardingApi.ts` — RTK Query slice
- `frontend/src/entities/master-onboarding/index.ts` — re-exports
- `frontend/src/pages/master-onboarding/ui/MasterOnboardingStartBridge.tsx`
- `frontend/src/pages/master-onboarding/ui/MasterOnboardingWizard.tsx`
- `frontend/src/pages/master-onboarding/ui/StepProfile.tsx`
- `frontend/src/pages/master-onboarding/ui/StepSpecializations.tsx`
- `frontend/src/pages/master-onboarding/ui/StepServices.tsx`
- `frontend/src/pages/master-onboarding/ui/StepSchedule.tsx`
- `frontend/src/pages/master-onboarding/ui/StepPublish.tsx`
- `frontend/src/pages/master-onboarding/index.ts`

**Frontend — modified:**
- `frontend/src/shared/config/routes.ts` — add `MASTER_ONBOARDING`, `MASTER_ONBOARDING_START`
- `frontend/src/app/App.tsx` — add new routes
- `frontend/src/features/auth-by-phone/ui/OtpStep.tsx:46` — use `safeRelativePath` for `returnTo`
- `frontend/src/pages/login/ui/LoginPage.tsx:26` — use `safeRelativePath` for `returnTo`
- `frontend/src/pages/for-masters/ui/HeroSection.tsx:53` — change CTA href
- `frontend/src/pages/for-masters/ui/CtaFooterSection.tsx` — change CTA href
- `frontend/src/pages/salon/ui/SalonPage.tsx:443-447` — gate "Профиль мастера" button by `isPublished`
- `frontend/src/entities/master/...` — add `isPublished` to public master types (path verified in Task 14)
- `frontend/src/shared/i18n/locales/en.json` — `masterOnboarding.*`
- `frontend/src/shared/i18n/locales/ru.json` — `masterOnboarding.*`

**Docs — modified:**
- `docs/vault/architecture/code-map.md` — entry for self-onboarding
- `docs/vault/architecture/db-schema.md` — `published_at`, `onboarding_step`
- `docs/vault/entities/master-profiles-salon-masters.md` — Path 4: self-registration
- `docs/vault/entities/user-roles.md` — note about self-onboarding
- `docs/vault/product/status.md` — entry under "Последние изменения"

---

## Execution Order

| Phase | Tasks | Why this order |
|---|---|---|
| 1 — DB foundation | 1, 2, 3 | Migrations + model are zero-risk additive changes; downstream tasks need them. |
| 2 — Public-side gating | 4, 5 | Closes privacy gap independently; can be merged early. |
| 3 — Cabinet DTO + repo | 6, 7 | Foundation for service layer. |
| 4 — Service & controller | 8, 9, 10, 11 | TDD-driven core. |
| 5 — Fx wiring | 12 | Plug everything in. |
| 6 — Open-redirect fix | 13 | Pre-emptive security fix; needed before frontend wizard relies on `returnTo`. |
| 7 — Frontend types + simple UI | 14, 15 | Decoupled from wizard, low risk. |
| 8 — Frontend wizard | 16, 17, 18, 19, 20, 21, 22, 23 | The big chunk. |
| 9 — i18n + docs + verification | 24, 25, 26 | Wrap-up. |

---

## Phase 1 — DB foundation

### Task 1: Migration 000042 — `published_at`

**Files:**
- Create: `backend/migrations/000042_master_profiles_publishing.up.sql`
- Create: `backend/migrations/000042_master_profiles_publishing.down.sql`

- [ ] **Step 1: Create up migration**

`backend/migrations/000042_master_profiles_publishing.up.sql`:

```sql
ALTER TABLE master_profiles
    ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;

-- Backfill: only claimed (user_id IS NOT NULL) profiles are considered consenting.
-- Shadow profiles (user_id IS NULL) stay hidden on /master/:id; they continue to
-- appear on salon pages via salon_masters.
UPDATE master_profiles
   SET published_at = created_at
 WHERE user_id IS NOT NULL;

CREATE INDEX idx_master_profiles_published
    ON master_profiles(published_at)
    WHERE published_at IS NOT NULL;
```

- [ ] **Step 2: Create down migration**

`backend/migrations/000042_master_profiles_publishing.down.sql`:

```sql
DROP INDEX IF EXISTS idx_master_profiles_published;
ALTER TABLE master_profiles DROP COLUMN IF EXISTS published_at;
```

- [ ] **Step 3: Run migrations against local DB**

Run: `cd backend && go run ./cmd/migrate up` (use the project's existing migration command — if a different command is used, replace; check `Makefile` or `scripts/` for the canonical one).
Expected: migration `000042` reported applied, no errors.

- [ ] **Step 4: Spot-check backfill**

Run via psql/`docker compose exec db psql ...`:

```sql
SELECT
  COUNT(*) FILTER (WHERE user_id IS NOT NULL AND published_at IS NULL) AS claimed_unpublished,
  COUNT(*) FILTER (WHERE user_id IS NULL AND published_at IS NOT NULL) AS shadow_published
FROM master_profiles;
```

Expected: both counts = 0.

- [ ] **Step 5: Commit**

```bash
git add backend/migrations/000042_master_profiles_publishing.up.sql \
        backend/migrations/000042_master_profiles_publishing.down.sql
git commit -m "feat(db): add published_at to master_profiles with backfill for claimed"
```

### Task 2: Migration 000043 — `onboarding_step`

**Files:**
- Create: `backend/migrations/000043_master_profiles_onboarding_step.up.sql`
- Create: `backend/migrations/000043_master_profiles_onboarding_step.down.sql`

- [ ] **Step 1: Create up migration**

`backend/migrations/000043_master_profiles_onboarding_step.up.sql`:

```sql
DO $$ BEGIN
  CREATE TYPE master_onboarding_step AS ENUM (
    'profile', 'specializations', 'services', 'schedule', 'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE master_profiles
    ADD COLUMN onboarding_step master_onboarding_step;

UPDATE master_profiles mp
   SET onboarding_step = 'completed'
 WHERE mp.published_at IS NOT NULL
   AND mp.user_id IS NOT NULL;
```

- [ ] **Step 2: Create down migration**

`backend/migrations/000043_master_profiles_onboarding_step.down.sql`:

```sql
ALTER TABLE master_profiles DROP COLUMN IF EXISTS onboarding_step;
DROP TYPE IF EXISTS master_onboarding_step;
```

- [ ] **Step 3: Apply migration**

Run: `cd backend && go run ./cmd/migrate up` (or project's canonical command).
Expected: `000043` applied.

- [ ] **Step 4: Spot-check**

```sql
SELECT
  COUNT(*) FILTER (WHERE published_at IS NOT NULL AND onboarding_step IS NULL) AS published_no_step,
  COUNT(*) FILTER (WHERE published_at IS NULL AND onboarding_step IS NOT NULL) AS unpublished_with_step
FROM master_profiles;
```

Expected: `published_no_step = 0`. `unpublished_with_step` may be 0 (no existing rows match this state pre-feature).

- [ ] **Step 5: Commit**

```bash
git add backend/migrations/000043_master_profiles_onboarding_step.up.sql \
        backend/migrations/000043_master_profiles_onboarding_step.down.sql
git commit -m "feat(db): add onboarding_step enum to master_profiles"
```

### Task 3: Update `MasterProfile` GORM struct

**Files:**
- Modify: `backend/internal/infrastructure/persistence/model/models.go:125-139`

- [ ] **Step 1: Add fields**

Replace the struct (lines 125-139) with:

```go
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
	PublishedAt       *time.Time     `gorm:"column:published_at"`
	OnboardingStep    *string        `gorm:"column:onboarding_step"`
	CreatedAt         time.Time      `gorm:"column:created_at;not null;autoCreateTime"`
	UpdatedAt         time.Time      `gorm:"column:updated_at;not null;autoUpdateTime"`
}
```

- [ ] **Step 2: Build**

Run: `cd backend && go build ./...`
Expected: no errors.

- [ ] **Step 3: Run all existing tests**

Run: `cd backend && go test ./...`
Expected: all pass — adding new optional GORM fields is non-breaking.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/infrastructure/persistence/model/models.go
git commit -m "feat(model): add PublishedAt and OnboardingStep to MasterProfile"
```

---

## Phase 2 — Public-side gating

### Task 4: Filter shadow profiles in `GetMasterProfilePublic`

**Files:**
- Modify: `backend/internal/infrastructure/persistence/master_public_repository.go:135-147`
- Test: `backend/internal/infrastructure/persistence/master_public_repository_test.go` (new — if no existing repo test setup, add a minimal one; check the project for existing patterns first)

- [ ] **Step 1: Update SQL filter**

In `master_public_repository.go`, locate the query in `GetMasterProfilePublic` (around line 137-142). Replace:

```go
err := r.db.WithContext(ctx).Raw(`
    SELECT id, display_name, bio, specializations, avatar_url, years_experience,
        cached_rating, cached_review_count
    FROM master_profiles
    WHERE id = ? AND is_active = true
`, masterProfileID).Scan(&prof).Error
```

with:

```go
err := r.db.WithContext(ctx).Raw(`
    SELECT id, display_name, bio, specializations, avatar_url, years_experience,
        cached_rating, cached_review_count
    FROM master_profiles
    WHERE id = ? AND is_active = true AND published_at IS NOT NULL
`, masterProfileID).Scan(&prof).Error
```

- [ ] **Step 2: Build**

Run: `cd backend && go build ./...`
Expected: no errors.

- [ ] **Step 3: Manual integration check (DB-backed)**

Insert two test profiles and call `GET /api/v1/masters/:id` for each:

```sql
-- via psql or migration test fixture
INSERT INTO master_profiles (id, display_name, is_active, published_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'Published Test', true, now());
INSERT INTO master_profiles (id, display_name, is_active, published_at)
VALUES ('22222222-2222-2222-2222-222222222222', 'Shadow Test', true, NULL);
```

Run server and request:
- `curl http://localhost:8080/api/v1/masters/11111111-1111-1111-1111-111111111111` → 200 with body
- `curl http://localhost:8080/api/v1/masters/22222222-2222-2222-2222-222222222222` → 404 (not found)

Cleanup: `DELETE FROM master_profiles WHERE id IN ('11111111-...', '22222222-...');`

- [ ] **Step 4: Run all tests**

Run: `cd backend && go test ./...`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/infrastructure/persistence/master_public_repository.go
git commit -m "feat(masters): hide unpublished profiles from /api/v1/masters/:id"
```

### Task 5: Add `IsPublished` to public salon-masters listing

**Files:**
- Modify: `backend/internal/repository/master_public.go:11-23` — `SalonMasterPublicRow`
- Modify: `backend/internal/infrastructure/persistence/master_public_repository.go:36-110` — extend SQL + scan + row population
- Modify: `backend/internal/service/master_public.go:12-20` — `MasterProfilePublicNested` adds `IsPublished`
- Modify: `backend/internal/service/master_public.go` — service mapper populates `IsPublished` from row

- [ ] **Step 1: Add field to `SalonMasterPublicRow`**

In `backend/internal/repository/master_public.go`, replace `SalonMasterPublicRow` struct (lines 11-23) with:

```go
type SalonMasterPublicRow struct {
	SalonMasterID uuid.UUID
	DisplayName   string
	Color         *string
	MasterID      *uuid.UUID
	ProfileID     *uuid.UUID
	Bio           *string
	Specs         []string
	AvatarURL     *string
	YearsExp      *int
	CachedRating  *float64
	CachedReviews int
	IsPublished   bool
}
```

- [ ] **Step 2: Update SQL + scan struct + population in repo**

In `master_public_repository.go`, find `salonMasterPublicScan` definition (search for `salonMasterPublicScan` near the top of the file) and add `MPPublishedAt *time.Time \`gorm:"column:mp_published_at"\`` to it.

Then in `ListSalonMastersPublic`, replace the SELECT to include `mp.published_at AS mp_published_at`:

```go
err := r.db.WithContext(ctx).Raw(`
    SELECT
        sm.id AS sm_id,
        sm.display_name AS sm_display_name,
        sm.color AS sm_color,
        sm.master_id AS sm_master_id,
        mp.id AS mp_id,
        mp.bio AS mp_bio,
        mp.specializations AS mp_specs,
        mp.avatar_url AS mp_avatar,
        mp.years_experience AS mp_years,
        mp.cached_rating AS mp_rating,
        mp.cached_review_count AS mp_rev_count,
        mp.published_at AS mp_published_at
    FROM salon_masters sm
    LEFT JOIN master_profiles mp ON mp.id = sm.master_id AND mp.is_active = true
    WHERE sm.salon_id = ?
        AND sm.status = 'active'
        AND sm.is_active = true
    ORDER BY sm.display_name ASC
`, salonID).Scan(&scans).Error
```

In the row-population loop (where `s.MPID != nil` block lives), add at the end of the `if s.MPID != nil { ... }` block:

```go
row.IsPublished = s.MPPublishedAt != nil
```

(Outside the `if`, leave `IsPublished` as zero-value `false` — correct for masters with no master_profile linked.)

- [ ] **Step 3: Find scan struct exact name and update it**

The scan struct lives near the top of `master_public_repository.go`. Find it via:

```bash
grep -n "salonMasterPublicScan\|type .*Scan struct" backend/internal/infrastructure/persistence/master_public_repository.go
```

Add field `MPPublishedAt *time.Time \`gorm:"column:mp_published_at"\`` to the appropriate scan struct.

- [ ] **Step 4: Add `IsPublished` to service DTO**

In `backend/internal/service/master_public.go`, replace `MasterProfilePublicNested` (lines 11-20) with:

```go
type MasterProfilePublicNested struct {
	ID                uuid.UUID `json:"id"`
	Bio               *string   `json:"bio"`
	Specializations   []string  `json:"specializations"`
	AvatarURL         *string   `json:"avatarUrl"`
	YearsExperience   *int      `json:"yearsExperience"`
	CachedRating      *float64  `json:"cachedRating"`
	CachedReviewCount int       `json:"cachedReviewCount"`
	IsPublished       bool      `json:"isPublished"`
}
```

- [ ] **Step 5: Populate `IsPublished` in mapper**

Search the service file for where `MasterProfile` field is populated on `SalonMasterPublicDTO`:

```bash
grep -n "MasterProfile.*=.*\\&MasterProfilePublicNested\\|MasterProfile: &MasterProfile" backend/internal/service/master_public.go
```

Add `IsPublished: row.IsPublished,` to the `MasterProfilePublicNested{...}` literal in that mapper.

- [ ] **Step 6: Build**

Run: `cd backend && go build ./...`
Expected: no errors.

- [ ] **Step 7: Run all tests**

Run: `cd backend && go test ./...`
Expected: all pass.

- [ ] **Step 8: Manual integration check**

Hit `GET /api/v1/salons/<some salon id>/masters` — confirm response contains `isPublished` boolean on each `masterProfile` nested object.

- [ ] **Step 9: Commit**

```bash
git add backend/internal/repository/master_public.go \
        backend/internal/infrastructure/persistence/master_public_repository.go \
        backend/internal/service/master_public.go
git commit -m "feat(masters): expose isPublished on salon masters public list"
```

---

## Phase 3 — Cabinet DTO + repository methods

### Task 6: Extend `MasterProfileCabinetDTO`

**Files:**
- Modify: `backend/internal/service/master_dashboard.go:141-149`
- Modify: `backend/internal/service/master_dashboard.go` — `MyProfile` mapper populates new fields

- [ ] **Step 1: Add fields to DTO**

Replace `MasterProfileCabinetDTO` (lines 141-149) with:

```go
type MasterProfileCabinetDTO struct {
	ID              uuid.UUID `json:"id"`
	DisplayName     string    `json:"displayName"`
	Bio             *string   `json:"bio,omitempty"`
	Specializations []string  `json:"specializations"`
	YearsExperience *int      `json:"yearsExperience,omitempty"`
	AvatarURL       *string   `json:"avatarUrl,omitempty"`
	PhoneE164       string    `json:"phoneE164"`
	PublishedAt     *time.Time `json:"publishedAt,omitempty"`
	OnboardingStep  *string   `json:"onboardingStep,omitempty"`
}
```

- [ ] **Step 2: Locate `MyProfile` mapper**

Run:

```bash
grep -n "func.*MyProfile\|MasterProfileCabinetDTO{" backend/internal/service/master_dashboard.go
```

Find the literal `MasterProfileCabinetDTO{...}` inside the `MyProfile` method body. Add `PublishedAt: mp.PublishedAt,` and `OnboardingStep: mp.OnboardingStep,` (use the GORM struct's pointer fields — see Task 3 model).

- [ ] **Step 3: Build**

Run: `cd backend && go build ./...`
Expected: no errors.

- [ ] **Step 4: Run tests**

Run: `cd backend && go test ./...`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/service/master_dashboard.go
git commit -m "feat(master-cabinet): expose publishedAt and onboardingStep in cabinet DTO"
```

### Task 7: Repository methods for self-onboarding

**Files:**
- Modify: `backend/internal/repository/master_dashboard.go` — interface
- Modify: `backend/internal/infrastructure/persistence/master_dashboard_repository.go` — implementations

- [ ] **Step 1: Add interface methods**

In `backend/internal/repository/master_dashboard.go`, find the `MasterDashboardRepository` interface and append the following methods:

```go
// LoadByUserID returns the master_profiles row for this user, or nil if absent.
LoadByUserID(ctx context.Context, userID uuid.UUID) (*model.MasterProfile, error)

// CreateOwnedProfile inserts a new claimed master_profiles row for this user.
// Returns the created row with ID populated.
CreateOwnedProfile(ctx context.Context, userID uuid.UUID, displayName string, phone *string) (*model.MasterProfile, error)

// AdvanceOnboardingStep moves onboarding_step forward to the requested value
// only if it would be a forward move (or current is NULL). Never regresses.
// Returns the resulting step (string form).
AdvanceOnboardingStep(ctx context.Context, profileID uuid.UUID, target string) (string, error)

// PublishProfile sets published_at = COALESCE(published_at, now()) and
// onboarding_step = 'completed'. Idempotent.
// Returns the resulting publishedAt and step.
PublishProfile(ctx context.Context, profileID uuid.UUID) (publishedAt time.Time, step string, err error)
```

(Make sure imports include `time` and the persistence model package — match style of existing methods in the file.)

- [ ] **Step 2: Implement `LoadByUserID`**

In `master_dashboard_repository.go`, add:

```go
func (r *masterDashboardRepository) LoadByUserID(ctx context.Context, userID uuid.UUID) (*model.MasterProfile, error) {
	var mp model.MasterProfile
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND is_active = true", userID).
		First(&mp).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &mp, nil
}
```

- [ ] **Step 3: Implement `CreateOwnedProfile`**

```go
func (r *masterDashboardRepository) CreateOwnedProfile(ctx context.Context, userID uuid.UUID, displayName string, phone *string) (*model.MasterProfile, error) {
	step := "profile"
	mp := &model.MasterProfile{
		ID:             uuid.New(),
		UserID:         &userID,
		DisplayName:    displayName,
		PhoneE164:      phone,
		IsActive:       true,
		OnboardingStep: &step,
	}
	if err := r.db.WithContext(ctx).Create(mp).Error; err != nil {
		return nil, err
	}
	return mp, nil
}
```

- [ ] **Step 4: Implement `AdvanceOnboardingStep`**

```go
// step ordering: profile=0, specializations=1, services=2, schedule=3, completed=4
var onboardingStepOrder = map[string]int{
	"profile": 0, "specializations": 1, "services": 2, "schedule": 3, "completed": 4,
}

func (r *masterDashboardRepository) AdvanceOnboardingStep(ctx context.Context, profileID uuid.UUID, target string) (string, error) {
	if _, ok := onboardingStepOrder[target]; !ok {
		return "", fmt.Errorf("invalid onboarding step: %s", target)
	}
	var current sql.NullString
	if err := r.db.WithContext(ctx).Raw(`
		SELECT onboarding_step::text FROM master_profiles WHERE id = ?
	`, profileID).Scan(&current).Error; err != nil {
		return "", err
	}
	currentRank := -1
	if current.Valid {
		currentRank = onboardingStepOrder[current.String]
	}
	if onboardingStepOrder[target] > currentRank {
		if err := r.db.WithContext(ctx).Exec(`
			UPDATE master_profiles SET onboarding_step = ?::master_onboarding_step WHERE id = ?
		`, target, profileID).Error; err != nil {
			return "", err
		}
		return target, nil
	}
	if current.Valid {
		return current.String, nil
	}
	return target, nil
}
```

Add imports: `"database/sql"`, `"fmt"`.

- [ ] **Step 5: Implement `PublishProfile`**

```go
func (r *masterDashboardRepository) PublishProfile(ctx context.Context, profileID uuid.UUID) (time.Time, string, error) {
	var resp struct {
		PublishedAt time.Time `gorm:"column:published_at"`
		Step        string    `gorm:"column:onboarding_step"`
	}
	err := r.db.WithContext(ctx).Raw(`
		UPDATE master_profiles
		   SET published_at = COALESCE(published_at, now()),
		       onboarding_step = 'completed'
		 WHERE id = ?
		 RETURNING published_at, onboarding_step::text AS onboarding_step
	`, profileID).Scan(&resp).Error
	if err != nil {
		return time.Time{}, "", err
	}
	return resp.PublishedAt, resp.Step, nil
}
```

- [ ] **Step 6: Build**

Run: `cd backend && go build ./...`
Expected: no errors.

- [ ] **Step 7: Run tests**

Run: `cd backend && go test ./...`
Expected: pass (no behavior change for existing callers; new methods covered in Task 8).

- [ ] **Step 8: Commit**

```bash
git add backend/internal/repository/master_dashboard.go \
        backend/internal/infrastructure/persistence/master_dashboard_repository.go
git commit -m "feat(master-onboarding): repository methods for create/advance/publish"
```

---

## Phase 4 — Service & controller (TDD)

### Task 8: `MasterOnboardingService.Start` (TDD)

**Files:**
- Create: `backend/internal/service/master_onboarding.go`
- Create: `backend/internal/service/master_onboarding_test.go`

- [ ] **Step 1: Define service interface and DTO**

`backend/internal/service/master_onboarding.go` (new file):

```go
package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/beauty-marketplace/backend/internal/repository"
	"github.com/google/uuid"
)

// MasterOnboardingService orchestrates the self-service path for becoming a master.
type MasterOnboardingService interface {
	Start(ctx context.Context, userID uuid.UUID) (*StartResult, error)
	AdvanceStep(ctx context.Context, userID uuid.UUID, target string) (string, error)
	Publish(ctx context.Context, userID uuid.UUID) (*PublishResult, error)
}

// StartResult describes the outcome of POST /me/master-onboarding/start.
type StartResult struct {
	MasterProfileID uuid.UUID `json:"masterProfileId"`
	Status          string    `json:"status"`         // "existing" | "claimed" | "created"
	OnboardingStep  *string   `json:"onboardingStep,omitempty"`
	Redirect        string    `json:"redirect"`
}

// PublishResult describes the outcome of POST /master-dashboard/publish.
type PublishResult struct {
	MasterProfileID uuid.UUID `json:"masterProfileId"`
	PublishedAt     time.Time `json:"publishedAt"`
	OnboardingStep  string    `json:"onboardingStep"`
}

// ValidationError is returned by Publish when required fields are missing.
type ValidationError struct {
	Fields []string
}

func (e *ValidationError) Error() string {
	return "missing_required: " + strings.Join(e.Fields, ",")
}

// ErrShadowRace is returned if a shadow profile race is detected during claim.
var ErrShadowRace = errors.New("phone_conflict")

type masterOnboardingService struct {
	repo     repository.MasterDashboardRepository
	authRepo repository.AuthRepository
}

// NewMasterOnboardingService constructs the service.
func NewMasterOnboardingService(
	repo repository.MasterDashboardRepository,
	authRepo repository.AuthRepository,
) MasterOnboardingService {
	return &masterOnboardingService{repo: repo, authRepo: authRepo}
}
```

(Verify `repository.AuthRepository` has a `GetUserByID` or similar method by running `grep -n "AuthRepository\|GetUserByID" backend/internal/repository/auth.go`. If the method name differs, replace `authRepo` calls below accordingly.)

- [ ] **Step 2: Write failing test for `Start` — A0 case**

`backend/internal/service/master_onboarding_test.go`:

```go
package service_test

import (
	"context"
	"testing"

	"github.com/beauty-marketplace/backend/internal/service"
	"github.com/google/uuid"
)

// Note: this test uses the project's existing test helpers for in-memory
// repositories or a sqlite-backed test DB. If the project uses a specific
// pattern (mocks via interfaces, real DB via testcontainers, etc.),
// follow that pattern instead of the placeholder below.

func TestStart_NoProfile_CreatesNew(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	deps := newTestOnboardingDeps(t)
	user := deps.createUser(t, "+70000000001")

	res, err := deps.svc.Start(ctx, user.ID)
	if err != nil {
		t.Fatalf("Start: %v", err)
	}
	if res.Status != "created" {
		t.Errorf("status = %q, want created", res.Status)
	}
	if res.MasterProfileID == uuid.Nil {
		t.Error("master profile id should be set")
	}
	if res.Redirect != "/master-onboarding" {
		t.Errorf("redirect = %q, want /master-onboarding", res.Redirect)
	}
}
```

`newTestOnboardingDeps` is a helper to be created — this matches whatever fixture style the project's existing service tests use. Inspect `backend/internal/service/*_test.go` first via `ls backend/internal/service/*_test.go` and follow the same pattern. If the project uses GORM with `sqlite` for tests, set up a test DB with both migrations 000042 and 000043 applied.

- [ ] **Step 3: Run failing test**

Run: `cd backend && go test ./internal/service/ -run TestStart_NoProfile_CreatesNew -v`
Expected: FAIL because `Start` is not implemented.

- [ ] **Step 4: Implement `Start`**

In `master_onboarding.go`, add:

```go
func (s *masterOnboardingService) Start(ctx context.Context, userID uuid.UUID) (*StartResult, error) {
	// 1. Already a master? (A2)
	existing, err := s.repo.LoadByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return &StartResult{
			MasterProfileID: existing.ID,
			Status:          "existing",
			OnboardingStep:  existing.OnboardingStep,
			Redirect:        "/master-dashboard",
		}, nil
	}

	// Need user record (display name + phone) for A1 lookup and A0 INSERT.
	user, err := s.authRepo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("load user: %w", err)
	}

	// 2. Shadow profile by phone? (A1)
	if user.PhoneE164 != "" {
		shadowID, err := s.repo.FindShadowMasterProfileIDByPhone(ctx, user.PhoneE164)
		if err != nil {
			return nil, err
		}
		if shadowID != nil {
			if err := s.repo.ClaimMasterProfile(ctx, *shadowID, userID, user.PhoneE164); err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return nil, ErrShadowRace
				}
				return nil, err
			}
			step, err := s.repo.AdvanceOnboardingStep(ctx, *shadowID, "profile")
			if err != nil {
				return nil, err
			}
			return &StartResult{
				MasterProfileID: *shadowID,
				Status:          "claimed",
				OnboardingStep:  &step,
				Redirect:        "/master-onboarding",
			}, nil
		}
	}

	// 3. Create a new owned profile (A0)
	displayName := strings.TrimSpace(user.DisplayName)
	var phonePtr *string
	if user.PhoneE164 != "" {
		p := user.PhoneE164
		phonePtr = &p
	}
	mp, err := s.repo.CreateOwnedProfile(ctx, userID, displayName, phonePtr)
	if err != nil {
		return nil, err
	}
	return &StartResult{
		MasterProfileID: mp.ID,
		Status:          "created",
		OnboardingStep:  mp.OnboardingStep,
		Redirect:        "/master-onboarding",
	}, nil
}
```

Add imports: `"errors"`, `"gorm.io/gorm"`.

(If the project's `User` model has different field names — e.g. `DisplayName` may be called `Name` — adjust accordingly. Check via `grep -n "type User struct" backend/internal/infrastructure/persistence/model/models.go`.)

- [ ] **Step 5: Run test, expect pass**

Run: `cd backend && go test ./internal/service/ -run TestStart_NoProfile_CreatesNew -v`
Expected: PASS.

- [ ] **Step 6: Add A1 (shadow) and A2 (existing) tests**

Append to the test file:

```go
func TestStart_ShadowExists_ClaimsAndReturnsClaimed(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	deps := newTestOnboardingDeps(t)
	user := deps.createUser(t, "+70000000002")
	shadowID := deps.createShadowMasterProfile(t, "+70000000002")

	res, err := deps.svc.Start(ctx, user.ID)
	if err != nil {
		t.Fatalf("Start: %v", err)
	}
	if res.Status != "claimed" {
		t.Errorf("status = %q, want claimed", res.Status)
	}
	if res.MasterProfileID != shadowID {
		t.Errorf("master id mismatch — should reuse shadow")
	}
	if res.Redirect != "/master-onboarding" {
		t.Errorf("redirect = %q", res.Redirect)
	}
}

func TestStart_AlreadyMaster_ReturnsExisting(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	deps := newTestOnboardingDeps(t)
	user := deps.createUser(t, "+70000000003")
	existingID := deps.createOwnedMasterProfile(t, user.ID, "+70000000003")

	res, err := deps.svc.Start(ctx, user.ID)
	if err != nil {
		t.Fatalf("Start: %v", err)
	}
	if res.Status != "existing" {
		t.Errorf("status = %q, want existing", res.Status)
	}
	if res.MasterProfileID != existingID {
		t.Error("should return same profile id")
	}
	if res.Redirect != "/master-dashboard" {
		t.Errorf("redirect = %q", res.Redirect)
	}
}
```

`createShadowMasterProfile` and `createOwnedMasterProfile` are test fixture helpers. Add them to the `newTestOnboardingDeps` helper struct, matching the project's pattern.

- [ ] **Step 7: Run all `Start_*` tests**

Run: `cd backend && go test ./internal/service/ -run TestStart -v`
Expected: 3 tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/internal/service/master_onboarding.go backend/internal/service/master_onboarding_test.go
git commit -m "feat(master-onboarding): MasterOnboardingService.Start with A0/A1/A2 cases"
```

### Task 9: `MasterOnboardingService.AdvanceStep` (TDD)

**Files:**
- Modify: `backend/internal/service/master_onboarding.go`
- Modify: `backend/internal/service/master_onboarding_test.go`

- [ ] **Step 1: Write failing test**

Append to test file:

```go
func TestAdvanceStep_Monotonic_DoesNotRegress(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	deps := newTestOnboardingDeps(t)
	user := deps.createUser(t, "+70000000004")
	deps.createOwnedMasterProfile(t, user.ID, "+70000000004")

	if _, err := deps.svc.AdvanceStep(ctx, user.ID, "specializations"); err != nil {
		t.Fatalf("advance to specs: %v", err)
	}
	if _, err := deps.svc.AdvanceStep(ctx, user.ID, "services"); err != nil {
		t.Fatalf("advance to services: %v", err)
	}
	// Try to regress
	step, err := deps.svc.AdvanceStep(ctx, user.ID, "profile")
	if err != nil {
		t.Fatalf("regress attempt: %v", err)
	}
	if step != "services" {
		t.Errorf("step = %q, want services (no regression)", step)
	}
}
```

- [ ] **Step 2: Run failing test**

Run: `cd backend && go test ./internal/service/ -run TestAdvanceStep -v`
Expected: FAIL.

- [ ] **Step 3: Implement `AdvanceStep`**

In `master_onboarding.go`, add:

```go
func (s *masterOnboardingService) AdvanceStep(ctx context.Context, userID uuid.UUID, target string) (string, error) {
	mp, err := s.repo.LoadByUserID(ctx, userID)
	if err != nil {
		return "", err
	}
	if mp == nil {
		return "", errors.New("master profile required")
	}
	return s.repo.AdvanceOnboardingStep(ctx, mp.ID, target)
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `cd backend && go test ./internal/service/ -run TestAdvanceStep -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/service/master_onboarding.go backend/internal/service/master_onboarding_test.go
git commit -m "feat(master-onboarding): AdvanceStep monotonic state advance"
```

### Task 10: `MasterOnboardingService.Publish` (TDD)

**Files:**
- Modify: `backend/internal/service/master_onboarding.go`
- Modify: `backend/internal/service/master_onboarding_test.go`

- [ ] **Step 1: Write failing tests for missing fields**

Append to test file:

```go
func TestPublish_MissingDisplayName_Returns422(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	deps := newTestOnboardingDeps(t)
	user := deps.createUser(t, "+70000000005")
	// Profile created with empty display_name (override the default helper)
	deps.createOwnedMasterProfileWithOverrides(t, user.ID, "+70000000005", "", []string{"haircut"})

	_, err := deps.svc.Publish(ctx, user.ID)
	var verr *service.ValidationError
	if !errors.As(err, &verr) {
		t.Fatalf("expected ValidationError, got %v", err)
	}
	want := []string{"displayName"}
	if !equalStrings(verr.Fields, want) {
		t.Errorf("fields = %v, want %v", verr.Fields, want)
	}
}

func TestPublish_MissingSpecializations_Returns422(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	deps := newTestOnboardingDeps(t)
	user := deps.createUser(t, "+70000000006")
	deps.createOwnedMasterProfileWithOverrides(t, user.ID, "+70000000006", "Anna", nil /* empty specs */)

	_, err := deps.svc.Publish(ctx, user.ID)
	var verr *service.ValidationError
	if !errors.As(err, &verr) {
		t.Fatalf("expected ValidationError, got %v", err)
	}
	want := []string{"specializations"}
	if !equalStrings(verr.Fields, want) {
		t.Errorf("fields = %v, want %v", verr.Fields, want)
	}
}

func TestPublish_AlreadyPublished_NoOp(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	deps := newTestOnboardingDeps(t)
	user := deps.createUser(t, "+70000000007")
	deps.createOwnedMasterProfileWithOverrides(t, user.ID, "+70000000007", "Mira", []string{"nails"})

	first, err := deps.svc.Publish(ctx, user.ID)
	if err != nil {
		t.Fatalf("first publish: %v", err)
	}
	second, err := deps.svc.Publish(ctx, user.ID)
	if err != nil {
		t.Fatalf("second publish: %v", err)
	}
	if !first.PublishedAt.Equal(second.PublishedAt) {
		t.Error("publishedAt changed on idempotent re-publish")
	}
}

func equalStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
```

Add `import "errors"` if not already present.

`createOwnedMasterProfileWithOverrides` is a fixture helper that lets the test set custom `display_name` and `specializations`. Add it to the test deps helper.

- [ ] **Step 2: Run failing tests**

Run: `cd backend && go test ./internal/service/ -run TestPublish -v`
Expected: FAIL because `Publish` is not implemented.

- [ ] **Step 3: Implement `Publish`**

In `master_onboarding.go`, add:

```go
func (s *masterOnboardingService) Publish(ctx context.Context, userID uuid.UUID) (*PublishResult, error) {
	mp, err := s.repo.LoadByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if mp == nil {
		return nil, errors.New("master profile required")
	}

	missing := make([]string, 0, 2)
	if strings.TrimSpace(mp.DisplayName) == "" {
		missing = append(missing, "displayName")
	}
	if len(mp.Specializations) == 0 {
		missing = append(missing, "specializations")
	}
	if len(missing) > 0 {
		return nil, &ValidationError{Fields: missing}
	}

	publishedAt, step, err := s.repo.PublishProfile(ctx, mp.ID)
	if err != nil {
		return nil, err
	}
	return &PublishResult{
		MasterProfileID: mp.ID,
		PublishedAt:     publishedAt,
		OnboardingStep:  step,
	}, nil
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `cd backend && go test ./internal/service/ -run TestPublish -v`
Expected: 3 tests PASS.

- [ ] **Step 5: Run all onboarding-service tests**

Run: `cd backend && go test ./internal/service/ -v`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/service/master_onboarding.go backend/internal/service/master_onboarding_test.go
git commit -m "feat(master-onboarding): Publish with hard validation and idempotent COALESCE"
```

### Task 11: Controllers — `start`, `onboarding/step`, `publish`

**Files:**
- Modify: `backend/internal/controller/master_dashboard_controller.go`
- Modify: `backend/internal/controller/server.go`

- [ ] **Step 1: Add `MasterOnboardingService` to `MasterDashboardController`**

In `master_dashboard_controller.go`, find `MasterDashboardController` struct and constructor. Add field `onb service.MasterOnboardingService` and update the constructor signature:

```go
type MasterDashboardController struct {
	svc     service.MasterDashboardService
	onb     service.MasterOnboardingService
	storage service.FileStorage
	log     *zap.Logger
}

func NewMasterDashboardController(
	svc service.MasterDashboardService,
	onb service.MasterOnboardingService,
	storage service.FileStorage,
	log *zap.Logger,
) *MasterDashboardController {
	return &MasterDashboardController{svc: svc, onb: onb, storage: storage, log: log}
}
```

- [ ] **Step 2: Add `StartOnboarding` handler (for /me/master-onboarding/start)**

Append to the file:

```go
// StartOnboarding handles POST /api/v1/me/master-onboarding/start.
func (h *MasterDashboardController) StartOnboarding(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	res, err := h.onb.Start(r.Context(), userID)
	if err != nil {
		if errors.Is(err, service.ErrShadowRace) {
			jsonError(w, "phone_conflict", http.StatusConflict)
			return
		}
		h.log.Error("master onboarding start", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(res)
}
```

Add imports if missing: `"errors"`.

- [ ] **Step 3: Add `onboarding` and `publish` cases in `MasterDashboardRoutes`**

Find the switch on `parts[0]` (around line 120). Add two new cases (anywhere in the switch, e.g. before `default`):

```go
case "onboarding":
	if len(parts) == 2 && parts[1] == "step" && r.Method == http.MethodPost {
		var body struct {
			Step string `json:"step"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			jsonError(w, "invalid json", http.StatusBadRequest)
			return
		}
		step, err := h.onb.AdvanceStep(r.Context(), userID, body.Step)
		if err != nil {
			h.log.Error("master onboarding advance", zap.Error(err))
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"onboardingStep": step})
		return
	}
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	return
case "publish":
	if len(parts) == 1 && r.Method == http.MethodPost {
		res, err := h.onb.Publish(r.Context(), userID)
		if err != nil {
			var verr *service.ValidationError
			if errors.As(err, &verr) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnprocessableEntity)
				_ = json.NewEncoder(w).Encode(map[string]any{
					"error":  "missing_required",
					"fields": verr.Fields,
				})
				return
			}
			h.log.Error("master onboarding publish", zap.Error(err))
			jsonError(w, "internal error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(res)
		return
	}
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	return
```

Make sure `errors` is imported in this file too.

- [ ] **Step 4: Register the new HandleFunc in server.go**

In `backend/internal/controller/server.go`, locate line 75 (`mux.HandleFunc("POST /api/v1/me/avatar", ...)`). Right after it, add:

```go
mux.HandleFunc("POST /api/v1/me/master-onboarding/start", withCORS(auth.RequireAuth(jwtMgr, md.StartOnboarding)))
```

(`md` is the existing `MasterDashboardController` parameter — confirm via the surrounding context that this name matches.)

- [ ] **Step 5: Build**

Run: `cd backend && go build ./...`
Expected: no errors.

- [ ] **Step 6: Commit (Fx wiring still pending — see next task)**

```bash
git add backend/internal/controller/master_dashboard_controller.go \
        backend/internal/controller/server.go
git commit -m "feat(master-onboarding): controllers for start, onboarding/step, publish"
```

---

## Phase 5 — Fx wiring

### Task 12: Fx DI — wire `MasterOnboardingService`

**Files:**
- Modify: `backend/internal/app/app.go`

- [ ] **Step 1: Provide the service in Fx graph**

In `backend/internal/app/app.go`, locate the `fx.Provide(...)` block (line 68). Add the new service constructor:

```go
service.NewMasterOnboardingService,
```

Place it next to other `service.New*` lines. The Fx graph already provides `repository.MasterDashboardRepository` and `repository.AuthRepository` so the constructor signature from Task 8 will be satisfied.

- [ ] **Step 2: Build**

Run: `cd backend && go build ./...`
Expected: no errors.

- [ ] **Step 3: Run all backend tests**

Run: `cd backend && go test ./...`
Expected: all pass.

- [ ] **Step 4: Manual smoke test**

Start the server: `cd backend && go run ./cmd/api`. In another terminal:

```bash
# Acquire a JWT through your usual login flow. Then:
TOKEN=...
curl -s -X POST http://localhost:8080/api/v1/me/master-onboarding/start \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json"
# Expected: 200 with { masterProfileId, status, onboardingStep, redirect }
```

- [ ] **Step 5: Commit**

```bash
git add backend/internal/app/app.go
git commit -m "feat(master-onboarding): wire MasterOnboardingService into Fx"
```

---

## Phase 6 — Frontend security fix (open-redirect)

### Task 13: `safeRelativePath` helper + apply in `OtpStep` and `LoginPage`

**Files:**
- Create: `frontend/src/shared/lib/safeRedirect.ts`
- Modify: `frontend/src/features/auth-by-phone/ui/OtpStep.tsx:46`
- Modify: `frontend/src/pages/login/ui/LoginPage.tsx:26`

- [ ] **Step 1: Create helper**

`frontend/src/shared/lib/safeRedirect.ts`:

```ts
/**
 * Returns input only if it is a same-origin relative path that starts with a
 * single "/". Otherwise returns the fallback. Guards against open-redirect:
 *   - "//evil.com" → fallback (protocol-relative)
 *   - "http://..." → fallback
 *   - "javascript:..." → fallback
 *   - "" / null → fallback
 */
export function safeRelativePath(input: string | null | undefined, fallback: string): string {
  if (typeof input !== 'string' || input.length === 0) return fallback
  let decoded: string
  try {
    decoded = decodeURIComponent(input)
  } catch {
    return fallback
  }
  if (!decoded.startsWith('/')) return fallback
  if (decoded.startsWith('//')) return fallback
  if (decoded.startsWith('/\\')) return fallback
  return decoded
}
```

- [ ] **Step 2: Apply in `OtpStep.tsx`**

In `frontend/src/features/auth-by-phone/ui/OtpStep.tsx`, replace line 46:

```diff
- navigate(returnTo || ROUTES.HOME)
+ navigate(safeRelativePath(returnTo, ROUTES.HOME))
```

Add import at top of file:

```ts
import { safeRelativePath } from '@shared/lib/safeRedirect'
```

- [ ] **Step 3: Apply in `LoginPage.tsx`**

In `frontend/src/pages/login/ui/LoginPage.tsx`, replace line 26:

```diff
- onClick={() => navigate(returnTo ? decodeURIComponent(returnTo) : ROUTES.HOME)}
+ onClick={() => navigate(safeRelativePath(returnTo, ROUTES.HOME))}
```

Add import:

```ts
import { safeRelativePath } from '@shared/lib/safeRedirect'
```

- [ ] **Step 4: Lint**

Run: `cd frontend && npm run lint`
Expected: pass.

- [ ] **Step 5: Quick browser sanity check**

Start dev server: `cd frontend && npm run dev`. Visit:
- `http://localhost:5173/login?returnTo=//evil.com` → click back arrow, should go to `/` (HOME), NOT `//evil.com`.
- `http://localhost:5173/login?returnTo=%2Fme` → after OTP login, should go to `/me`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/lib/safeRedirect.ts \
        frontend/src/features/auth-by-phone/ui/OtpStep.tsx \
        frontend/src/pages/login/ui/LoginPage.tsx
git commit -m "fix(auth): validate returnTo as same-origin relative path"
```

---

## Phase 7 — Frontend types + simple UI changes

### Task 14: Add `isPublished` to TS public-master types

**Files:**
- Modify: TS files mirroring `MasterProfilePublicNested` and consumers (path TBD by inspection)

- [ ] **Step 1: Find the TS definition**

Run:

```bash
grep -rn "masterProfile.*\\?\\:.*\\|MasterProfilePublicNested\\|cachedReviewCount" frontend/src/entities/master/ frontend/src/entities/salon/ 2>/dev/null | head -20
```

Identify the file(s) where the salon-master public DTO type lives.

- [ ] **Step 2: Add `isPublished: boolean` field**

In whichever file defines the nested master-profile type for salon master listings (most likely `frontend/src/entities/salon/model/types.ts` or `frontend/src/entities/master/model/types.ts`), find the type matching backend's `MasterProfilePublicNested` (has `cachedReviewCount`, `specializations`, etc.) and add:

```ts
isPublished: boolean
```

If the project uses RTK Query response types, also update the response interface there.

- [ ] **Step 3: Build**

Run: `cd frontend && npm run build`
Expected: no TS errors. If TS strict mode complains about missing `isPublished` in test fixtures or mocks, update those too.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/entities/...
git commit -m "feat(types): add isPublished to public master profile type"
```

### Task 15: Hide "Профиль мастера" button on `SalonPage` for shadow profiles

**Files:**
- Modify: `frontend/src/pages/salon/ui/SalonPage.tsx:443-447`

- [ ] **Step 1: Update render condition**

Replace lines 443-447 with:

```tsx
{m.masterProfile?.id && m.masterProfile?.isPublished && (
  <Button onClick={() => navigate(masterPath(m.masterProfile!.id))}>
    Профиль мастера
  </Button>
)}
```

- [ ] **Step 2: Lint + build**

Run: `cd frontend && npm run lint && npm run build`
Expected: pass.

- [ ] **Step 3: Manual check**

Start frontend + backend. Open a salon page that has at least one shadow master and one published master. Confirm:
- Published master → "Профиль мастера" button shown.
- Shadow master → button NOT shown.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/salon/ui/SalonPage.tsx
git commit -m "feat(salon): hide master profile button for unpublished masters"
```

---

## Phase 8 — Frontend wizard

### Task 16: Routes + RTK Query slice

**Files:**
- Modify: `frontend/src/shared/config/routes.ts`
- Modify: `frontend/src/app/App.tsx`
- Create: `frontend/src/entities/master-onboarding/api/masterOnboardingApi.ts`
- Create: `frontend/src/entities/master-onboarding/index.ts`

- [ ] **Step 1: Add routes**

In `frontend/src/shared/config/routes.ts`, add inside the `ROUTES` object:

```ts
MASTER_ONBOARDING: '/master-onboarding',
MASTER_ONBOARDING_START: '/master-onboarding/start',
```

- [ ] **Step 2: Wire routes in `App.tsx`**

In `frontend/src/app/App.tsx`, add imports:

```ts
import { MasterOnboardingStartBridge } from '@pages/master-onboarding/ui/MasterOnboardingStartBridge'
import { MasterOnboardingWizard } from '@pages/master-onboarding/ui/MasterOnboardingWizard'
```

Add the routes (inside `<Routes>...</Routes>`):

```tsx
<Route path={ROUTES.MASTER_ONBOARDING_START} element={<RequireAuth><MasterOnboardingStartBridge /></RequireAuth>} />
<Route path={ROUTES.MASTER_ONBOARDING} element={<RequireAuth><MasterOnboardingWizard /></RequireAuth>} />
```

(Component imports will fail-build at this step. We will add components in Tasks 17–22; intermediate commits will live on a feature branch.)

- [ ] **Step 3: Create the RTK Query slice**

`frontend/src/entities/master-onboarding/api/masterOnboardingApi.ts`:

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export type StartResult = {
  masterProfileId: string
  status: 'existing' | 'claimed' | 'created'
  onboardingStep?: string | null
  redirect: string
}

export type PublishResult = {
  masterProfileId: string
  publishedAt: string
  onboardingStep: string
}

export const masterOnboardingApi = createApi({
  reducerPath: 'masterOnboardingApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('accessToken') // adapt to project's auth pattern
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),
  endpoints: (build) => ({
    startMasterOnboarding: build.mutation<StartResult, void>({
      query: () => ({ url: '/me/master-onboarding/start', method: 'POST' }),
    }),
    advanceMasterOnboardingStep: build.mutation<{ onboardingStep: string }, { step: string }>({
      query: (body) => ({ url: '/master-dashboard/onboarding/step', method: 'POST', body }),
    }),
    publishMasterProfile: build.mutation<PublishResult, void>({
      query: () => ({ url: '/master-dashboard/publish', method: 'POST' }),
    }),
  }),
})

export const {
  useStartMasterOnboardingMutation,
  useAdvanceMasterOnboardingStepMutation,
  usePublishMasterProfileMutation,
} = masterOnboardingApi
```

(Adapt `prepareHeaders` to the project's existing auth pattern — check how other RTK Query slices handle the token, e.g. `frontend/src/entities/staff/model/staffApi.ts`.)

- [ ] **Step 4: Register the slice in store**

Run:

```bash
grep -n "reducerPath\|reducer:\|configureStore" frontend/src/app/store.ts
```

Add `[masterOnboardingApi.reducerPath]: masterOnboardingApi.reducer` to the `reducer` map and `.concat(masterOnboardingApi.middleware)` to the middleware chain. Match existing patterns.

- [ ] **Step 5: Re-export**

`frontend/src/entities/master-onboarding/index.ts`:

```ts
export * from './api/masterOnboardingApi'
```

- [ ] **Step 6: Lint**

Run: `cd frontend && npm run lint`
Expected: pass (build will fail until Tasks 17–22 are done; that's OK on a feature branch).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/config/routes.ts frontend/src/app/App.tsx \
        frontend/src/entities/master-onboarding/ frontend/src/app/store.ts
git commit -m "feat(master-onboarding): routes and RTK Query slice"
```

### Task 17: `MasterOnboardingStartBridge`

**Files:**
- Create: `frontend/src/pages/master-onboarding/ui/MasterOnboardingStartBridge.tsx`

- [ ] **Step 1: Implement bridge component**

```tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useStartMasterOnboardingMutation } from '@entities/master-onboarding'
import { safeRelativePath } from '@shared/lib/safeRedirect'
import { ROUTES } from '@shared/config/routes'

export function MasterOnboardingStartBridge() {
  const navigate = useNavigate()
  const [start] = useStartMasterOnboardingMutation()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await start().unwrap()
        if (cancelled) return
        navigate(safeRelativePath(res.redirect, ROUTES.MASTER_ONBOARDING), { replace: true })
      } catch {
        if (cancelled) return
        navigate(ROUTES.HOME, { replace: true })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [start, navigate])

  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  )
}
```

- [ ] **Step 2: Lint**

Run: `cd frontend && npm run lint`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/master-onboarding/ui/MasterOnboardingStartBridge.tsx
git commit -m "feat(master-onboarding): start bridge component"
```

### Task 18: Wizard root + `StepProfile`

**Files:**
- Create: `frontend/src/pages/master-onboarding/ui/MasterOnboardingWizard.tsx`
- Create: `frontend/src/pages/master-onboarding/ui/StepProfile.tsx`
- Create: `frontend/src/pages/master-onboarding/index.ts`

- [ ] **Step 1: Create wizard root**

`MasterOnboardingWizard.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, MobileStepper, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@shared/config/routes'
// useGetMasterDashboardProfileQuery — adapt to whatever the project uses for
// /api/v1/master-dashboard/profile. If a hook does not exist, write a thin
// fetch via the existing master-dashboard api slice.
import { useGetMasterDashboardProfileQuery } from '@entities/master/api/masterDashboardApi'
import { StepProfile } from './StepProfile'
import { StepSpecializations } from './StepSpecializations'
import { StepServices } from './StepServices'
import { StepSchedule } from './StepSchedule'
import { StepPublish } from './StepPublish'

const STEP_ORDER = ['profile', 'specializations', 'services', 'schedule', 'publish'] as const
type StepName = (typeof STEP_ORDER)[number]

export function MasterOnboardingWizard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: profile, isLoading } = useGetMasterDashboardProfileQuery()
  const [step, setStep] = useState<number>(0)

  useEffect(() => {
    if (!profile) return
    if (profile.onboardingStep === 'completed') {
      navigate(ROUTES.MASTER_DASHBOARD ?? '/master-dashboard', { replace: true })
      return
    }
    const ix = profile.onboardingStep ? STEP_ORDER.indexOf(profile.onboardingStep as StepName) : 0
    setStep(ix >= 0 ? ix : 0)
  }, [profile, navigate])

  if (isLoading || !profile) {
    return null
  }

  const handleNext = () => setStep((s) => Math.min(s + 1, STEP_ORDER.length - 1))
  const handleBack = () => setStep((s) => Math.max(s - 1, 0))
  const handleFinish = () => navigate(ROUTES.MASTER_DASHBOARD ?? '/master-dashboard', { replace: true })

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <Box sx={{ maxWidth: 560, mx: 'auto', px: 2, py: 5 }}>
        <Typography variant="h5" sx={{ fontFamily: "'Fraunces', serif", mb: 0.5 }}>
          {t('masterOnboarding.title')}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {t('masterOnboarding.stepLabel', { current: step + 1, total: STEP_ORDER.length })}
        </Typography>
        <MobileStepper
          variant="dots"
          steps={STEP_ORDER.length}
          activeStep={step}
          position="static"
          sx={{ mb: 3, bgcolor: 'transparent', p: 0 }}
          nextButton={null}
          backButton={null}
        />
        <Stack gap={2}>
          {step === 0 && <StepProfile profile={profile} onNext={handleNext} />}
          {step === 1 && <StepSpecializations profile={profile} onNext={handleNext} onBack={handleBack} />}
          {step === 2 && <StepServices onNext={handleNext} onBack={handleBack} />}
          {step === 3 && <StepSchedule onNext={handleNext} onBack={handleBack} />}
          {step === 4 && <StepPublish profile={profile} onPublished={handleFinish} onBack={handleBack} />}
        </Stack>
      </Box>
    </Box>
  )
}
```

- [ ] **Step 2: Create `StepProfile.tsx`**

```tsx
import { useState } from 'react'
import { Button, Stack, TextField, Typography, Alert } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  useAdvanceMasterOnboardingStepMutation,
} from '@entities/master-onboarding'
// useUpdateMasterDashboardProfileMutation adapts to existing master-dashboard
// api hook (PUT /api/v1/master-dashboard/profile). Verify exact name via grep.
import { useUpdateMasterDashboardProfileMutation } from '@entities/master/api/masterDashboardApi'

type Props = {
  profile: { displayName: string; bio?: string | null; avatarUrl?: string | null }
  onNext: () => void
}

export function StepProfile({ profile, onNext }: Props) {
  const { t } = useTranslation()
  const [displayName, setDisplayName] = useState(profile.displayName ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [updateProfile, { isLoading: saving }] = useUpdateMasterDashboardProfileMutation()
  const [advance] = useAdvanceMasterOnboardingStepMutation()
  const [error, setError] = useState<string | null>(null)

  const handleNext = async () => {
    setError(null)
    if (!displayName.trim()) {
      setError(t('masterOnboarding.errors.missingDisplayName'))
      return
    }
    try {
      await updateProfile({ displayName: displayName.trim(), bio: bio.trim() || null }).unwrap()
      await advance({ step: 'specializations' }).unwrap()
      onNext()
    } catch {
      setError(t('masterOnboarding.errors.saveFailed'))
    }
  }

  return (
    <Stack gap={2}>
      <Typography variant="subtitle1">{t('masterOnboarding.steps.profile.title')}</Typography>
      <TextField
        label={t('masterOnboarding.steps.profile.displayNameLabel')}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        fullWidth
        required
      />
      <TextField
        label={t('masterOnboarding.steps.profile.bioLabel')}
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        multiline
        rows={3}
        fullWidth
      />
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" gap={1.5}>
        <Button variant="contained" sx={{ flex: 1 }} disabled={saving} onClick={handleNext}>
          {t('masterOnboarding.actions.next')}
        </Button>
      </Stack>
    </Stack>
  )
}
```

- [ ] **Step 3: Create `index.ts`**

```ts
export { MasterOnboardingWizard } from './ui/MasterOnboardingWizard'
export { MasterOnboardingStartBridge } from './ui/MasterOnboardingStartBridge'
```

- [ ] **Step 4: Lint**

Run: `cd frontend && npm run lint`
Expected: pass (other step components stub-imported but not yet defined will fail import — accept this for now; rest will be added in Tasks 19–22).

If lint blocks on missing imports, temporarily comment out the imports for `StepSpecializations`/`StepServices`/`StepSchedule`/`StepPublish` and the corresponding cases. Restore them as those tasks complete.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/master-onboarding/
git commit -m "feat(master-onboarding): wizard root and StepProfile"
```

### Task 19: `StepSpecializations`

**Files:**
- Create: `frontend/src/pages/master-onboarding/ui/StepSpecializations.tsx`

- [ ] **Step 1: Implement step**

```tsx
import { useEffect, useState } from 'react'
import { Alert, Box, Button, FormControl, InputLabel, ListItemText, MenuItem, Select, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAdvanceMasterOnboardingStepMutation } from '@entities/master-onboarding'
// Adapt to existing hooks; if these don't exist by these names, look up
// /api/v1/master-dashboard/service-categories and PUT /profile in the
// project's master-dashboard api slice and use them.
import { useGetMasterServiceCategoriesQuery, useUpdateMasterDashboardProfileMutation } from '@entities/master/api/masterDashboardApi'

type Props = {
  profile: { specializations: string[] }
  onNext: () => void
  onBack: () => void
}

export function StepSpecializations({ profile, onNext, onBack }: Props) {
  const { t } = useTranslation()
  const { data: categories } = useGetMasterServiceCategoriesQuery()
  const [selected, setSelected] = useState<string[]>(profile.specializations ?? [])
  const [save, { isLoading: saving }] = useUpdateMasterDashboardProfileMutation()
  const [advance] = useAdvanceMasterOnboardingStepMutation()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSelected(profile.specializations ?? [])
  }, [profile])

  const options: Array<{ slug: string; label: string }> = (categories?.groups ?? []).map((g) => ({
    slug: g.parentSlug,
    label: g.label,
  }))

  const handleNext = async () => {
    setError(null)
    if (selected.length === 0) {
      setError(t('masterOnboarding.errors.missingSpecializations'))
      return
    }
    try {
      await save({ specializations: selected }).unwrap()
      await advance({ step: 'services' }).unwrap()
      onNext()
    } catch {
      setError(t('masterOnboarding.errors.saveFailed'))
    }
  }

  return (
    <Stack gap={2}>
      <Typography variant="subtitle1">{t('masterOnboarding.steps.specializations.title')}</Typography>
      <FormControl fullWidth size="small">
        <InputLabel>{t('masterOnboarding.steps.specializations.selectLabel')}</InputLabel>
        <Select
          multiple
          value={selected}
          label={t('masterOnboarding.steps.specializations.selectLabel')}
          onChange={(e) => setSelected(e.target.value as string[])}
          renderValue={() =>
            selected.length > 0
              ? selected
                  .map((slug) => options.find((o) => o.slug === slug)?.label ?? slug)
                  .join(', ')
              : t('masterOnboarding.steps.specializations.placeholder')
          }
        >
          {options.map((o) => (
            <MenuItem key={o.slug} value={o.slug}>
              <ListItemText primary={o.label} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" gap={1.5}>
        <Button variant="outlined" onClick={onBack}>
          {t('masterOnboarding.actions.back')}
        </Button>
        <Button variant="contained" sx={{ flex: 1 }} disabled={saving} onClick={handleNext}>
          {t('masterOnboarding.actions.next')}
        </Button>
      </Stack>
    </Stack>
  )
}
```

- [ ] **Step 2: Lint**

Run: `cd frontend && npm run lint`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/master-onboarding/ui/StepSpecializations.tsx
git commit -m "feat(master-onboarding): StepSpecializations"
```

### Task 20: `StepServices` (skippable)

**Files:**
- Create: `frontend/src/pages/master-onboarding/ui/StepServices.tsx`

- [ ] **Step 1: Implement minimal step**

```tsx
import { Stack, Button, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAdvanceMasterOnboardingStepMutation } from '@entities/master-onboarding'

type Props = { onNext: () => void; onBack: () => void }

export function StepServices({ onNext, onBack }: Props) {
  const { t } = useTranslation()
  const [advance, { isLoading }] = useAdvanceMasterOnboardingStepMutation()

  const handleNext = async () => {
    try {
      await advance({ step: 'schedule' }).unwrap()
    } catch {
      // best-effort; still proceed
    }
    onNext()
  }

  return (
    <Stack gap={2}>
      <Typography variant="subtitle1">{t('masterOnboarding.steps.services.title')}</Typography>
      <Typography color="text.secondary">
        {t('masterOnboarding.steps.services.description')}
      </Typography>
      <Stack direction="row" gap={1.5}>
        <Button variant="outlined" onClick={onBack}>
          {t('masterOnboarding.actions.back')}
        </Button>
        <Button variant="contained" sx={{ flex: 1 }} disabled={isLoading} onClick={handleNext}>
          {t('masterOnboarding.actions.skipForNow')}
        </Button>
      </Stack>
    </Stack>
  )
}
```

(For the MVP this step is informational + advance. Full master-services CRUD is already available in the master-dashboard cabinet — directing users there post-publish is acceptable.)

- [ ] **Step 2: Lint + commit**

```bash
cd frontend && npm run lint
git add frontend/src/pages/master-onboarding/ui/StepServices.tsx
git commit -m "feat(master-onboarding): StepServices (skippable)"
```

### Task 21: `StepSchedule` (skippable)

**Files:**
- Create: `frontend/src/pages/master-onboarding/ui/StepSchedule.tsx`

- [ ] **Step 1: Implement minimal step**

```tsx
import { Stack, Button, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAdvanceMasterOnboardingStepMutation } from '@entities/master-onboarding'

type Props = { onNext: () => void; onBack: () => void }

export function StepSchedule({ onNext, onBack }: Props) {
  const { t } = useTranslation()
  const [advance, { isLoading }] = useAdvanceMasterOnboardingStepMutation()

  const handleNext = async () => {
    try {
      await advance({ step: 'completed' }).unwrap()
    } catch {
      // best-effort; still proceed
    }
    onNext()
  }

  return (
    <Stack gap={2}>
      <Typography variant="subtitle1">{t('masterOnboarding.steps.schedule.title')}</Typography>
      <Typography color="text.secondary">
        {t('masterOnboarding.steps.schedule.description')}
      </Typography>
      <Stack direction="row" gap={1.5}>
        <Button variant="outlined" onClick={onBack}>
          {t('masterOnboarding.actions.back')}
        </Button>
        <Button variant="contained" sx={{ flex: 1 }} disabled={isLoading} onClick={handleNext}>
          {t('masterOnboarding.actions.skipForNow')}
        </Button>
      </Stack>
    </Stack>
  )
}
```

- [ ] **Step 2: Lint + commit**

```bash
cd frontend && npm run lint
git add frontend/src/pages/master-onboarding/ui/StepSchedule.tsx
git commit -m "feat(master-onboarding): StepSchedule (skippable)"
```

### Task 22: `StepPublish`

**Files:**
- Create: `frontend/src/pages/master-onboarding/ui/StepPublish.tsx`

- [ ] **Step 1: Implement step**

```tsx
import { useState } from 'react'
import { Alert, Button, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { usePublishMasterProfileMutation } from '@entities/master-onboarding'

type Props = {
  profile: { displayName: string; specializations: string[] }
  onPublished: () => void
  onBack: () => void
}

export function StepPublish({ profile, onPublished, onBack }: Props) {
  const { t } = useTranslation()
  const [publish, { isLoading }] = usePublishMasterProfileMutation()
  const [error, setError] = useState<string | null>(null)
  const [missingFields, setMissingFields] = useState<string[]>([])

  const canPublish =
    profile.displayName.trim().length > 0 && profile.specializations.length > 0

  const handlePublish = async () => {
    setError(null)
    setMissingFields([])
    try {
      await publish().unwrap()
      onPublished()
    } catch (err: unknown) {
      const e = err as { data?: { error?: string; fields?: string[] } }
      if (e?.data?.error === 'missing_required') {
        setMissingFields(e.data.fields ?? [])
        return
      }
      setError(t('masterOnboarding.errors.publishFailed'))
    }
  }

  return (
    <Stack gap={2}>
      <Typography variant="subtitle1">{t('masterOnboarding.steps.publish.title')}</Typography>
      <Typography color="text.secondary">
        {t('masterOnboarding.steps.publish.description')}
      </Typography>

      <Typography variant="body2">
        <strong>{t('masterOnboarding.steps.publish.displayNameLabel')}:</strong> {profile.displayName || '—'}
      </Typography>
      <Typography variant="body2">
        <strong>{t('masterOnboarding.steps.publish.specializationsLabel')}:</strong>{' '}
        {profile.specializations.length > 0 ? profile.specializations.join(', ') : '—'}
      </Typography>

      {missingFields.includes('displayName') && (
        <Alert severity="error">{t('masterOnboarding.errors.missingDisplayName')}</Alert>
      )}
      {missingFields.includes('specializations') && (
        <Alert severity="error">{t('masterOnboarding.errors.missingSpecializations')}</Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" gap={1.5}>
        <Button variant="outlined" onClick={onBack}>
          {t('masterOnboarding.actions.back')}
        </Button>
        <Button
          variant="contained"
          sx={{ flex: 1 }}
          disabled={!canPublish || isLoading}
          onClick={handlePublish}
        >
          {t('masterOnboarding.actions.publish')}
        </Button>
      </Stack>
    </Stack>
  )
}
```

- [ ] **Step 2: Lint + build**

Run: `cd frontend && npm run lint && npm run build`
Expected: full build passes now that all step components are present.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/master-onboarding/ui/StepPublish.tsx
git commit -m "feat(master-onboarding): StepPublish with hard validation surface"
```

### Task 23: Update CTAs on `/for-masters`

**Files:**
- Modify: `frontend/src/pages/for-masters/ui/HeroSection.tsx:53`
- Modify: `frontend/src/pages/for-masters/ui/CtaFooterSection.tsx`

- [ ] **Step 1: Update HeroSection**

In `HeroSection.tsx`, line 53 area, replace:

```diff
- href={ROUTES.LOGIN}
+ href={ROUTES.MASTER_ONBOARDING_START}
```

- [ ] **Step 2: Update CtaFooterSection**

Open `CtaFooterSection.tsx` and locate the analogous CTA button. Replace its `href={ROUTES.LOGIN}` (or whatever it currently uses) with `href={ROUTES.MASTER_ONBOARDING_START}`.

- [ ] **Step 3: Build + manual smoke test**

Run: `cd frontend && npm run build`
Expected: pass.

Manual: visit `/for-masters`, click "Стать мастером" — should:
1. (If not logged in) navigate to `/login?returnTo=%2Fmaster-onboarding%2Fstart`.
2. After OTP — navigate back to `/master-onboarding/start`.
3. `StartBridge` calls `start` API → redirected to `/master-onboarding`.
4. Wizard opens at `Step 1: Профиль`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/for-masters/ui/HeroSection.tsx \
        frontend/src/pages/for-masters/ui/CtaFooterSection.tsx
git commit -m "feat(for-masters): wire CTA to master-onboarding flow"
```

---

## Phase 9 — i18n + docs + final verification

### Task 24: i18n keys

**Files:**
- Modify: `frontend/src/shared/i18n/locales/en.json`
- Modify: `frontend/src/shared/i18n/locales/ru.json`

- [ ] **Step 1: Add Russian keys**

Insert into `ru.json` at top level (or under existing namespace, matching project convention):

```json
"masterOnboarding": {
  "title": "Стать мастером",
  "stepLabel": "Шаг {{current}} из {{total}}",
  "steps": {
    "profile": {
      "title": "Профиль",
      "displayNameLabel": "Ваше имя",
      "bioLabel": "Коротко о себе"
    },
    "specializations": {
      "title": "Специализации",
      "selectLabel": "Выберите категории",
      "placeholder": "Не выбрано"
    },
    "services": {
      "title": "Личный каталог услуг",
      "description": "Добавите позже в кабинете."
    },
    "schedule": {
      "title": "Расписание",
      "description": "Настроите позже в кабинете."
    },
    "publish": {
      "title": "Публикация",
      "description": "Проверьте данные и опубликуйте профиль.",
      "displayNameLabel": "Имя",
      "specializationsLabel": "Специализации"
    }
  },
  "actions": {
    "next": "Далее",
    "back": "Назад",
    "skipForNow": "Пропустить",
    "publish": "Опубликовать"
  },
  "errors": {
    "missingDisplayName": "Укажите ваше имя.",
    "missingSpecializations": "Выберите хотя бы одну специализацию.",
    "saveFailed": "Не удалось сохранить. Повторите.",
    "publishFailed": "Не удалось опубликовать. Повторите."
  }
}
```

- [ ] **Step 2: Add English keys**

Insert the same structure with English copy into `en.json`:

```json
"masterOnboarding": {
  "title": "Become a master",
  "stepLabel": "Step {{current}} of {{total}}",
  "steps": {
    "profile": {
      "title": "Profile",
      "displayNameLabel": "Your name",
      "bioLabel": "About yourself"
    },
    "specializations": {
      "title": "Specializations",
      "selectLabel": "Select categories",
      "placeholder": "Not selected"
    },
    "services": {
      "title": "Personal services",
      "description": "You can add these later in your cabinet."
    },
    "schedule": {
      "title": "Schedule",
      "description": "You can configure it later in your cabinet."
    },
    "publish": {
      "title": "Publish",
      "description": "Review and publish your profile.",
      "displayNameLabel": "Name",
      "specializationsLabel": "Specializations"
    }
  },
  "actions": {
    "next": "Next",
    "back": "Back",
    "skipForNow": "Skip",
    "publish": "Publish"
  },
  "errors": {
    "missingDisplayName": "Please provide your name.",
    "missingSpecializations": "Pick at least one specialization.",
    "saveFailed": "Failed to save. Please retry.",
    "publishFailed": "Failed to publish. Please retry."
  }
}
```

- [ ] **Step 3: Lint + build**

Run: `cd frontend && npm run lint && npm run build`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared/i18n/locales/en.json frontend/src/shared/i18n/locales/ru.json
git commit -m "feat(i18n): masterOnboarding keys (ru, en)"
```

### Task 25: Vault docs updates

**Files:**
- Modify: `docs/vault/architecture/code-map.md`
- Modify: `docs/vault/architecture/db-schema.md`
- Modify: `docs/vault/entities/master-profiles-salon-masters.md`
- Modify: `docs/vault/entities/user-roles.md`
- Modify: `docs/vault/product/status.md`

- [ ] **Step 1: Add row to `code-map.md`**

In the main concept→code table, add a row:

```md
| Master self-onboarding (становление мастером) | `backend/internal/service/master_onboarding.go`, `backend/internal/controller/master_dashboard_controller.go` (`StartOnboarding` + cases `onboarding`, `publish`), миграции `000042`, `000043` | `frontend/src/pages/master-onboarding/`, `frontend/src/entities/master-onboarding/`, `frontend/src/pages/for-masters/ui/HeroSection.tsx` |
```

- [ ] **Step 2: Add fields to `db-schema.md`**

Find the `master_profiles` table description and add (or update) the field list with:

- `published_at TIMESTAMPTZ NULL` — гейтит видимость в `/api/v1/masters/:id`. NULL = скрыт. Backfill `created_at` для всех `user_id IS NOT NULL`.
- `onboarding_step master_onboarding_step NULL` — состояние wizard-а самопровозглашения. ENUM: `profile`, `specializations`, `services`, `schedule`, `completed`.

- [ ] **Step 3: Add Path 4 to `master-profiles-salon-masters.md`**

Add new subsection after "Путь 3":

```md
### Путь 4 — Мастер регистрируется самостоятельно

Авторизованный пользователь нажимает «Стать мастером» на `/for-masters` → `POST /api/v1/me/master-onboarding/start`. Серверный handler идемпотентно обрабатывает три состояния:

- **A2** (уже master) → возвращает existing профиль и `redirect: /master-dashboard`.
- **A1** (теневой профиль с совпадающим `phone_e164`) → claim (`user_id` устанавливается), профиль продвигается в `onboarding_step = 'profile'`, redirect в wizard.
- **A0** (нет профиля) → INSERT `master_profiles { user_id, display_name, phone_e164, published_at: NULL, onboarding_step: 'profile' }`, redirect в wizard.

Wizard (5 шагов) собирает: профиль, специализации, услуги (опционально), расписание (опционально), публикация. На последнем шаге `POST /api/v1/master-dashboard/publish` ставит `published_at = COALESCE(published_at, now())` после жёсткой валидации (`display_name != ''`, `specializations >= 1`).
```

- [ ] **Step 4: Update `user-roles.md`**

Find the section "Автопересчет `global_role`" and add a note that this still works the same way for self-onboarding because the trigger fires on INSERT/UPDATE of `master_profiles.user_id`.

- [ ] **Step 5: Update `status.md`**

In "Последние изменения (2026-05-09)" (or current date heading), prepend an entry:

```md
- **Master self-onboarding:** добавлен путь регистрации мастера с `/for-masters` через идемпотентный `POST /api/v1/me/master-onboarding/start`. Wizard `/master-onboarding` (5 шагов): профиль → специализации → услуги (опц.) → расписание (опц.) → публикация. Введены поля `master_profiles.published_at` и `master_profiles.onboarding_step` (миграции `000042`, `000043`). Прямая выдача `/api/v1/masters/:id` теперь требует `published_at IS NOT NULL` — закрыта дыра приватности теневых профилей; страница салона (`salon_masters`) не затронута. Endpoint `POST /api/v1/master-dashboard/publish` идемпотентен (`COALESCE`), validation жёсткая (`display_name`, `specializations`).
```

- [ ] **Step 6: Commit**

```bash
git add docs/vault/architecture/code-map.md \
        docs/vault/architecture/db-schema.md \
        docs/vault/entities/master-profiles-salon-masters.md \
        docs/vault/entities/user-roles.md \
        docs/vault/product/status.md
git commit -m "docs(vault): document master self-onboarding flow"
```

### Task 26: Final verification

**Files:** none — verification only

- [ ] **Step 1: Backend full test suite**

Run: `cd backend && go test ./...`
Expected: all green.

- [ ] **Step 2: Frontend lint + build**

Run: `cd frontend && npm run lint && npm run build`
Expected: all green.

- [ ] **Step 3: End-to-end smoke (manual)**

Start the stack:
```bash
docker compose up -d
cd backend && go run ./cmd/api &
cd frontend && npm run dev
```

Walk through:
1. Open `/for-masters` while logged out → click "Стать мастером" → land on `/login?returnTo=%2Fmaster-onboarding%2Fstart`.
2. Log in via OTP with a brand-new phone → land on `/master-onboarding/start` → bridge calls API → redirected to `/master-onboarding`.
3. Step 1: enter name + bio → "Далее" → step 2 opens.
4. Step 2: select 1 category → "Далее" → step 3 opens.
5. Step 3: skip → step 4 opens.
6. Step 4: skip → step 5 opens.
7. Step 5: review → click "Опубликовать" → wizard navigates to `/master-dashboard`.
8. Open `/master/<my-master-profile-id>` in a private browser window — should return 200 with name + specializations.
9. Open the same URL for a known shadow profile — should return 404.
10. Open salon page that contains a shadow master — verify the "Профиль мастера" button is hidden.

- [ ] **Step 4: Regression check**

- Existing salon claim flow `/claim-salon` still works.
- Existing auto-claim of shadow profiles via OTP login still works (log in as a phone matching a shadow that pre-existed before the feature).
- Existing master-dashboard for already-claimed masters loads correctly (their `published_at` was backfilled).

- [ ] **Step 5: Final commit (if needed) — push branch, open PR**

Push the feature branch and open a PR. PR description should reference:
- The spec: `docs/superpowers/specs/2026-05-09-master-self-onboarding-design.md`
- Brief test plan (the steps from Step 3 above)
- Risk note: privacy gating change for shadow profiles is intentional — see spec §11.

---

## Self-Review Notes

**Spec coverage:**

- §1–4 (architecture, decisions): covered by Tasks 1–12 (DB, model, repo, service, controller, Fx).
- §5 (migrations): Tasks 1, 2.
- §6 (API contract): Tasks 4, 5, 6, 7, 8, 9, 10, 11, 12.
- §6.3 (services/schedule existence): pre-verified during plan-writing — endpoints already exist (master_dashboard_controller.go cases 402 and 817), so no new endpoints needed in the plan; reused via existing hooks.
- §6.4 (idempotency): verified via Tasks 8 (Start), 9 (AdvanceStep), 10 (Publish — `COALESCE`).
- §7 (frontend): Tasks 14–23.
- §7.4 (returnTo support): pre-verified — RequireAuth + LoginPage + OtpStep already pass `returnTo`. Open-redirect protection added in Task 13. Plan uses `returnTo` (codebase reality), spec uses `redirect` (will not change spec — naming reconciled in plan header note).
- §7.5 (i18n): Task 24.
- §8 (edge cases): tests cover #1, #2, #3, #4, #10, #11, #12; #14 covered by Task 4 manual integration; #7 (resume on step) implicit via wizard reading `onboardingStep`.
- §9 (testing): Tasks 8–10 unit, Task 4 manual integration, Task 26 e2e smoke.
- §10 (docs): Task 25.
- §11 (risks): Task 26 regression checks address the main risk; Task 13 closes the open-redirect risk surfaced during plan writing.

**Placeholder scan:** Several tasks have notes "verify project's existing pattern" (e.g., test fixture style, RTK Query auth header pattern). These are not placeholders for unknown behavior — they're directives to follow established repo conventions and are common in plans that integrate with an existing codebase. Where exact implementation paths are uncertain, the plan provides a `grep` command to find the canonical reference.

**Type consistency:**

- `MasterOnboardingService` interface (Task 8) — methods `Start`, `AdvanceStep`, `Publish` — used consistently in Tasks 9, 10, 11.
- `StartResult`, `PublishResult`, `ValidationError` — used consistently across service tests (Tasks 8–10) and controller (Task 11).
- Repository methods `LoadByUserID`, `CreateOwnedProfile`, `AdvanceOnboardingStep`, `PublishProfile` — defined in Task 7, used in Tasks 8, 9, 10.
- DTO `MasterProfileCabinetDTO` — extended in Task 6, consumed by frontend wizard (Task 18 reads `profile.onboardingStep`, `profile.displayName`, etc.).
- Frontend hooks `useStartMasterOnboardingMutation`, `useAdvanceMasterOnboardingStepMutation`, `usePublishMasterProfileMutation` — defined in Task 16, consumed in Tasks 17, 18, 19, 20, 21, 22.
- `safeRelativePath` — defined in Task 13, used in Tasks 13 (existing call sites) and 17 (start bridge).
- ROUTE constants `MASTER_ONBOARDING`, `MASTER_ONBOARDING_START` — defined in Task 16, used in Tasks 17 (bridge), 23 (CTA hrefs).
