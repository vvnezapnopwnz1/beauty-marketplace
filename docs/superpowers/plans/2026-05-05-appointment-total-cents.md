# Appointment Total Amount Implementation Plan

> **For Antigravity:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow masters/admins to manually edit the final price of an appointment while keeping track of whether it was manually set or auto-calculated from service prices.

**Architecture:** Add `total_cents` and `total_source` columns to `appointments` table. Update backend to auto-populate these during creation. Allow manual override via PUT. Update revenue reporting to prefer `total_cents`. Update frontend to display and edit this field.

**Tech Stack:** Go, GORM, PostgreSQL, React, MUI, Redux Toolkit (RTK Query).

---

### Task 1: Database Migration

**Files:**
- Create: `backend/migrations/000033_appointment_total_cents.up.sql`
- Create: `backend/migrations/000033_appointment_total_cents.down.sql`

**Step 1: Write UP migration**
```sql
ALTER TABLE appointments
  ADD COLUMN total_cents       INT          NULL,
  ADD COLUMN total_source      VARCHAR(20)  NOT NULL DEFAULT 'calculated';

-- Backfill total_cents from existing line items
UPDATE appointments a
SET total_cents = sub.total
FROM (
  SELECT appointment_id, SUM(price_cents) AS total
  FROM appointment_line_items
  GROUP BY appointment_id
) sub
WHERE a.id = sub.appointment_id
  AND a.total_cents IS NULL;

-- Fallback for older appointments without line items (using primary service price)
UPDATE appointments a
SET total_cents = s.price_cents
FROM services s
WHERE a.service_id = s.id
  AND a.total_cents IS NULL;
```

**Step 2: Write DOWN migration**
```sql
ALTER TABLE appointments 
  DROP COLUMN IF EXISTS total_cents,
  DROP COLUMN IF EXISTS total_source;
```

**Step 3: Run migration**
Run: `cd backend && go run ./cmd/migrate up`
Expected: Success

---

### Task 2: GORM Model Update

**Files:**
- Modify: `backend/internal/infrastructure/persistence/model/models.go`

**Step 1: Add fields to Appointment struct**
```go
// Find Appointment struct and add:
TotalCents  *int   `gorm:"column:total_cents"  json:"totalCents,omitempty"`
TotalSource string `gorm:"column:total_source;default:calculated" json:"totalSource"`
```

**Step 2: Verify build**
Run: `cd backend && go build ./...`
Expected: PASS

---

### Task 3: Backend DTO and Service Layer (Types)

**Files:**
- Modify: `backend/internal/service/dashboard_types.go`

**Step 1: Update AppointmentDetailDTO**
```go
type AppointmentDetailDTO struct {
    // ... existing fields
    TotalCents           *int    `json:"totalCents,omitempty"`
    TotalSource          string  `json:"totalSource"`
    CalculatedTotalCents int64   `json:"calculatedTotalCents"` // SUM of line items
}
```

**Step 2: Update UpdateAppointmentInput and ManualAppointmentInput**
```go
type ManualAppointmentInput struct {
    // ...
    TotalCents *int
}

type UpdateAppointmentInput struct {
    // ...
    TotalCents *int
}
```

---

### Task 4: Backend Logic - Guest Booking

**Files:**
- Modify: `backend/internal/service/booking.go`

**Step 1: Update CreateGuestBooking to set total_cents**
Calculate sum of `lines` price and set `appt.TotalCents`.

```go
// After lines are created
total := 0
for _, l := range lines {
    total += int(l.PriceCents)
}
appt.TotalCents = &total
appt.TotalSource = "calculated"
```

---

### Task 5: Backend Logic - Dashboard Appointment (Create/Update)

**Files:**
- Modify: `backend/internal/service/dashboard_appointment.go`
- Modify: `backend/internal/infrastructure/persistence/dashboard_appointment_repository.go`

**Step 1: Update CreateManualAppointment**
Calculate total from services and set `ap.TotalCents`. If `in.TotalCents` is provided, use it and set `TotalSource = "manual"`.

**Step 2: Update UpdateAppointment**
If `in.TotalCents` is provided, set it and set `TotalSource = "manual"`.
If services are updated and `TotalSource == "calculated"`, recalculate `TotalCents`.

**Step 3: Update GetAppointment DTO mapping**
Calculate `CalculatedTotalCents` from line items and populate DTO.

**Step 4: Update Repository UpdateAppointment**
Ensure `total_cents` and `total_source` are saved.

---

### Task 6: Backend Logic - Revenue and Financials

**Files:**
- Modify: `backend/internal/infrastructure/persistence/master_dashboard_repository.go`
- Modify: `backend/internal/infrastructure/persistence/dashboard_staff_repository.go`

**Step 1: Update SumStaffRevenueCents in dashboard_staff_repository.go**
Update to use `COALESCE(total_cents, services.price_cents)` or similar logic.

**Step 2: Update financial queries in master_dashboard_repository.go**
Update `buildFinanceSQL`, `GetMasterRevenueTrend`, `buildTopServicesSQL` to use `a.total_cents` (with fallback).
Update `ListMasterAppointments` to return `total_cents` as `total_price_cents`.

---

### Task 7: Frontend Types and API

**Files:**
- Modify: `frontend/src/entities/appointment/model/types.ts`
- Modify: `frontend/src/shared/api/dashboardApi.ts`

**Step 1: Update Appointment types**
Add `totalCents`, `totalSource`, `calculatedTotalCents`.

**Step 2: Update API mutations**
Add `totalCents` to create/update hooks.

---

### Task 8: Frontend UI - Appointment Drawers

**Files:**
- Modify: `frontend/src/pages/dashboard/ui/CreateAppointmentDrawer.tsx`
- Modify: `frontend/src/pages/dashboard/ui/AppointmentDrawer.tsx`

**Step 1: Add "Total" editable field**
Predisplay calculated total, allow manual change. Show indicator if manual.

---

### Task 9: Frontend UI - Tables and Calendar

**Files:**
- Modify: `frontend/src/pages/dashboard/ui/DashboardAppointments.tsx`
- Modify: `frontend/src/entities/appointment/ui/AppointmentBlock.tsx`

**Step 1: Update Table columns**
Show `totalCents` formatted as currency. Show manual indicator.

**Step 2: Update Calendar block**
Display `totalCents`.
