---
title: React Native Mobile App Design
updated: 2026-05-05
type: specification
status: draft
---

# React Native Mobile App Design

**Date:** 2026-05-05  
**Status:** Draft — pending user review before implementation planning

---

## Executive Summary

This document specifies the design for a React Native mobile application targeting **salon staff** (owners, admins, receptionists) and **independent masters**. The Phase 1 scope focuses on **essentials only**: calendar view, appointments management, and push notifications. The app will be built with Expo (managed workflow), published simultaneously to iOS and Android, and will reuse the existing Beauty Marketplace backend API.

---

## Decisions Summary

| Decision | Choice |
|----------|--------|
| **Target users** | Salon staff + independent masters |
| **Phase 1 scope** | Essentials: calendar + appointments + notifications |
| **Framework** | Expo (managed workflow) |
| **Platforms** | iOS + Android simultaneously |
| **Push provider** | Expo Notifications Service (EAS) |
| **Architecture approach** | Approach C: Independent mobile app, no shared code extraction |
| **Navigation** | Expo Router (file-based tabs) |
| **State management** | Zustand + React Query |
| **Auth flow** | OTP + biometric unlock (Face ID / fingerprint) |
| **Token storage** | expo-secure-store |

---

## 1 — Architecture & Project Structure

### Monorepo Layout

```
beauty-marketplace/
├── frontend/                # Web SPA (unchanged)
├── backend/                 # Go API (unchanged)
├── mobile/                  # New: independent Expo app
│   ├── app/                 # Expo Router (file-based navigation)
│   │   ├── (auth)/          # Auth stack
│   │   │   ├── _layout.tsx
│   │   │   └── login.tsx    # OTP flow
│   │   ├── (tabs)/          # Main tab navigation
│   │   │   ├── _layout.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── appointments.tsx
│   │   │   └── notifications.tsx
│   │   ├── _layout.tsx      # Root layout (auth gate + role detection)
│   │   └── index.tsx        # Entry (redirect to login or tabs)
│   ├── src/
│   │   ├── api/             # Mobile-specific API client + types
│   │   │   ├── client.ts    # axios/fetch wrapper with JWT refresh
│   │   │   ├── types.ts     # API response types (mirrored from backend)
│   │   │   └── endpoints.ts # endpoint URLs + query builders
│   │   ├── hooks/           # useAppointments, useCalendar, usePushToken
│   │   ├── stores/          # Zustand: auth, salon, appointments
│   │   ├── components/      # Native UI (calendar card, appointment row, etc.)
│   │   └── lib/             # Utils (date formatting, phone mask, role guards)
│   ├── app.json             # Expo config (EAS, notifications, deep linking)
│   └── package.json
└── package.json             # Root (optional workspaces, but mobile is self-contained)
```

### Key Decisions

- **Expo Router**: File-based routing matches Expo managed workflow; zero-config navigation
- **Zustand**: Lightweight state management; no Redux boilerplate overhead
- **Independent API layer**: `mobile/src/api/` mirrors backend types; no extraction from frontend needed
- **Auth gate**: Root layout checks token → detects role (salon staff vs master) → routes to appropriate tabs

---

## 2 — State Management & Data Flow

### Auth Session (Zustand store)

```typescript
interface AuthState {
  tokenPair: { accessToken: string; refreshToken: string } | null
  user: null | { id: uuid; phone: string; effectiveRoles: Role[] }
  salonId: null | uuid // active salon context (for staff users)
}

// Actions
loginOTP(phone: string): Promise<void>
verifyOTP(code: string): Promise<void>
refreshToken(): Promise<void>
logout(): Promise<void>
setSalonId(salonId: uuid): void
```

### Role Detection

- On login, parse JWT `effectiveRoles` to determine user type
- Route configuration (`app/(tabs)/_layout.tsx`) shows different tabs based on role:
  - **Salon staff**: Calendar, Appointments, CRM (Clients), Finances (Owner/Admin only)
  - **Master**: My Appointments, Clients, Finances, Profile

### Appointments Store (React Query)

- Uses **React Query** for API caching (prefer over URQL for better pagination support)
- Cache keys: `appointments({ salonId?, masterProfileId?, date? })`
- Refresh triggers: pull-to-refresh, tab switch, status update mutations complete

### Notifications (EAS + local queue)

- Device token registration on app start → stored in backend via `/api/v1/devices` endpoint
- Push subscription handled by Expo Notifications SDK
- Local fallback: when app is foregrounded, poll for unread count (or use SSE as secondary)

### Calendar UI State

- Lightweight local state: selected view (day/week/month), current displayed dates
- No complex global sync needed; calendar fetches from API on mount + date change

---

## 3 — Mobile UI (Phase 1 Essentials)

