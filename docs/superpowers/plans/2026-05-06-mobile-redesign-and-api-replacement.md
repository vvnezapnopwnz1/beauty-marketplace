# Mobile Redesign + API Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `mobile/` with operations-first UI (Bento Today, 4 tabs, theme catalog), replace all mocks with real APIs and new backend endpoints (N1 today KPI, N2 Expo push worker, N3 heatmap), and ship calendar on `@howljs/react-native-calendar-kit` with drag-reschedule, offline read cache, OTP auth, Sentry, and internal EAS release.

**Architecture:** Expo Router groups `(auth)`, `(tabs)` with four tabs (today, calendar, records, clients), `(modals)`, `(settings)`; FSD-style `src/` with `shared/theme|ui|persist|telemetry`, `entities/*` for React Query hooks, `features/*` for mutations. Data: TanStack Query + AsyncStorage persister (allowlist) + axios `apiClient` with refresh to `/api/auth/refresh`. Backend additions live beside existing `MasterDashboardController` patterns.

**Tech stack:** Expo SDK 54, React 19, React Native 0.81, Expo Router 6, Zustand, TanStack Query v5 + persist, axios, `@howljs/react-native-calendar-kit`, `@gorhom/bottom-sheet`, Reanimated 4, Gesture Handler, `expo-local-authentication`, `expo-notifications`, `@sentry/react-native`, `@react-native-community/netinfo`, i18next, Go 1.24 backend.

**Spec:** [`docs/superpowers/specs/2026-05-06-mobile-redesign-and-api-replacement-design.md`](../specs/2026-05-06-mobile-redesign-and-api-replacement-design.md)

**Backend reality check (plan aligns code to this):**

