# React Native Master Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a premium, high-fidelity React Native mobile app for the Beauty Marketplace masters, matching the aesthetic and functional requirements of the `beautica-master-dashboard.jsx` mockup.

**Reference Mockup:** `Beautica 2 (2)/beautica-master-dashboard.jsx` (Palettes: Ivory Date, Sand Dune, Slate Stone).

---

## Progress Tracking
- [x] Phase 0: Backend Foundation (Tasks 1-10)
- [x] Phase 1: Mobile App Setup (Tasks 11-15)
- [x] Phase 2: Design System & Core UI (Tasks 16-20)
- [x] Phase 3: Dashboard & Schedule (Tasks 21-25)
- [x] Phase 4: Calendar & Navigation (Tasks 26-30)
- [x] Phase 5: Appointments & Clients (Tasks 31-35)
- [x] Phase 6: Service Management (Tasks 36-40)

---

## Phase 2: Design System & Core UI

### Task 16: Implement Theme & Palettes
**Files:**
- Create: `mobile/src/theme/index.ts`
- Create: `mobile/src/theme/palettes.ts`

- [ ] Define the `PALETTES` system from the mockup (Ivory Date, Sand Dune, Slate Stone).
- [ ] Implement a `useTheme` hook or context to switch palettes globally.
- [ ] Set up typography tokens using 'DM Sans' (or system fallback for premium look).
- [ ] Commit: `feat(ui): add theme system and color palettes`

### Task 17: Build Shared Atomic Components
**Files:**
- Create: `mobile/src/components/ui/Badge.tsx`
- Create: `mobile/src/components/ui/Button.tsx`
- Create: `mobile/src/components/ui/Input.tsx`
- Create: `mobile/src/components/ui/Tag.tsx`

- [ ] Implement `Badge` with semantic colors (green, red, yellow).
- [ ] Implement `Btn` (Button) with primary and secondary variants + custom border radii.
- [ ] Implement `Input` with premium styling (surface background, specific borders).
- [ ] Implement `Tag` for client and service labels.
- [ ] Commit: `feat(ui): implement shared atomic components`

### Task 18: Implement Tab Navigation Layout
**Files:**
- Create: `mobile/app/(tabs)/_layout.tsx`

- [ ] Implement `BottomNav` exactly like the mockup (icons: ⊞, ▦, ☰, ◉).
- [ ] Add active state indicator (accent color + bottom bar).
- [ ] Ensure smooth transitions between tabs using Expo Router.
- [ ] Commit: `feat(nav): implement premium bottom tab navigation`

---

## Phase 3: Dashboard & Schedule

### Task 19: Dashboard Header & Stats
**Files:**
- Create: `mobile/src/components/dashboard/StatsRow.tsx`
- Modify: `mobile/app/(tabs)/index.tsx` (or dashboard.tsx)

- [ ] Build the Dashboard Header with "Кабинет мастера" and User Avatar.
- [ ] Implement the `StatsRow` (Today, Income, Attendance) with card-style layout.
- [ ] Commit: `feat(dashboard): implement header and statistics row`

### Task 20: Interactive Date Strip
**Files:**
- Create: `mobile/src/components/dashboard/DateStrip.tsx`

- [ ] Implement horizontal scrollable date strip.
- [ ] Add "Active" state for selected date (accent background + indicator).
- [ ] Connect to `appointmentStore` to filter results by date.
- [ ] Commit: `feat(dashboard): add interactive horizontal date strip`

### Task 21: Today's Schedule (Card List)
**Files:**
- Create: `mobile/src/components/dashboard/ScheduleSlot.tsx`
- Create: `mobile/src/components/dashboard/TodaySchedule.tsx`

- [ ] Implement `ScheduleSlot` with time, status stripe, badge, and service info.
- [ ] Support "Free" (Свободно) slot styling as seen in mockup.
- [ ] Integrate with React Query `useAppointments` hook.
- [ ] Commit: `feat(dashboard): implement today's schedule slots`

---

## Phase 4: Calendar & Navigation

### Task 22: Calendar Week View Grid
**Files:**
- Create: `mobile/src/components/calendar/CalendarGrid.tsx`
- Create: `mobile/app/(tabs)/calendar.tsx`

- [ ] Implement the hour-based grid (9:00 - 18:00) with `HOUR_H` scaling.
- [ ] Add the `NowLine` (red line indicator) with current time position.
- [ ] Support "Day/Week" toggle in the header.
- [ ] Commit: `feat(calendar): implement week-view grid with NowLine`

### Task 23: Calendar Event Cards
**Files:**
- Create: `mobile/src/components/calendar/CalendarEvent.tsx`

- [ ] Position event cards absolutely on the grid based on start time and duration.
- [ ] Implement premium card styling (low opacity background + solid left border).
- [ ] Add Floating Action Button (FAB) for "New Appointment".
- [ ] Commit: `feat(calendar): add absolutely positioned event cards`

---

## Phase 5: Appointments & Clients

### Task 24: Appointment List (Mobile Optimized)
**Files:**
- Create: `mobile/app/(tabs)/appointments.tsx`
- Create: `mobile/src/components/appointments/AppointmentGroup.tsx`

- [ ] Implement grouping by days (Today, Tomorrow).
- [ ] Add "Upcoming / Past / Cancelled" tabs.
- [ ] Implement Quick Actions (Confirm / Cancel) on cards.
- [ ] Commit: `feat(appointments): implement grouped appointment list`

### Task 25: Client List & Filtering
**Files:**
- Create: `mobile/app/(tabs)/clients.tsx`
- Create: `mobile/src/components/clients/ClientCard.tsx`

- [ ] Implement Search bar with premium styling.
- [ ] Add filter chips (All, Regular, VIP, New).
- [ ] Build `ClientCard` with initials-avatar, tags, and spend statistics.
- [ ] Commit: `feat(clients): implement client list and filtering`

---

## Phase 6: Management & Final Polish

### Task 26: New Appointment Stepper
**Files:**
- Create: `mobile/app/new-appointment.tsx`
- Create: `mobile/src/components/forms/StepIndicator.tsx`

- [ ] Implement 4-step flow: Client -> Service -> Time -> Done.
- [ ] Build the Step Indicator exactly like the mockup.
- [ ] Implement client search/suggestion during Step 1.
- [ ] Commit: `feat(forms): implement new appointment stepper`

### Task 27: Service Edit Form
**Files:**
- Create: `mobile/app/edit-service.tsx`
- Create: `mobile/src/components/forms/DurationPicker.tsx`

- [ ] Implement segmented duration picker (30/45/60/75/90).
- [ ] Add price adjustment buttons (±100, ±500).
- [ ] Build the "Salon Overrides" card.
- [ ] Commit: `feat(forms): implement service edit form with overrides`

### Task 28: Polish, Assets & EAS Config
- [ ] Add missing assets (`notification-icon.png`, logos).
- [ ] Update `app.json` with real EAS Project IDs.
- [ ] Run `npm run lint` and `npm test` across mobile project.
- [ ] Commit: `chore: final polish and deployment readiness`

---

## Verification Plan

### Backend Verification
```bash
cd backend && go test ./...
```

### Mobile Verification
```bash
cd mobile
npm run lint
npm test
# For manual UI check (requires Expo Go or Simulator)
npx expo start
```