### Tab Navigation

- Bottom tabs: **Calendar** | **Appointments** | **Notifications**
- Role-aware rendering: staff sees "Staff" tab instead of "Notifications"; master sees "Profile"
- Expo Router tab layout with icons (use React Native Vector Icons or expo-vector-icons)

### Calendar Screen (`app/(tabs)/calendar.tsx`)

- **View picker**: Day / Week / Month (horizontal scrollable tabs at top)
- **List-based calendar**: Each day is a collapsible list of time slots (not grid for simplicity)
- **Reschedule action**: Tap-to-reschedule; long press → drawer with slot selection
- **Empty states**: Message when working hours not set
- **Pull-to-refresh**: Refresh calendar data

### Appointments Screen (`app/(tabs)/appointments.tsx`)

- **Row list**: Filtered by date range (date picker modal)
- **Status badges**: Pending (yellow) / Confirmed (green) / Cancelled (red) / Completed (gray)
- **Swipe actions**: Confirm | Reschedule | Cancel (with confirmation modal)
- **Search bar**: Filter by client name or phone
- **Pagination**: Infinite scroll or "Load More" button

### Notifications Screen (`app/(tabs)/notifications.tsx`)

- **Deep links**: Push notification click handling navigates to appointment detail
- **Local list**: Syncs with backend `/api/v1/notifications`
- **Mark as read/unread toggle**
- **Badge count**: Expo router badge API or custom counter on tab icon

### Login Screen (`app/(auth)/login.tsx`)

- Phone input with mask (+7 / +1 format)
- OTP flow: request code → verify → JWT stored in secure store
- Post-login role detection + redirect to tab stack

### Components Library

| Component | Purpose |
|-----------|---------|
| `AppointmentCard` | Compact row with time, client name, service(s), status badge |
| `StatusBadge` | Semantic colors per status (green=confirmed, yellow=pending, red=canceled) |
| `TimeSlotButton` | Selectable slot for reschedule action |
| `SearchInput` | With clear button and debounce |
| `EmptyState` | Reusable skeleton/empty text combo |

---

## 4 — API Integration & Backend Changes

### Mobile's API Client (`mobile/src/api/client.ts`)

- Base URL from environment config (`.env.production`, `.env.development`)
- Request interceptors: attach `Authorization: Bearer <accessToken>` header
- Token refresh logic: on 401 response → silent `/api/auth/refresh` → retry original request
- Error handling: parse backend errors → show user-friendly toast/snackbar

### Backend Endpoints Used by Mobile

| Endpoint | Method | Use Case |
|----------|--------|----------|
| `/api/auth/otp/request` | POST | Request SMS/Telegram OTP code |
| `/api/auth/otp/verify` | POST | Verify code, receive JWT |
| `/api/v1/dashboard/appointments` | GET | Staff dashboard appointments |
| `/api/v1/dashboard/appointments/:id/status` | PATCH | Confirm/reschedule/cancel appointment |
| `/api/v1/master-dashboard/appointments` | GET | Master's personal appointments |
| `/api/v1/master-dashboard/appointments` | PUT | Create/update personal appointment |
| `/api/v1/notifications` | GET | List in-app notifications |
| `/api/v1/notifications/:id/read` | POST | Mark notification as read |
| `/api/v1/devices` | POST | Register push token (**NEW**) |

### New Backend Endpoint: Device Registration

**Request:**
```json
POST /api/v1/devices
{
  "device_token": "ExponentPushToken[...]",
  "platform": "ios" | "android",
  "user_id": "uuid"
}
```

**Response:** `201 Created`

**Database Schema:**
```sql
CREATE TABLE devices (
  device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  device_token VARCHAR(255) NOT NULL UNIQUE,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_platform ON devices(platform);
```

### Notification Delivery Flow

1. App registers push token → backend stores it in `devices` table
2. Appointment created/updated → backend sends notification via EAS SDK
3. User taps push → deep link → app navigates to appointment detail (handled by React Navigation linking config)

---

## 5 — Security, Local Storage & Error Handling

### Secure Token Storage

- Use `expo-secure-store` for JWT tokens (accessToken + refreshToken)
- Biometric unlock via `expo-local-authentication`:
  - On first login, prompt user: "Enable Face ID / fingerprint unlock?"
  - If yes → encrypt stored token with biometric key; subsequent opens require biometric verification
  - Fallback: PIN code or manual password if biometrics unavailable

### API Request Security

- All requests signed with JWT in `Authorization` header
- Refresh token rotation: invalidate old refresh token after successful refresh
- Logout clears all secure store entries + Zustand auth store

### Error Handling Strategy