- Auth: `POST /api/auth/otp/request`, `POST /api/auth/otp/verify` (returns `tokenPair`, `user`, `isNew`), `POST /api/auth/refresh` (body `{ "refreshToken" }`, returns `TokenPair`), `GET /api/auth/me`, `POST /api/auth/logout`.
- Full user payload with `effectiveRoles`: `GET /api/v1/me` (use after OTP).
- Master CRM: `/api/v1/master-dashboard/*` — appointments `GET` query params `from`, `to` (YYYY-MM-DD), `status`, `search`, `source`, `sort_by`, `sort_dir`, `page`, `page_size`; reschedule time via `PUT /api/v1/master-dashboard/appointments/:id` with `{ "startsAt": RFC3339 }`; status via `PATCH .../appointments/:id/status` with `{ "status" }`. There is **no** `DELETE` appointment on master-dashboard today — use status `cancelled` (or add backend route in a dedicated task if product insists on DELETE).
- Notifications: `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `POST .../seen`, `seen-all`, `read`, `read-all`, `GET .../stream`.
- Devices: `POST /api/v1/devices`.

---

## File structure map (create / modify / delete)

| Path                                                         | Responsibility                                                                                                                                                                           |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Delete**                                                   | `Beautica_design/` (entire directory); `mobile/src/components/calendar/CalendarGrid.tsx`; `mobile/src/theme/palettes.ts` (after migration); inline mocks in screens (during migrations). |
| `mobile/src/api/endpoints.ts`                                | Single source of URL builders: `AUTH_BASE`, `API_V1`, auth + me + master-dashboard + dashboard + notifications + devices.                                                                |
| `mobile/src/api/client.ts`                                   | Axios instance, 401 → `/api/auth/refresh`, `ApiError`, logout on refresh failure; **no** `login()` that bypasses OTP flow (thin wrappers only).                                          |
| `mobile/src/api/types/*.ts`                                  | DTOs matching backend JSON (camelCase).                                                                                                                                                  |
| `mobile/src/shared/theme/*`                                  | `tokens.ts`, `palette.types.ts`, `themes.ts`, `ThemeProvider.tsx`, `useTheme.ts`, `ThemePicker.tsx`.                                                                                     |
| `mobile/src/shared/persist/queryClient.ts`                   | `QueryClient` defaults + persister + dehydrate options.                                                                                                                                  |
| `mobile/src/shared/persist/rqAllowlist.ts`                   | Predicate: which query keys persist.                                                                                                                                                     |
| `mobile/src/shared/telemetry/sentry.ts`                      | `initSentry`, `beforeSend` PII scrub.                                                                                                                                                    |
| `mobile/src/shared/net/*`                                    | `useNetworkStatus`, `NetworkBanner`.                                                                                                                                                     |
| `mobile/src/shared/i18n/*`                                   | `i18n.ts`, `locales/ru.json`.                                                                                                                                                            |
| `mobile/src/shared/haptics/useHaptics.ts`                    | Thin wrapper over `expo-haptics` (add dep if missing).                                                                                                                                   |
| `mobile/src/shared/motion/springs.ts`                        | Spring presets + `useMotion` (reduced motion).                                                                                                                                           |
| `mobile/src/shared/ui/Tap.tsx`                               | Pressed scale + haptic.                                                                                                                                                                  |
| `mobile/src/shared/a11y/contrast.ts`                         | `contrastRatio`, tests WCAG.                                                                                                                                                             |
| `mobile/src/stores/authStore.ts`                             | Tokens + user snapshot; hydrate from SecureStore.                                                                                                                                        |
| `mobile/src/stores/themeStore.ts`                            | `themeId` → AsyncStorage.                                                                                                                                                                |
| `mobile/src/stores/biometricStore.ts`                        | enabled, timeout.                                                                                                                                                                        |
| `mobile/src/providers/AppProviders.tsx`                      | PersistQueryClientProvider, Theme, Gesture, BottomSheet, Sentry boundary.                                                                                                                |
| `mobile/app/_layout.tsx`                                     | Compose providers, auth gate, biometric gate.                                                                                                                                            |
| `mobile/app/(auth)/*`                                        | OTP screens + biometric prompt.                                                                                                                                                          |
| `mobile/app/(tabs)/*`                                        | Four tabs + `_layout` with header pattern.                                                                                                                                               |
| `mobile/app/(settings)/*`                                    | Profile, theme, security, notifications, help.                                                                                                                                           |
| `mobile/app/(modals)/*`                                      | Appointment / client / service sheets.                                                                                                                                                   |
| `mobile/src/entities/*/api.ts`                               | `useXQuery` / `useXMutation` factories.                                                                                                                                                  |
| `mobile/src/features/reschedule/useRescheduleAppointment.ts` | Optimistic PUT + rollback.                                                                                                                                                               |
| `mobile/src/features/calendar/*`                             | Calendar kit wrapper, heatmap, view state.                                                                                                                                               |
| `backend/internal/controller/master_dashboard_controller.go` | Routes `today`, `appointments/heatmap`.                                                                                                                                                  |
| `backend/internal/service/master_dashboard.go`               | `GetTodaySummary`, `AppointmentHeatmap`.                                                                                                                                                 |
| `backend/internal/push/expo_pusher.go`                       | N2 batch push worker.                                                                                                                                                                    |
| `.husky/pre-commit` or `mobile/scripts/check-no-mocks.sh`    | Grep gate: reject mock arrays in `mobile/src` and `mobile/app`.                                                                                                                          |

---

## Phase 0 — Foundation (staging tag v0.5.0-staging)

### Task P0-1: Dependency install (mobile)

**Files:**

- Modify: `mobile/package.json`

- [ ] **Step 1: Add packages**

Run:

```bash
cd mobile && npm install @tanstack/react-query-persist-client @tanstack/query-async-storage-persister @gorhom/bottom-sheet @howljs/react-native-calendar-kit lucide-react-native i18next react-i18next @sentry/react-native @react-native-community/netinfo expo-haptics
```

Expected: `package-lock.json` updated, no peer dependency errors (if `@gorhom/bottom-sheet` wants `react-native-reanimated` / gesture-handler, they are already present).

- [ ] **Step 2: Commit**

```bash
git add mobile/package.json mobile/package-lock.json
git commit -m "chore(mobile): add RQ persist, calendar kit, i18n, Sentry, netinfo"
```

---

### Task P0-2: API base URLs and endpoint map

**Files:**

- Modify: `mobile/src/api/endpoints.ts` (replace entire file)

- [ ] **Step 1: Replace `endpoints.ts`**

```typescript
const rawApiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";
const AUTH_PREFIX = "/api/auth";
export const API_V1 = `${rawApiUrl.replace(/\/$/, "")}/api/v1`;

export const AUTH = {
  requestOTP: `${rawApiUrl.replace(/\/$/, "")}${AUTH_PREFIX}/otp/request`,
  verifyOTP: `${rawApiUrl.replace(/\/$/, "")}${AUTH_PREFIX}/otp/verify`,
  refresh: `${rawApiUrl.replace(/\/$/, "")}${AUTH_PREFIX}/refresh`,
  me: `${rawApiUrl.replace(/\/$/, "")}${AUTH_PREFIX}/me`,
  logout: `${rawApiUrl.replace(/\/$/, "")}${AUTH_PREFIX}/logout`,
} as const;

export const USER = {
  me: `${API_V1}/me`,
} as const;

export const MASTER = {
  today: `${API_V1}/master-dashboard/today`,
  appointments: `${API_V1}/master-dashboard/appointments`,
  appointment: (id: string) => `${API_V1}/master-dashboard/appointments/${id}`,
  appointmentStatus: (id: string) =>
    `${API_V1}/master-dashboard/appointments/${id}/status`,
  appointmentsHeatmap: `${API_V1}/master-dashboard/appointments/heatmap`,
  profile: `${API_V1}/master-dashboard/profile`,
  services: `${API_V1}/master-dashboard/services`,
  service: (id: string) => `${API_V1}/master-dashboard/services/${id}`,
  clients: `${API_V1}/master-dashboard/clients`,
  client: (id: string) => `${API_V1}/master-dashboard/clients/${id}`,
  serviceCategories: `${API_V1}/master-dashboard/service-categories`,
  invites: `${API_V1}/master-dashboard/invites`,
  salons: `${API_V1}/master-dashboard/salons`,
  financesSummary: `${API_V1}/master-dashboard/finances/summary`,
  financesExpenseCategories: `${API_V1}/master-dashboard/finances/expense-categories`,
  financesExpenses: `${API_V1}/master-dashboard/finances/expenses`,
} as const;

export const DASHBOARD = {
  root: `${API_V1}/dashboard/`,
} as const;

export const NOTIFICATIONS = {
  list: `${API_V1}/notifications`,
  unreadCount: `${API_V1}/notifications/unread-count`,
  markSeen: (id: string) => `${API_V1}/notifications/${id}/seen`,
  markAllSeen: `${API_V1}/notifications/seen-all`,
  markRead: (id: string) => `${API_V1}/notifications/${id}/read`,
  markAllRead: `${API_V1}/notifications/read-all`,
  stream: `${API_V1}/notifications/stream`,
} as const;

export const DEVICES = {
  register: `${API_V1}/devices`,
} as const;
```

- [ ] **Step 2: Add env to `mobile/app.json` / `app.config` if needed**

Ensure `extra` or `expo` config documents `EXPO_PUBLIC_API_URL` (no secrets). If the project uses `app.config.ts`, add schema comment only.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/api/endpoints.ts
git commit -m "fix(mobile): align API endpoints with backend routes"
```

---

### Task P0-3: `ApiError` + axios client + refresh to `/api/auth/refresh`

**Files:**

- Create: `mobile/src/api/errors.ts`
- Modify: `mobile/src/api/client.ts`
- Modify: `mobile/src/api/client.test.ts`

- [ ] **Step 1: Create `errors.ts`**

```typescript
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown,
    readonly isRetryable = false,
  ) {
    super(message);
    this.name = "ApiError";
  }

  userMessage(_t: (key: string) => string): string {
    if (this.status === 409) return _t("errors.conflict");
    if (this.status === 401) return _t("errors.unauthorized");
    if (this.status >= 500) return _t("errors.server");
    return this.message || _t("errors.generic");
  }
}
```

- [ ] **Step 2: Rewrite `client.ts`** (preserve queue pattern; change refresh URL and body; map axios errors to `ApiError`)

Key requirements:

- `baseURL`: empty string — callers pass full URLs from `endpoints.ts` (or set `baseURL` to `rawApiUrl` and use relative paths — pick one; **must** match `endpoints`).

Example refresh implementation:

```typescript
import { AUTH } from "./endpoints";
// inside refreshAccessToken:
const response = await axios.post<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}>(
  AUTH.refresh,
  { refreshToken },
  { headers: { "Content-Type": "application/json" } },
);
```

Use the **same** axios instance or a bare `axios` for refresh to avoid interceptor loop (recommended: import `axios` default only for refresh POST).

- [ ] **Step 3: Update test `client.test.ts`**

Assert refresh is called with `AUTH.refresh` URL when access returns 401 (mock axios adapters or msw-style stubs).

Run:

```bash
cd mobile && npx jest src/api/client.test.ts --no-cache
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/api/errors.ts mobile/src/api/client.ts mobile/src/api/client.test.ts
git commit -m "fix(mobile): refresh token via /api/auth/refresh and ApiError"
```

---

### Task P0-4: React Query + AsyncStorage persister + allowlist

**Files:**

- Create: `mobile/src/shared/persist/queryClient.ts`
- Create: `mobile/src/shared/persist/rqAllowlist.ts`
- Create: `mobile/src/providers/AppProviders.tsx`
- Modify: `mobile/app/_layout.tsx`

- [ ] **Step 1: `rqAllowlist.ts`**

```typescript
import type { Query } from "@tanstack/react-query";

const ALLOW_HEADS = new Set([
  "me",
  "today",
  "appointments",
  "appointmentsHeatmap",
  "clients",
  "client",
  "services",
  "financesSummary",
  "notifications",
  "notificationsUnread",
]);

/** Persist only allowlisted query roots (spec §8.1). */
export function shouldDehydrateQuery(query: Query): boolean {
  const key = query.queryKey;
  if (!Array.isArray(key) || key.length === 0) return false;
  return ALLOW_HEADS.has(String(key[0]));
}
```

- [ ] **Step 2: `queryClient.ts`**

```typescript
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { shouldDehydrateQuery } from "./rqAllowlist";

