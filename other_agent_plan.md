## Plan: Master Dashboard — Appointments, Clients, Services, Calendar

TL;DR - implement a Master Cabinet that keeps the master's personal data (services, specializations, clients, personal appointments) fully independent from salon-scoped records while aggregating salon-sourced appointments/clients for visibility. Recommended approach: (A) separate specializations by adding `specializations` to `salon_masters`; (B) keep `master_services` for personal services; (C) implement personal appointments using a nullable `appointments.salon_id` (preferred) or a per-master hidden "solo salon" as a fallback.

**Steps**

1. Discovery & Audit (safe, blocking):
   - Audit production data for `appointments` and `salon_masters` constraints and triggers; list any DB objects referencing `appointments.salon_id` or assuming it non-null.
   - Inventory code paths that update master specializations (dashboard staff API, master profile API).
2. Schema Migrations (blocking, _depends on step 1_):
   - Add `specializations text[]` to `salon_masters` and backfill from `master_profiles` where appropriate.
   - Decide between Path A and Path B for personal appointments:
     - Path A (recommended): ALTER TABLE `appointments` ALTER COLUMN `salon_id` DROP NOT NULL; add `master_appointment` boolean or nullable `master_profile_id`/`master_appointment_type` to disambiguate. Update FK/indices/triggers.
     - Path B (alternative, less invasive): Create a hidden `solo_salon` per master and map personal appointments to it (no change to `appointments.salon_id` nullability).
   - If Path A chosen, add migration to add nullable `salon_id`, backfill mapping for existing personal-like records (if any), and update triggers/constraints.
3. Backend Service Changes (parallelizable where safe):
   - Update repositories and services:
     - [backend/internal/repository/master_dashboard.go](backend/internal/repository/master_dashboard.go) — ensure `ListMasterAppointments` returns both personal and salon appointments, distinguishing source.
     - [backend/internal/service/master_dashboard.go](backend/internal/service/master_dashboard.go) — add server-side pagination, filters: source=all|personal|salon_id.
     - Dashboard appointment services: make appointment creation endpoints for masters that persist personal appointments (Path A: salon_id NULL; Path B: salon_id = solo salon id).
     - Prevent salon staff writes from updating `master_profiles.specializations` — change salon staff APIs to write `salon_masters.specializations` instead.
   - Update `appointment_line_items` handling to include source metadata (service from master_services vs salon services) and price/duration resolution logic.
4. API Surface & Contracts (parallel):
   - Add/extend endpoints:
     - `GET /api/v1/master-dashboard/appointments?page=&pageSize=&source=` — paginated aggregation
     - `POST /api/v1/master-dashboard/appointments` — create personal appointment
     - `GET /api/v1/master-dashboard/clients` — aggregate personal + salon clients; support `source` filter
     - `GET|PUT /api/v1/master-dashboard/services` — personal services CRUD (reuse master_services repository)
   - Keep backward compatibility: salon dashboard endpoints unchanged; add path-specific validation to avoid cross-writes.
5. Frontend Implementation (parallel with API readiness):
   - Reuse components from salon dashboard: appointment grid, CreateAppointmentDrawer, DataGrid, calendar utils.
   - New pages/components:
     - frontend/src/pages/master-dashboard/ui/MasterDashboardAppointments.tsx
     - frontend/src/pages/master-dashboard/ui/MasterClientsListView.tsx
     - frontend/src/pages/master-dashboard/ui/MasterDashboardServices.tsx
     - frontend/src/pages/master-dashboard/ui/MasterDashboardCalendar.tsx
   - Update RTK Query endpoints: frontend/src/shared/api/masterDashboardApi.ts and appointmentApi hooks to support pagination and `source` filter.
   - UI behavior:
     - Filters: All / Personal Only / [Salon list]
     - Creation drawer only allows selecting master personal services & personal clients
     - Calendar: color-code events by source; day view = single master timeline
6. Tests & Verification (blocking before deploy):
   - Backend unit tests: `cd backend && go test ./...` targeting repository and service changes; add tests for aggregation behaviors and special cases around nullable salon_id
   - Frontend lint & basic smoke: `cd frontend && npm run lint` and manual UI checks
   - Integration: add API contract tests for endpoints and migration tests (if possible in CI staging)
7. Rollout & Monitoring
   - Feature flag gating for master-dashboard personal creation API during rollout
   - DB migration performed in two phases (schema add then deploy code that writes to new columns, then cleanup)
   - Add metrics/alerts for: unexpected NULLs in new columns, increased appointment creation errors, differences in client counts

**Relevant files**

- [backend/internal/service/master_dashboard.go](backend/internal/service/master_dashboard.go) — master service implementation
- [backend/internal/repository/master_dashboard.go](backend/internal/repository/master_dashboard.go) — repo methods for aggregation
- [backend/internal/service/dashboard_appointment.go](backend/internal/service/dashboard_appointment.go) — salon appointment logic to mirror for masters
- [backend/internal/controller/master_dashboard_controller.go](backend/internal/controller/master_dashboard_controller.go)
- [backend/migrations/](backend/migrations/) — add migration files here (specializations, appointments nullable or solo-salon creation)
- [frontend/src/shared/api/masterDashboardApi.ts](frontend/src/shared/api/masterDashboardApi.ts) — update/add endpoints
- frontend new pages: frontend/src/pages/master-dashboard/ui/\* (appointments, clients, services, calendar)

**Verification**

1. Backend tests: `cd backend && go test ./internal/repository ./internal/service -run Test.*Master` (add tests for `ListMasterAppointments` aggregation)
2. Frontend lint: `cd frontend && npm run lint`
3. Manual scenarios:
   - Master in Salon A & B: create personal service, ensure it doesn't appear in Salon A services
   - Create personal appointment from master dashboard; verify it appears in master calendar and not in Salon calendar (Path A: `salon_id IS NULL` / Path B: appears under solo salon)
   - Edit salon staff specializations in salon dashboard → confirm salon_masters.specializations changed, master_profiles.specializations unchanged

**Decisions & Rationale**

- Prefer Path A (make appointments.salon_id nullable): clearer, honest model separation between salon-scoped and personal appointments; enables correct aggregates and simpler queries. It is riskier (requires careful migration and trigger updates) but provides long-term clarity.
- Path B (solo salon) avoids schema changes but hides semantics and complicates multi-tenancy (search, owner visibility). Use only if DB migration is unacceptable for current release.
- Add a discriminator column (e.g., `is_personal` or `master_profile_id`) to simplify queries and avoid ambiguous NULL checks.

**Further Considerations / Questions**

1. Do we prefer Path A or Path B for initial rollout? Recommend Path A if DBA & staging window available; otherwise Path B as short-term fallback.
2. Do we want a dedicated `master_appointment_type` or `master_profile_id` column to clearly mark personal appointments? Recommend adding a small discriminator to simplify queries and avoid ambiguous NULL checks.
3. Confirm desired UX for personal clients vs salon clients merging/duplication strategy (auto-merge rules by phone/email?)

---

Saved on: 2026-05-01
Source references: implementation_plan.md, implementation_plan_discussion.md, docs/vault/ (architecture + entities)