| HTTP Code | User Experience |
|-----------|-----------------|
| Network error | Toast "No connection" with retry button |
| 401 Unauthorized | Silent token refresh → if fails, redirect to login |
| 403 Forbidden | Show "Access denied" message (wrong role for feature) |
| 422 Validation error | Map to form field errors in modals/drawers |
| 500 Server error | Generic "Something went wrong" with contact support option |

### Offline Support

- Minimal offline mode: cache last known appointments/calendar date
- Disable write actions when offline; show "Sync pending" badge when connection restored
- Consider adding React Query persistence (`@tanstack/react-query-persist-client`) if needed later

### Compliance Considerations

- No PII stored in local storage (tokens only)
- Biometric data never leaves device; used only for decryption key
- Push tokens are device identifiers, not personally identifiable information

---

## 6 — Testing & Release Strategy

### Mobile Testing Coverage

**Unit Tests (Jest)**
- Utility functions (date formatting, phone masks)
- Store selectors and actions
- API client wrappers

**Component Tests (React Native Testing Library)**
- AppointmentCard
- StatusBadge
- Form components (phone input, OTP input)

**E2E Tests**
- Critical paths: OTP login → create appointment → confirm appointment → push notification deep link
- Tools: Detox or Expo EAS Build + TestFlight/Play Console internal testing

### CI/CD Pipeline

```yaml
Stages:
  1. PR build
     - Linting + unit tests → fail on error
  
  2. On main branch
     - Build iOS app (EAS Build → submit to TestFlight)
     - Build Android app (EAS Build → upload to Play Store internal track)
  
  3. Release flow
     - Owner reviews TestFlight build → approve beta release
     - After QA approval → publish to production stores
  
  4. OTA updates
     - EAS Update for minor fixes (no store review needed)
```

### Environment Configuration

| Environment File | Contents |
|------------------|----------|
| `.env.development` | dev backend URL, development mode flag |
| `.env.production` | production backend URL |
| `.env.staging` | staging backend URL (if applicable) |

Expo Config Plugins handle runtime environment detection at build time.

### Analytics & Monitoring

- Optional: Sentry SDK for crash reporting
- Track key events: login success/failure, appointment created, appointment confirmed
- Privacy-compliant: no PII in analytics

---

## Dependencies (mobile/package.json)

```json
{
  "dependencies": {
    "react": "18.3.1",
    "react-native": "0.76.6",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "expo-router": "~4.0.0",
    "zustand": "^4.4.7",
    "@tanstack/react-query": "^5.24.0",
    "axios": "^1.6.0",
    "expo-secure-store": "~14.0.0",
    "expo-local-authentication": "~15.0.0",
    "expo-notifications": "~0.29.0",
    "expo-linear-gradient": "~14.0.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-gesture-handler": "~2.20.0"
  },
  "devDependencies": {
    "@types/react": "~18.3.12",
    "typescript": "^5.3.0",
    "@testing-library/react-native": "^12.0.0",
    "jest": "^29.7.0"
  }
}
```

---

## Open Questions

Before starting implementation planning, please clarify:

1. **Backend ownership**: Should I write the new `/api/v1/devices` endpoint and related migration now, or defer to the mobile implementation phase?

2. **Notification content**: What payload should push notifications contain? Example: `{ appointment_id, title, body, deep_link }`

3. **Biometrics flow**: When should biometric prompt appear — immediately on first app launch, or only after successful OTP login?

4. **Role visibility**: Should both salon staff and master see the same three tabs (Calendar, Appointments, Notifications), or do their tab sets differ significantly?

---

## Next Steps

Once approved:

1. Run `skill: writing-plans` to create detailed implementation plan
2. Break down into phases: Phase 1 (essentials), Phase 2 (CRM, services), Phase 3 (advanced features)
3. Establish CI/CD pipeline with EAS Build
4. Begin sprint with backend device registration endpoint

---

## Implementation Audit (2026-05-05)

Current implementation status for Phase 1 setup tasks (`Task 11-15` from execution plan):

- **Done:** Expo project scaffold, auth store (Zustand), base auth routes/layout files.
- **Partially done:** API client contracts, login OTP integration (still mocked), root layout providers.
- **Backend foundation done:** `POST /api/v1/devices` endpoint, device model/repository/service/controller, route wiring, controller tests.

Known mismatches to resolve before moving deeper into mobile feature work:

1. Align mobile API endpoint constants with backend (`/api/auth/otp/request`, `/api/auth/otp/verify`, `/api/auth/refresh`, `/api/v1/me`).
2. Replace mocked OTP timers in login screen with real API calls.
3. Add missing app-level providers (React Query) in root layout.
4. Fix Expo config placeholders and missing notifications icon asset.

---

**Author**: AI Agent (based on user requirements)  
**Review status**: Pending user feedback before implementation planning