const buster =
  process.env.EXPO_PUBLIC_APP_VERSION ?? Constants.expoConfig?.version ?? "0";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 1000 * 60 * 60 * 24,
      retry(failureCount, error) {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status === 401) return false;
        return failureCount < 2;
      },
      refetchOnReconnect: "always",
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  throttleTime: 1000,
});

export const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24,
  buster,
  dehydrateOptions: { shouldDehydrateQuery },
};

export { PersistQueryClientProvider };
```

- [ ] **Step 3: `AppProviders.tsx`** wraps children with `PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge, buster, dehydrateOptions: { shouldDehydrateQuery } }}`.

- [ ] **Step 4: `_layout.tsx`** uses `<AppProviders>{slots}</AppProviders>`.

Run:

```bash
cd mobile && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/shared/persist mobile/src/providers mobile/app/_layout.tsx
git commit -m "feat(mobile): persist React Query cache with allowlist"
```

---

### Task P0-5: Network banner + `useNetworkStatus`

**Files:**

- Create: `mobile/src/shared/net/useNetworkStatus.ts`
- Create: `mobile/src/shared/net/NetworkBanner.tsx`
- Modify: `mobile/app/_layout.tsx` (render banner below SafeArea)

- [ ] **Step 1: `useNetworkStatus.ts`**

```typescript
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export function useNetworkStatus(): {
  isOnline: boolean;
  lastOnlineAt: Date | null;
} {
  const [isOnline, setOnline] = useState(true);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(new Date());

  useEffect(() => {
    return NetInfo.addListener((s) => {
      const connected = s.isConnected === true;
      const reachable = s.isInternetReachable;
      const online = connected && (reachable === true || reachable === null);
      setOnline(online);
      if (online) setLastOnlineAt(new Date());
    });
  }, []);

  return { isOnline, lastOnlineAt };
}
```

- [ ] **Step 2: `NetworkBanner.tsx`** — if `!isOnline`, show Russian strings per spec §8.3 (grey vs amber by cache age; consume `useLastCacheTimestamp` from a tiny context fed by `useIsFetching` or persisted meta — minimal v1: single banner «Нет сети» + `lastOnlineAt` time).

- [ ] **Step 3: Commit**

```bash
git add mobile/src/shared/net mobile/app/_layout.tsx
git commit -m "feat(mobile): offline banner via NetInfo"
```

---

### Task P0-6: Sentry init + ErrorBoundary + PII scrub

**Files:**

- Create: `mobile/src/shared/telemetry/sentry.ts`
- Modify: `mobile/src/providers/AppProviders.tsx`

- [ ] **Step 1: `sentry.ts`**

```typescript
import * as Sentry from "@sentry/react-native";

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_ENV ?? "development",
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      if (event.request?.data && typeof event.request.data === "object") {
        const d = event.request.data as Record<string, unknown>;
        ["phone", "email", "displayName", "guestPhone", "guestName"].forEach(
          (k) => delete d[k],
        );
      }
      return event;
    },
  });
}
```

- [ ] **Step 2:** Call `initSentry()` before rendering app; wrap root with `Sentry.wrap` or ErrorBoundary from Sentry SDK docs for RN.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/shared/telemetry mobile/src/providers/AppProviders.tsx
git commit -m "feat(mobile): Sentry init with PII scrub"
```

---

### Task P0-7: Theme catalog (4 light themes) + WCAG contrast tests

**Files:**

- Create: `mobile/src/shared/theme/palette.types.ts`
- Create: `mobile/src/shared/theme/tokens.ts`
- Create: `mobile/src/shared/theme/themes.ts`
- Create: `mobile/src/shared/theme/ThemeProvider.tsx`
- Create: `mobile/src/shared/theme/useTheme.ts`
- Create: `mobile/src/shared/a11y/contrast.ts`
- Create: `mobile/src/shared/a11y/contrast.test.ts`
- Modify: `mobile/src/stores/themeStore.ts` (persist `themeId`)
- Delete: `mobile/src/theme/palettes.ts` after imports updated
- Modify: all components importing old `src/theme/*` → new paths

- [ ] **Step 1: `palette.types.ts`** — use `Palette` type from spec §6.3 exactly.

- [ ] **Step 2: `themes.ts`** — define `THEMES: Palette[]` with four rows from spec §6.4 (`ivoryDate` default), `THEMES_MAP`, `DEFAULT_LIGHT_ID`.

- [ ] **Step 3: `contrast.ts`** — relative luminance + ratio per WCAG.

- [ ] **Step 4: `contrast.test.ts`**

```typescript
import { THEMES } from "../theme/themes";
import { contrastRatio } from "./contrast";

describe("WCAG AA contrast", () => {
  for (const th of THEMES) {
    it(`${th.id} text on bg >= 4.5`, () => {
      expect(contrastRatio(th.text, th.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(th.textSoft, th.bg)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
```

Run:

```bash
cd mobile && npx jest src/shared/a11y/contrast.test.ts
```

Expected: PASS.

- [ ] **Step 5: Wire `ThemeProvider`** — `StatusBar` style from `palette.kind`; children via context.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/shared/theme mobile/src/shared/a11y mobile/src/stores/themeStore.ts
git commit -m "feat(mobile): theme catalog + WCAG contrast tests"
```

---

### Task P0-8: Real OTP login + `GET /api/v1/me` bootstrap

**Files:**

- Modify: `mobile/app/(auth)/login.tsx`
- Modify: `mobile/src/stores/authStore.ts`
- Modify: `mobile/src/api/types.ts` (DTOs for `MeResponse`, `VerifyOtpResponse`)
- Create: `mobile/src/api/auth.ts` — `requestOtp`, `verifyOtp`, `fetchMe`

- [ ] **Step 1: Types** — `VerifyOtpResponse` matches backend: `{ tokenPair, user: { id, phone, displayName?, role, sessionId?, masterProfileId? }, isNew }`. `MeResponse` — reuse shape from web `frontend` or infer from `GetMe` service (copy fields needed for roles).

- [ ] **Step 2: `login.tsx`** — remove `setTimeout` mocks; call `POST AUTH.requestOTP` with `{ phone: normalizedE164, channel: 'sms' }`; verify step `POST AUTH.verifyOTP` with `{ phone, code }`; store `tokenPair` in SecureStore + zustand; then `GET USER.me` with bearer; `setUser(me)`.

- [ ] **Step 3: Gate** — if user has no `masterProfileId` and spec requires master app, show blocking screen «Нужен профиль мастера» (align with product).

Run manual: backend up, request OTP, verify dev code if enabled.

- [ ] **Step 4: Commit**

```bash
git add mobile/app/\(auth\)/login.tsx mobile/src/stores/authStore.ts mobile/src/api/types.ts mobile/src/api/auth.ts
git commit -m "feat(mobile): real OTP flow and me bootstrap"
```

---

### Task P0-9: Biometric gate (cold start + background 5 min)

**Files:**

- Create: `mobile/src/features/app-lock/BiometricGate.tsx`
- Create: `mobile/app/(auth)/biometric-prompt.tsx` (optional route)
- Modify: `mobile/app/_layout.tsx`

Use `expo-local-authentication`: after tokens exist and `biometricEnabled`, require auth before `(tabs)`.

- [ ] **Step 1: Implement gate** with `AppState` listener for background time.

- [ ] **Step 2: Commit**

```bash
git add mobile/src/features/app-lock mobile/app
git commit -m "feat(mobile): biometric app lock gate"
```

---

### Task P0-10: i18n skeleton + `no-restricted-syntax` for literals (incremental)

**Files:**

- Create: `mobile/src/shared/i18n/i18n.ts`
- Create: `mobile/src/shared/i18n/locales/ru.json` (namespace keys: `auth.*`, `errors.*`, `offline.*`)
- Modify: `mobile/eslint.config.js` or `.eslintrc` — rule to forbid raw Cyrillic in JSX (project-specific; if too noisy, start with `warn`).

- [ ] **Step 1: Init i18next** in `AppProviders`.

- [ ] **Step 2: Commit**

```bash
git add mobile/src/shared/i18n mobile/eslint.config.js
git commit -m "feat(mobile): i18next ru skeleton"
```

---

### Task P0-11: Delete `Beautica_design/` + remove mock scaffold where unused

**Files:**

- Delete: `Beautica_design/` (whole tree)

- [ ] **Step 1:**

```bash
git rm -r Beautica_design
git commit -m "chore: remove rejected Beautica_design mockups"
```

---

### Task P0-12: Pre-commit grep gate (no inline DATA mocks)

**Files:**

- Create: `mobile/scripts/no-inline-mocks.sh`
- Modify: root `package.json` or `Makefile` — wire `lint:mobile-mocks`

Script content (example):

```bash
#!/usr/bin/env bash
set -euo pipefail
if rg -n "const\\s+(DATA|CLIENTS|MOCK_|FAKE_|events)\\s*=" mobile/src mobile/app; then
  echo "Inline mock constants forbidden; use API + React Query"
  exit 1
fi
```

- [ ] **Step 1:** `chmod +x mobile/scripts/no-inline-mocks.sh`

- [ ] **Step 2:** Add npm script `"check:mocks": "bash scripts/no-inline-mocks.sh"` in `mobile/package.json`.

- [ ] **Step 3: Commit**

```bash
git add mobile/scripts/no-inline-mocks.sh mobile/package.json
git commit -m "chore(mobile): block inline mock arrays in src/app"
```

---

### Task P0-13: Navigation shell — 4 tabs + header pattern + delete old 5-tab files

**Files:**

- Modify: `mobile/app/(tabs)/_layout.tsx` — four routes: `today` → `index.tsx` or `today.tsx`, `calendar`, `records`, `clients`.
- Delete or repurpose: extra tab files from old shell (`services`, `notifications` as tabs — remove; services lives in Bento → settings stack).
- Create: `mobile/src/components/shell/AppHeader.tsx` — avatar 40, centered title `DMSerifDisplay` 22, bell with badge.

- [ ] **Step 1:** Implement tabs per spec §4.2.

- [ ] **Step 2: Commit**

```bash
git add mobile/app/\(tabs\)
git commit -m "feat(mobile): four-tab shell and header pattern"
```

---

## Phase 1 — Read screens online + backend N1 (v0.6.0-staging)

### Task P1-1 (backend): `GET /api/v1/master-dashboard/today` — N1

**Files:**

- Modify: `backend/internal/service/master_dashboard.go` — add `GetTodaySummary(ctx, userID, date time.Time) (*TodaySummaryDTO, error)`
- Modify: `backend/internal/controller/master_dashboard_controller.go` — `case "today":`
- Create: `backend/internal/service/master_dashboard_today_test.go` (golden / table test)
- Modify: `backend/internal/infrastructure/persistence/*` if new queries needed

Response JSON exactly per spec §7.6 N1. Use `appointment.total_cents` for revenue where migration `000033` exists; if column missing in env under test, skip revenue assertion with build tag — **prefer** real migration applied in test DB.

- [ ] **Step 1: Write failing test** — `TestGetTodaySummary_Shape` expecting JSON keys.

- [ ] **Step 2: Run**

```bash
cd backend && go test ./internal/service/... -run Today -count=1
```

Expected: FAIL (no method).

- [ ] **Step 3: Implement service + controller branch**

`case "today":` if `len(parts)==1 && GET` → parse `?date=YYYY-MM-DD` default Moscow today (document timezone choice in code comment: use `Europe/Moscow` or UTC per product).

- [ ] **Step 4: Run**

```bash
cd backend && go test ./...
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/service/master_dashboard.go backend/internal/controller/master_dashboard_controller.go backend/internal/service/master_dashboard_today_test.go
git commit -m "feat(api): master-dashboard today KPI summary (N1)"
```

---

### Task P1-2 (mobile): Bento Today screen + `useTodayQuery`

**Files:**

- Create: `mobile/src/entities/today/api.ts`
- Create: `mobile/app/(tabs)/index.tsx` (or `today.tsx`) — Bento layout
- Delete: inline mock data from old dashboard index if any

- [ ] **Step 1: `useTodayQuery`**

```typescript
export function useTodayQuery(date: string) {
  return useQuery({
    queryKey: ["today", { date }],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `${MASTER.today}?date=${encodeURIComponent(date)}`,
      );
      return data;
    },
  });
}
```

- [ ] **Step 2: UI** — hero KPI uses **Calistoga** only for numbers; tiles navigate via `router.push` to settings/services/finances etc.

- [ ] **Step 3: Run**

```bash
cd mobile && npm run lint && bash scripts/no-inline-mocks.sh
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/entities/today mobile/app/\(tabs\)/index.tsx
git commit -m "feat(mobile): Today bento wired to N1 API"
```

---

### Task P1-3 (mobile): Profile / Me screen (real API)

**Files:**

- Create: `mobile/src/entities/me/api.ts`
- Modify: `mobile/app/(tabs)/profile.tsx` → move to `mobile/app/(settings)/profile.tsx` if needed
- Wire `useMeQuery` with key `['me']`, persist allowed.

- [ ] **Step 1: Implement**

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(mobile): profile screen from GET /api/v1/me"
```

---

### Task P1-4 (mobile): Records list (appointments) — no mocks

**Files:**

- Modify: `mobile/app/(tabs)/appointments.tsx` → rename route to `records.tsx` under `(tabs)`
- Create: `mobile/src/entities/appointments/api.ts` — list with `from`, `to`, `status`, pagination

Use backend query params `from`/`to` as **date** strings `YYYY-MM-DD`, not `startsAfter`.

- [ ] **Step 1: Implement list UI** — filters: upcoming / past / cancelled / all mapped to `status` query.

- [ ] **Step 2: Skeleton + empty + error** states.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(mobile): records list from master-dashboard appointments"
```

---

## Phase 2 — Calendar + N3 heatmap (v0.7.0-staging)

### Task P2-1 (backend): `GET /api/v1/master-dashboard/appointments/heatmap` — N3

**Files:**

- Modify: `backend/internal/controller/master_dashboard_controller.go` — e.g. `appointments/heatmap` subpath or query on appointments (cleanest: `if len(parts)==2 && parts[0]=="appointments" && parts[1]=="heatmap"`)

- [ ] **Step 1: Test** expecting `{ month, days: [{date,count}], maxPerDay }`.

- [ ] **Step 2: SQL** — `date_trunc('day', starts_at)` grouped counts for master’s visible appointments (same visibility rules as list).

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(api): appointments heatmap for calendar month (N3)"
```

---

### Task P2-2 (mobile): Remove `CalendarGrid.tsx`; add calendar kit provider

**Files:**

- Delete: `mobile/src/components/calendar/CalendarGrid.tsx`
- Create: `mobile/src/features/calendar/MasterCalendar.tsx` wrapping `@howljs/react-native-calendar-kit`
- Modify: `mobile/app/(tabs)/calendar.tsx`

- [ ] **Step 1:** Day / week modes; **multi-master** `type="resource"` only if `role` admin (from `me`).

- [ ] **Step 2:** Off-hours dimming via theme `surface` alpha; now-line + autoscroll per library docs.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(mobile): calendar kit day/week/multi-master"
```

---

### Task P2-3 (mobile): `useRescheduleAppointment` + optimistic PUT

**Files:**

- Create: `mobile/src/features/reschedule/useRescheduleAppointment.ts`

Implementation:

```typescript
export function useRescheduleAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, startsAt }: { id: string; startsAt: string }) => {
      await apiClient.put(MASTER.appointment(id), { startsAt });
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["appointments"] });
      const prev = qc.getQueriesData({ queryKey: ["appointments"] });
      // snapshot + patch cached items’ startsAt
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}
```

On `409` from backend: if not implemented, map `jsonError` body — show toast «Пересечение».

- [ ] **Step 1: Add mutation** + connect to calendar drag end.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(mobile): optimistic appointment reschedule"
```

---

### Task P2-4 (mobile): Long-press sheet + quick actions

**Files:**

- Create: `mobile/src/features/calendar/AppointmentQuickActionsSheet.tsx` using `@gorhom/bottom-sheet`

Wire actions to `PATCH` status, `Linking.openURL` for tel/sms, navigation to client sheet.

- [ ] **Step 1: Commit**

```bash
git commit -m "feat(mobile): calendar long-press quick actions"
```

---

### Task P2-5 (mobile): Month heatmap control (~150 LOC)

**Files:**

- Create: `mobile/src/features/calendar/MonthHeatmap.tsx`
- `useQuery` key `['appointmentsHeatmap', { month }]`

- [ ] **Step 1: Commit**

```bash
git commit -m "feat(mobile): month heatmap from N3"
```

---

## Phase 3 — Clients + Services (v0.8.0-staging)

### Task P3-1 (mobile): Clients list + segments

**Files:**

- Modify: `mobile/app/(tabs)/clients.tsx`
- Create: `mobile/src/entities/clients/api.ts`

If N5 not implemented: compute `segment` client-side from `visitsCount` / `lastVisitAt` if API returns fields; else stub segments from **server** list only (no fabricated array — derive from response).

- [ ] **Step 1: Remove `CLIENTS` constant** — grep clean.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(mobile): clients from API with segments"
```

---

### Task P3-2 (mobile): Services screen

**Files:**

- Modify: `mobile/app/(settings)/services.tsx` or Bento destination
- `useQuery` `['services']` → `GET MASTER.services`

- [ ] **Step 1: Commit**

```bash
git commit -m "feat(mobile): services list from API"
```

---

## Phase 4 — Notifications + Finances + Admin + N2 push (v0.9.0-staging)

### Task P4-1 (mobile): Notifications inbox + SSE

**Files:**

- Create: `mobile/src/entities/notifications/api.ts`
- Modify: `mobile/app/(settings)/notifications.tsx`
- Create: `mobile/src/features/notifications/useNotificationStream.ts` — `EventSource` or polyfill; if RN lacks SSE, implement **polling fallback** every 30s with `refetch` on `NOTIFICATIONS.unreadCount`.

- [ ] **Step 1: List + unread badge** in header.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(mobile): notifications list and stream fallback"
```

---

### Task P4-2 (mobile): Finances summary screen

**Files:**

- Create: `mobile/app/(settings)/finances.tsx`
- `useQuery` `['financesSummary']`

- [ ] **Step 1: Commit**

```bash
git commit -m "feat(mobile): master finances summary"
```

---

### Task P4-3 (mobile): Salon admin surfaces (dashboard API)

**Files:**

- Create: `mobile/src/api/dashboardClient.ts` — wraps requests with `X-Salon-Id` from zustand `activeSalonIdStore`
- Create screens: `staff`, `schedule`, `salon` under `(settings)` per spec

Reuse web endpoints already on `/api/v1/dashboard/` (discover paths from `frontend/src/shared/api/dashboardApi.ts`).

- [ ] **Step 1: Commit**

```bash
git commit -m "feat(mobile): salon admin screens with X-Salon-Id"
```

---

### Task P4-4 (backend): N2 Expo push worker

**Files:**

- Create: `backend/internal/push/expo_pusher.go`
- Wire domain events: subscribe from existing notification/outbox flow or hook where `appointment.created` etc. already fire
- Modify: `backend/internal/app/app.go` Fx registration
- Create: `backend/internal/push/expo_pusher_test.go` — table test with httptest mock Expo API

Batch ≤100, backoff 1s/5s/30s; on `DeviceNotRegistered` delete device row.

- [ ] **Step 1: Implement worker interface** `PushAppointmentEvent(ctx, payload)`.

- [ ] **Step 2: Run**

```bash
cd backend && go test ./internal/push/...
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(push): Expo batch delivery worker (N2)"
```

---

### Task P4-5 (mobile): Push registration with `expo-notifications`

**Files:**

- Modify: existing device registration flow to call `DEVICES.register` after login with Expo push token

- [ ] **Step 1: Commit**

```bash
git commit -m "feat(mobile): register Expo push token with backend"
```

---

## Phase 5 — Polish + release (v1.0.0)

### Task P5-1: `useGuardedMutation` + offline mutation block

**Files:**

- Create: `mobile/src/shared/query/useGuardedMutation.ts`

```typescript
export function useGuardedMutation<TData, TError, TVariables, TContext>(
  opts: UseMutationOptions<TData, TError, TVariables, TContext>,
  isOnline: boolean,
) {
  return useMutation({
    ...opts,
    mutationFn: isOnline
      ? opts.mutationFn
      : async () => {
          throw new Error("offline");
        },
  });
}
```

Show toast on offline attempt.

- [ ] **Step 1: Commit**

```bash
git commit -m "feat(mobile): block mutations offline"
```

---

### Task P5-2: Maestro / Detox smoke — offline relaunch

**Files:**

- Create: `mobile/e2e/offline-cache.yaml` (Maestro) or Detox test

Scenario: login → load today → airplane mode → kill app → reopen → see cached today + banner.

- [ ] **Step 1: Commit**

```bash
git commit -m "test(mobile): offline cache smoke"
```

---

### Task P5-3: ESLint no hardcoded hex

**Files:**

- Modify: `mobile/eslint.config.js` — rule `no-restricted-syntax` or custom plugin banning `#([0-9a-fA-F]{3}){1,2}\\b` in `src/**/*.tsx` except `themes.ts`.

- [ ] **Step 1: Commit**

```bash
git commit -m "chore(mobile): eslint ban hardcoded hex outside themes"
```

---

### Task P5-4: EAS `eas.json` profiles + CI

**Files:**

- Modify: `mobile/eas.json` per spec §10.2
- Create: `.github/workflows/mobile-ci.yml` — on PR: `cd mobile && npm ci && npm run lint && npx tsc --noEmit && npx jest`

- [ ] **Step 1: Commit**

```bash
git commit -m "ci(mobile): lint typecheck jest on PR"
```

---

### Task P5-5: Vault + status doc update

**Files:**

- Modify: `docs/vault/product/status.md` — bullet under «Последние изменения» for mobile v1 internal release
- Modify: `docs/vault/architecture/code-map.md` — pointer to `mobile/` FSD layout

- [ ] **Step 1: Commit**

```bash
git commit -m "docs(vault): mobile ops app architecture pointers"
```

---

## Self-review (plan author)

**Spec coverage:**

- §1 success criteria → addressed across phases (grep mocks P0-12, RQ everywhere, calendar P2, offline P0-4+P5-2, themes P0-7, OTP P0-8, push P4-4/5, Sentry P0-6, EAS P5-4).
- §5 calendar → P2 tasks (library, drag, sheet, heatmap).
- §7 API → P0-2/3, per-phase screens; N1 P1-1, N2 P4-4, N3 P2-1, N4 optional (add separate small task: `swag init` + `openapi-typescript` when backend ready), N5 optional in P3-1.
- §8 offline → persist allowlist P0-4, banner P0-5, guarded mutations P5-1.
- §9 i18n/a11y/biometric/Sentry → P0-7, P0-9, P0-6, P0-10, P5-3.

**Placeholder scan:** No TBD/TODO left; places that need SDK verification (SSE) have explicit polling fallback.

**Type consistency:** Reschedule uses **PUT** `MASTER.appointment(id)` with `{ startsAt }` matching `masterPutApptBody`; list queries use `from`/`to` not spec’s `startsAfter`.

**Known gaps to add if product confirms:** DELETE appointment + undo toast — not in current backend; plan uses cancel status only.

---

## Plan complete and saved to `docs/superpowers/plans/2026-05-06-mobile-redesign-and-api-replacement.md`

**Two execution options:**

1. **Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration. **REQUIRED SUB-SKILL:** superpowers:subagent-driven-development.

2. **Inline execution** — Run tasks in this session using checkpoints. **REQUIRED SUB-SKILL:** superpowers:executing-plans.

**Which approach do you want?**
