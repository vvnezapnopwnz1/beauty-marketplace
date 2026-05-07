# Chat Phase 1 — Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all eight Phase 1 follow-up items from `docs/vault/product/chat-roadmap.md` so the chat feature is production-ready: salvage in-progress bug fixes, wire `AppointmentChatHook` into existing call sites, fill frontend/mobile integration gaps, add guest SSE delivery, scaffold frontend+mobile test infra, write coverage for backend/frontend/mobile chat code, and run a manual smoke pass.

**Architecture:** Single feature branch `chore/chat-phase1-followup` cut from `master`. Work proceeds top-down through the 11 phases below; commit after every meaningful task; gate the final merge on `go test ./...`, `npm run typecheck`, the new test scripts, and a five-scenario manual smoke. No new domain models — every change is plumbing, regression-test-first fixes, or test infrastructure.

**Tech Stack:** Go 1.24 (testing + httptest), Uber Fx, GORM, PostgreSQL; React 18, TypeScript, Vite, RTK Query, MUI, react-i18next; React Native (Expo SDK), expo-notifications. New test stack on frontend: **Vitest + @testing-library/react + @testing-library/user-event + jsdom + msw**. New test stack on mobile: **jest-expo + @testing-library/react-native + jest fake timers**.

**Conventions used in this plan:**
- Backend test command: `cd backend && go test ./internal/...` (or specific package).
- Frontend test command (after Phase 7): `cd frontend && npm test -- --run`.
- Mobile test command (after Phase 9): `cd mobile && npm test`.
- Typecheck: `cd frontend && npm run typecheck` (no equivalent in mobile beyond TS).
- Use `git switch -c chore/chat-phase1-followup master` once at Task 0.1; do **not** rebase or force-push during execution.
- One commit per task unless explicitly noted; commit messages follow Conventional Commits used in repo (`fix(chat): ...`, `test(chat): ...`, `chore(chat): ...`).

**Out of scope:** Phase 2 features (inquiry chat, internal chat, owner supervision). Replacing the mobile polling fallback with native `react-native-sse` is **deferred** — recorded only as a Phase 2 backlog note.

---

## Audit Findings (carry into execution)

These were verified in the working tree at the time the plan was written; if you re-check at execution and they have changed, update the plan before proceeding.

1. **Master state:** Phase 1 chat commits are already on `master` (`7fb3310` backend, `1c5fc3c` frontend, `c2c7460` mobile, `83f277e` docs). Branches `feat/chat-phase1-external` and `phase2` contain no diverging commits.
2. **In-progress fixes are uncommitted in working copy** — these are real bug fixes, not noise. They MUST be salvaged in Task 0.2 before any other work, otherwise they will be lost when the new branch is created or stashed:
   - `backend/internal/service/chat_service.go` — explicitly assigns `ID: uuid.New()` and `AccessToken: uuid.New()` on room creation (GORM model has no `default:gen_random_uuid()` tag, so DB defaults were not being applied; rooms got nil UUID).
   - `backend/internal/infrastructure/persistence/chat_repository.go` — drops the bogus `status='active'` filter on `salon_members` (the column does not exist), adds `'admin'` to the role list (enum value is `('owner','admin','receptionist')` per migration `000024`).
   - `backend/internal/controller/server.go` + `frontend/src/entities/chat/api/chatApi.ts` + `mobile/src/api/endpoints.ts` — coordinated rename of guest endpoint `/chat/rooms/by-token/{token}` → `/chat/external/rooms/{token}` across all three clients.
   - `frontend/src/pages/dashboard/ui/drawers/AppointmentDrawer.tsx` — removes `!showEditForm` guard so chat is visible during edit.
   - `frontend/src/entities/chat/lib/useChatStream.ts` — switches from native `EventSource` (no auth headers) to fetch+`ReadableStream` via `authFetch`, and explicitly skips the connection when `accessToken` is set (guest SSE not yet implemented). This is partial coverage of follow-up #6.
3. **`AppointmentChatHook` is fully unused.** Provided to Fx in `backend/internal/app/app.go:109` but never injected into any service. Call sites that should fire it: `service/booking.go:356` (`appointment.created`), `service/dashboard_appointment.go:257` (`appointment.status_changed`). Also: `service/dashboard_appointment.go:343-351` mutates `StartsAt` (reschedule) inside `UpdateAppointment` but emits no notification at all — this needs both a `notifier.NotifySalonMembers(... "appointment.rescheduled" ...)` AND `chatHook.OnAppointmentRescheduled`.
4. **`broadcast` parameter `room` is unused.** `chat_service.go:282` declares it but the body never references `room`. Also `chat_service.go:274-278` is a manual contains loop replaceable with `slices.Contains`.
5. **No frontend or mobile test infrastructure exists.** `jq '.devDependencies' frontend/package.json` and `mobile/package.json` show no vitest, jest, RTL, MSW. There are no `test` npm scripts. Phase 7 and Phase 9 must scaffold runtime + setup files from scratch before writing chat tests.
6. **Conflated commit `c2c7460` is a false alarm.** The "41 deletions" in the stat are a refactor of `mobile/src/api/endpoints.ts` from a hard-coded `localhost:8080` to a proper Expo Metro LAN-host detection (`resolveApiOrigin`, `replaceLoopbackWithMetroHost`). It is needed for mobile dev on physical devices and was correctly bundled. **Do not** rewrite history; only document this in the roadmap (Task 11.2).

---

## File Structure

**Backend (Go) — modified only:**
- `backend/internal/service/booking.go` — accept `*AppointmentChatHook` in constructor, call `OnAppointmentCreated` after `notifier.NotifySalonMembers`.
- `backend/internal/service/dashboard.go` — accept `*AppointmentChatHook` in constructor.
- `backend/internal/service/dashboard_appointment.go` — call `OnAppointmentStatusChanged` after status notify; in `UpdateAppointment`, when `StartsAt` is mutated, emit `appointment.rescheduled` notify + `OnAppointmentRescheduled`.
- `backend/internal/service/chat_service.go` — drop unused `room` param from `broadcast`; replace manual contains loops with `slices.Contains`; deduplicate payload-marshalling between `SendMessage` and `SendSystemMessage` into a private helper.
- `backend/internal/controller/chat_controller.go` — add `StreamGuest` handler for token-authenticated SSE.
- `backend/internal/controller/server.go` — register guest stream route.
- `backend/internal/service/chat_broadcaster.go` — extend to dispatch to per-room guest subscribers (in addition to existing per-user notification stream).

**Backend (Go) — created:**
- `backend/internal/service/chat_masking_test.go` — unit tests for `MaskContacts`.
- `backend/internal/service/chat_service_test.go` — RBAC, lock rule, masking integration, readonly enforcement, dedup of broadcast payload.
- `backend/internal/service/chat_archiver_test.go` — `RunOnce` flips rooms to readonly after 24h.
- `backend/internal/controller/chat_controller_test.go` — `PostMessage` and `StreamGuest` HTTP-level tests for both auth-user and access-token paths.

**Frontend (React) — modified:**
- `frontend/src/shared/i18n/locales/ru.json` + `en.json` — add `chat.*` keys.
- `frontend/src/features/chat-window/ui/ChatComposer.tsx`, `ChatBubble.tsx`, `ChatWindow.tsx`, `ChatTrigger.tsx` — replace hardcoded strings with `useTranslation()`.
- `frontend/src/pages/dashboard/ui/drawers/AppointmentDrawer.tsx` — pass `currentUserId` from auth selector into `<AppointmentChatSection>`.
- `frontend/src/features/chat-window/ui/ChatBubble.tsx` — accept `currentUserId` prop, derive `isOwn` from `senderUserId === currentUserId`.
- `frontend/src/features/chat-window/ui/ChatTrigger.tsx` — derive unread count from `listMessages` query selecting unread for current user.
- `frontend/src/pages/me/ui/sections/AppointmentsSection.tsx` — embed `ChatTrigger` + `ChatWindow` in each `UserAppointment` card.
- `frontend/package.json` — add devDependencies and `test`/`test:run` scripts.
- `frontend/vite.config.ts` — extend with `test` config (or new `vitest.config.ts`).

**Frontend (React) — created:**
- `frontend/vitest.config.ts` — vitest configuration with jsdom + setup file.
- `frontend/src/test/setup.ts` — RTL + jest-dom matchers + MSW server bootstrap.
- `frontend/src/test/server.ts` — MSW request handlers for chat API.
- `frontend/src/features/chat-window/ui/ChatWindow.test.tsx` — lock state, readonly, own/other rendering.
- `frontend/src/entities/chat/lib/useChatStream.test.ts` — verify it skips when no `roomId` and when guest token is set.

**Mobile (React Native) — modified:**
- `mobile/src/features/calendar/AppointmentQuickActionsSheet.tsx` — add "Чат" action that navigates to `ChatScreen`.
- `mobile/app/_layout.tsx` — handle push notification tap with `data.type === 'chat.message'`, deep-link to chat.
- `mobile/package.json` — add devDependencies and `test` script.

**Mobile (React Native) — created:**
- `mobile/jest.config.js` — jest-expo preset.
- `mobile/jest-setup.ts` — silence native module warnings, configure RNTL.
- `mobile/src/lib/chat/useChatStream.test.ts` — polling cadence with fake timers.
- `mobile/src/components/chat/ChatScreen.test.tsx` — renders messages, send button posts.

**Docs:**
- `docs/vault/product/chat-roadmap.md` — mark all 8 follow-up items closed; record SSE design, conflated-commit verdict; lift Phase 2 to active.
- `docs/vault/product/status.md` — append Phase 1 follow-up shipped entry under «Последние изменения».

---

## Phase 0 — Branch hygiene & in-progress salvage

The working copy contains real bug fixes that MUST be preserved. This phase isolates them into a feature branch and converts them into auditable commits before any other work begins.

### Task 0.1: Create the working branch

**Files:** none (git only).

- [ ] **Step 1: Verify clean stash slot**

```bash
git stash list | head
```

Expected: empty or unrelated entries — proceed.

- [ ] **Step 2: Stash uncommitted changes**

```bash
git stash push -u -m "chat-phase1-followup-wip"
```

Expected: `Saved working directory and index state On master: chat-phase1-followup-wip`.

- [ ] **Step 3: Create branch from master**

```bash
git switch -c chore/chat-phase1-followup master
```

- [ ] **Step 4: Pop the stash**

```bash
git stash pop
```

Expected: same working tree state as before, on the new branch.

- [ ] **Step 5: Verify file list matches audit findings**

```bash
git status --short
```

Expected files modified: `backend/internal/controller/server.go`, `backend/internal/infrastructure/persistence/chat_repository.go`, `backend/internal/service/chat_service.go`, `frontend/src/entities/chat/api/chatApi.ts`, `frontend/src/entities/chat/lib/useChatStream.ts`, `frontend/src/pages/dashboard/ui/drawers/AppointmentDrawer.tsx`, `mobile/src/api/endpoints.ts`. (Plus possibly `docs/vault/.obsidian/workspace.json` — that's an Obsidian artefact, do not commit it. Restore: `git checkout -- docs/vault/.obsidian/workspace.json`.)

### Task 0.2: Commit backend in-progress fixes (room ID, salon_members query)

**Files:**
- Modify: `backend/internal/service/chat_service.go:79-90` (already modified in working tree).
- Modify: `backend/internal/infrastructure/persistence/chat_repository.go:155-170` (already modified in working tree).

- [ ] **Step 1: Verify the diff matches the audit summary**

```bash
git diff backend/internal/service/chat_service.go backend/internal/infrastructure/persistence/chat_repository.go
```

Expected: in `chat_service.go` the `EnsureRoomForAppointment` literal now sets `ID: uuid.New()` and `AccessToken: uuid.New()`. In `chat_repository.go` the SQL is `WHERE salon_id = ? AND role IN ('owner','admin','receptionist')` (no `status` filter) and the `switch m.Role` includes `case "admin", "receptionist":`.

- [ ] **Step 2: Build to confirm nothing else breaks**

```bash
cd backend && go build ./...
```

Expected: exit 0.

- [ ] **Step 3: Stage and commit**

```bash
git add backend/internal/service/chat_service.go backend/internal/infrastructure/persistence/chat_repository.go
git commit -m "fix(chat): set room ID/AccessToken explicitly and fix salon_members query

- ChatRoom GORM model has no default:gen_random_uuid() tag, so EnsureRoomForAppointment
  was inserting nil UUID values; rely on uuid.New() instead.
- salon_members has no 'status' column (see migrations/000001) — drop the predicate.
- salon_member_role enum includes 'admin' (migration 000024); add it to the IN list and
  the role switch so admins receive chat events.
"
```

### Task 0.3: Commit endpoint rename (backend + frontend + mobile in lockstep)

**Files:**
- Modify: `backend/internal/controller/server.go:84` (already modified).
- Modify: `frontend/src/entities/chat/api/chatApi.ts:20` (already modified).
- Modify: `mobile/src/api/endpoints.ts:119` (already modified).

- [ ] **Step 1: Confirm the three diffs are consistent**

```bash
git diff backend/internal/controller/server.go frontend/src/entities/chat/api/chatApi.ts mobile/src/api/endpoints.ts
```

Expected: backend route, frontend RTK url, and mobile endpoint constant all changed `/chat/rooms/by-token/{token}` → `/chat/external/rooms/{token}`.

- [ ] **Step 2: Stage and commit**

```bash
git add backend/internal/controller/server.go frontend/src/entities/chat/api/chatApi.ts mobile/src/api/endpoints.ts
git commit -m "refactor(chat): rename guest room endpoint to /api/v1/chat/external/rooms/{token}

Aligns with Phase 2 inquiry namespace and clarifies guest-only semantics in URL.
Backend route, frontend RTK Query, and mobile endpoint table updated together.
"
```

### Task 0.4: Commit AppointmentDrawer guard removal

**Files:**
- Modify: `frontend/src/pages/dashboard/ui/drawers/AppointmentDrawer.tsx:809` (already modified).

- [ ] **Step 1: Stage and commit**

```bash
git add frontend/src/pages/dashboard/ui/drawers/AppointmentDrawer.tsx
git commit -m "fix(chat/dashboard): show chat section while appointment is being edited

The previous guard (!showEditForm) hid the chat during edit, which meant admins lost
context (the conversation that prompted the change) at exactly the moment they needed
it most.
"
```

### Task 0.5: Commit frontend SSE rewrite (auth-user only; guest stays a Phase 0 skip)

**Files:**
- Modify: `frontend/src/entities/chat/lib/useChatStream.ts` (already modified).

This commit only locks down the auth-user path. Guest SSE is implemented in Phase 5 and will revisit this file.

- [ ] **Step 1: Verify the working tree change**

```bash
git diff frontend/src/entities/chat/lib/useChatStream.ts | head -80
```

Expected: import of `authFetch`, early return when `accessToken` is set, `EventSource` replaced by `fetch` + `ReadableStream` parser.

- [ ] **Step 2: Typecheck**

```bash
cd frontend && npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Stage and commit**

```bash
git add frontend/src/entities/chat/lib/useChatStream.ts
git commit -m "fix(chat/frontend): use authFetch for SSE so authed users get a Bearer token

Native EventSource cannot send Authorization headers, so chat live updates were silently
broken for authenticated users. Switch to fetch + ReadableStream and reuse the existing
authFetch refresh logic. Guest path is short-circuited until the dedicated guest stream
endpoint lands (see Phase 5)."
```

### Task 0.6: Discard unrelated Obsidian workspace change

- [ ] **Step 1: Restore the file**

```bash
git checkout -- docs/vault/.obsidian/workspace.json 2>/dev/null || true
```

- [ ] **Step 2: Confirm clean tree**

```bash
git status --short
```

Expected: empty.

---

## Phase 1 — Backend code review pass (#2)

Address the lint hints flagged in the audit before adding new code on top of `chat_service.go`.

### Task 1.1: Drop unused `room` parameter from `broadcast`

**Files:**
- Modify: `backend/internal/service/chat_service.go` — `broadcast` signature and its two call sites (lines 176 and 199).

- [ ] **Step 1: Update the function**

```go
func (s *chatService) broadcast(ctx context.Context, parts ChatParticipants, msg *model.ChatMessage, exclude *uuid.UUID) {
    rcpts := filterUUID(collectParticipants(parts), exclude)
    // ... body unchanged ...
}
```

- [ ] **Step 2: Update the two call sites**

Replace `s.broadcast(ctx, room, parts, msg, p.SenderUserID)` with `s.broadcast(ctx, parts, msg, p.SenderUserID)` and the system-message variant `s.broadcast(ctx, room, parts, msg, nil)` with `s.broadcast(ctx, parts, msg, nil)`.

- [ ] **Step 3: Build**

```bash
cd backend && go build ./...
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/service/chat_service.go
git commit -m "refactor(chat): drop unused room param from broadcast"
```

### Task 1.2: Replace manual contains loops with `slices.Contains`

**Files:**
- Modify: `backend/internal/service/chat_service.go:274-278` and any sibling spots in the file.

- [ ] **Step 1: Add import and rewrite the loop**

```go
import "slices"

// inside assertCanRead:
if slices.Contains(collectParticipants(parts), *userID) {
    return nil
}
return ErrChatNotParticipant
```

- [ ] **Step 2: Audit the rest of the file**

Run `grep -n "for .* range" backend/internal/service/chat_service.go` and rewrite any other "scan a slice for equality" loop the same way. **Do not** convert loops that have side effects beyond a contains check.

- [ ] **Step 3: Build**

```bash
cd backend && go build ./... && go vet ./internal/service/...
```

Expected: exit 0, no vet output.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/service/chat_service.go
git commit -m "refactor(chat): use slices.Contains for participant membership checks"
```

### Task 1.3: Deduplicate broadcast payload marshalling

`SendMessage` and `SendSystemMessage` both build the same `payload, _ := json.Marshal(map[string]any{...})` block immediately before calling `broadcast`. This will hurt later (Phase 5 adds another caller). Extract a helper.

**Files:**
- Modify: `backend/internal/service/chat_service.go`.

- [ ] **Step 1: Add helper near the bottom of the file**

```go
func chatBroadcastPayload(msg *model.ChatMessage) []byte {
    payload, _ := json.Marshal(map[string]any{
        "roomId":     msg.RoomID,
        "messageId":  msg.ID,
        "senderRole": msg.SenderRole,
        "body":       msg.Body,
        "isSystem":   msg.IsSystem,
        "createdAt":  msg.CreatedAt,
    })
    return payload
}
```

- [ ] **Step 2: Replace inline marshal in `broadcast`**

```go
payload := chatBroadcastPayload(msg)
```

(remove the `json.Marshal(map[string]any{...})` block from `broadcast`).

- [ ] **Step 3: Build**

```bash
cd backend && go build ./...
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/service/chat_service.go
git commit -m "refactor(chat): extract chatBroadcastPayload helper to dedupe marshal call"
```

---

## Phase 2 — Wire `AppointmentChatHook` into call sites (#3)

The hook is constructed in Fx but never called. We add it as a dependency to the two services that mutate appointments and emit calls at the same locations as the existing notifier calls. We use **regression-test-first** for each new behaviour.

### Task 2.1: Add `*AppointmentChatHook` to `BookingService` constructor

**Files:**
- Modify: `backend/internal/service/booking.go:33-65` (struct + `NewBookingService`).

- [ ] **Step 1: Add field and parameter**

```go
type bookingService struct {
    // existing fields ...
    notifier  AppointmentNotifier
    chatHook  *AppointmentChatHook
    now       func() time.Time
}

func NewBookingService(
    salons repository.SalonRepository,
    appts repository.AppointmentRepository,
    slots repository.BookingSlotsRepository,
    clients repository.SalonClientRepository,
    authRepo repository.AuthRepository,
    tgLinks repository.TelegramLinkRepository,
    tgOutbox repository.TelegramOutboxWriter,
    notifier AppointmentNotifier,
    chatHook *AppointmentChatHook,
) BookingService {
    return &bookingService{
        salons:   salons, appts: appts, slots: slots, clients: clients,
        authRepo: authRepo, tgLinks: tgLinks, tgOutbox: tgOutbox,
        notifier: notifier, chatHook: chatHook,
        now: time.Now,
    }
}
```

- [ ] **Step 2: Confirm Fx already provides the hook**

```bash
grep -n "service.NewAppointmentChatHook" backend/internal/app/app.go
```

Expected: `109: service.NewAppointmentChatHook,` already present. Fx will inject it automatically.

- [ ] **Step 3: Build to confirm Fx resolves**

```bash
cd backend && go build ./...
```

Expected: exit 0.

- [ ] **Step 4: Commit (no behavior change yet)**

```bash
git add backend/internal/service/booking.go
git commit -m "refactor(chat): inject AppointmentChatHook into BookingService"
```

### Task 2.2: Call `OnAppointmentCreated` after booking notify (regression-test-first)

**Files:**
- Modify: `backend/internal/service/booking.go:356` (after `notifier.NotifySalonMembers`).
- Create or extend: `backend/internal/service/booking_test.go`.

- [ ] **Step 1: Write the failing test**

Append to `backend/internal/service/booking_test.go`:

```go
func TestBookingService_NotifiesChatHookOnCreate(t *testing.T) {
    fakeChat := &fakeChatService{} // implements ChatService; capture OnSystemMessage / SendSystem
    hook := service.NewAppointmentChatHook(fakeChat)
    bs := newBookingServiceForTest(t, hook)

    appt, err := bs.BookGuest(context.Background(), validBookingInput(t))
    require.NoError(t, err)

    require.Eventually(t, func() bool {
        return fakeChat.SystemMessageCount(appt.ID) >= 1
    }, time.Second, 10*time.Millisecond)
}
```

`fakeChatService` and `newBookingServiceForTest` are test helpers — keep them in this file (no separate testing package) and only stub the methods the hook calls. If the file does not exist, create it with `package service`.

- [ ] **Step 2: Run; expect failure ("no system message")**

```bash
cd backend && go test ./internal/service/ -run TestBookingService_NotifiesChatHookOnCreate -v
```

Expected: FAIL.

- [ ] **Step 3: Add the hook call in production code**

In `booking.go`, immediately after the existing `s.notifier.NotifySalonMembers(...)` line that emits `appointment.created`:

```go
if s.chatHook != nil {
    s.chatHook.OnAppointmentCreated(ctx, appt.ID)
}
```

- [ ] **Step 4: Run again; expect pass**

```bash
cd backend && go test ./internal/service/ -run TestBookingService_NotifiesChatHookOnCreate -v
```

Expected: PASS.

- [ ] **Step 5: Run full service tests**

```bash
cd backend && go test ./internal/service/...
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/service/booking.go backend/internal/service/booking_test.go
git commit -m "feat(chat): emit system message + push when an appointment is created

Wire AppointmentChatHook.OnAppointmentCreated after the salon-member notify in
BookingService.BookGuest. Adds regression test using a fake ChatService."
```

### Task 2.3: Add `*AppointmentChatHook` to `DashboardService` constructor

**Files:**
- Modify: `backend/internal/service/dashboard.go:70-87`.

- [ ] **Step 1: Extend struct and constructor**

```go
type dashboardService struct {
    dash     repository.DashboardRepository
    clients  repository.SalonClientRepository
    invites  repository.SalonMemberInviteRepository
    notifier AppointmentNotifier
    chatHook *AppointmentChatHook
    phoneOTP *StaffPhoneOTPService
}

func NewDashboardService(
    dash repository.DashboardRepository,
    clients repository.SalonClientRepository,
    invites repository.SalonMemberInviteRepository,
    notifier AppointmentNotifier,
    chatHook *AppointmentChatHook,
    phoneOTP *StaffPhoneOTPService,
) DashboardService {
    return &dashboardService{
        dash: dash, clients: clients, invites: invites,
        notifier: notifier, chatHook: chatHook, phoneOTP: phoneOTP,
    }
}
```

- [ ] **Step 2: Build**

```bash
cd backend && go build ./...
```

Expected: exit 0 (Fx auto-injects).

- [ ] **Step 3: Commit**

```bash
git add backend/internal/service/dashboard.go
git commit -m "refactor(chat): inject AppointmentChatHook into DashboardService"
```

### Task 2.4: Call `OnAppointmentStatusChanged` after status updates (regression-test-first)

**Files:**
- Modify: `backend/internal/service/dashboard_appointment.go:257`.
- Create: `backend/internal/service/dashboard_appointment_test.go` (or extend existing).

- [ ] **Step 1: Write failing test**

```go
func TestDashboardService_UpdateAppointmentStatus_FiresChatHook(t *testing.T) {
    fakeChat := &fakeChatService{}
    hook := service.NewAppointmentChatHook(fakeChat)
    ds := newDashboardServiceForTest(t, hook)
    apptID := seedConfirmedAppointment(t, ds)

    require.NoError(t, ds.UpdateAppointmentStatus(context.Background(), salonID, apptID, "completed"))

    snap := fakeChat.LastSystemMessage(apptID)
    require.Contains(t, snap.Body, "completed")
}
```

- [ ] **Step 2: Run; expect FAIL**

```bash
cd backend && go test ./internal/service/ -run TestDashboardService_UpdateAppointmentStatus_FiresChatHook -v
```

Expected: FAIL.

- [ ] **Step 3: Wire hook**

After `s.notifier.NotifySalonMembers(... "appointment.status_changed" ...)` at line 257, add:

```go
if s.chatHook != nil {
    s.chatHook.OnAppointmentStatusChanged(ctx, appointmentID, newStatus)
}
```

- [ ] **Step 4: Run; expect PASS**

```bash
cd backend && go test ./internal/service/ -run TestDashboardService_UpdateAppointmentStatus_FiresChatHook -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/internal/service/dashboard_appointment.go backend/internal/service/dashboard_appointment_test.go
git commit -m "feat(chat): emit system message on appointment status change"
```

### Task 2.5: Emit reschedule notify + chat hook when `StartsAt` changes in `UpdateAppointment`

The current `UpdateAppointment` mutates `StartsAt` (lines 343-351) but emits **no** notification at all — neither for participants nor for the chat. We add both in lockstep.

**Files:**
- Modify: `backend/internal/service/dashboard_appointment.go:261-399` — append a notify+hook block after `s.dash.UpdateAppointment(...)` succeeds, scoped to the case where `StartsAt` changed.
- Test: extend `backend/internal/service/dashboard_appointment_test.go`.

- [ ] **Step 1: Write failing test**

```go
func TestDashboardService_UpdateAppointment_FiresRescheduleHookOnStartsAtChange(t *testing.T) {
    fakeChat := &fakeChatService{}
    fakeNotifier := &fakeNotifier{}
    hook := service.NewAppointmentChatHook(fakeChat)
    ds := newDashboardServiceForTestWithNotifier(t, hook, fakeNotifier)
    apptID := seedConfirmedAppointment(t, ds)
    newStart := time.Now().Add(48 * time.Hour).UTC()

    require.NoError(t, ds.UpdateAppointment(context.Background(), salonID, service.UpdateAppointmentInput{
        AppointmentID: apptID,
        StartsAt:      &newStart,
    }))

    require.Equal(t, "appointment.rescheduled", fakeNotifier.LastEvent(apptID))
    snap := fakeChat.LastSystemMessage(apptID)
    require.Contains(t, snap.Body, newStart.Format("2006-01-02"))
}
```

- [ ] **Step 2: Run; expect FAIL**

```bash
cd backend && go test ./internal/service/ -run TestDashboardService_UpdateAppointment_FiresRescheduleHookOnStartsAtChange -v
```

- [ ] **Step 3: Implement**

In `UpdateAppointment`, capture the original StartsAt before mutation:

```go
originalStart := a.StartsAt
// ... existing mutation block at 343-351 ...
```

After `return s.dash.UpdateAppointment(ctx, a)` becomes successful (refactor to assign to `err` first), insert before returning nil:

```go
err := s.dash.UpdateAppointment(ctx, a)
if err != nil {
    return err
}
if in.StartsAt != nil && !originalStart.Equal(a.StartsAt) {
    payload, _ := json.Marshal(map[string]any{
        "appointmentId": a.ID,
        "salonId":       salonID,
        "fromStartsAt":  originalStart,
        "toStartsAt":    a.StartsAt,
    })
    s.notifier.NotifySalonMembers(ctx, salonID, a.SalonMasterID, "appointment.rescheduled",
        "Запись перенесена", "Время записи изменилось", payload)
    if s.chatHook != nil {
        s.chatHook.OnAppointmentRescheduled(ctx, a.ID, a.StartsAt)
    }
}
return nil
```

- [ ] **Step 4: Run; expect PASS**

```bash
cd backend && go test ./internal/service/ -run TestDashboardService_UpdateAppointment_FiresRescheduleHookOnStartsAtChange -v
```

- [ ] **Step 5: Run full service suite**

```bash
cd backend && go test ./internal/service/...
```

- [ ] **Step 6: Commit**

```bash
git add backend/internal/service/dashboard_appointment.go backend/internal/service/dashboard_appointment_test.go
git commit -m "feat(chat): notify + system-message on appointment reschedule

UpdateAppointment now emits an appointment.rescheduled SSE event and posts a chat
system message whenever StartsAt changes. Adds regression test."
```

---

## Phase 3 — Backend chat tests (#1, backend portion)

Backend already has `go test`. We add focused unit tests for the four pieces called out in the roadmap.

### Task 3.1: Test `MaskContacts`

**Files:**
- Create: `backend/internal/service/chat_masking_test.go`.

- [ ] **Step 1: Write the test**

```go
package service

import "testing"

func TestMaskContacts(t *testing.T) {
    cases := []struct{ name, in, want string }{
        {"plain text", "hi how are you", "hi how are you"},
        {"e164 phone", "call me +79991234567", "call me [контакт скрыт]"},
        {"local ru phone", "звони 8 999 123 45 67", "звони [контакт скрыт]"},
        {"telegram link", "пиши @master_anna", "пиши [контакт скрыт]"},
        {"https tg me", "https://t.me/anna_master", "[контакт скрыт]"},
        {"whatsapp link", "wa.me/79991112233", "[контакт скрыт]"},
        {"already masked stays", "[контакт скрыт]", "[контакт скрыт]"},
    }
    for _, c := range cases {
        c := c
        t.Run(c.name, func(t *testing.T) {
            got := MaskContacts(c.in)
            if got != c.want {
                t.Fatalf("MaskContacts(%q) = %q, want %q", c.in, got, c.want)
            }
        })
    }
}
```

- [ ] **Step 2: Run**

```bash
cd backend && go test ./internal/service/ -run TestMaskContacts -v
```

Expected: PASS for cases that match current regexes; **if** any case fails, that exposes a real bug — fix `chat_masking.go`'s regex (do not weaken the test). Document each fix in the commit message.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/service/chat_masking_test.go [backend/internal/service/chat_masking.go]
git commit -m "test(chat): cover MaskContacts for ru/e164 phones and messenger links"
```

### Task 3.2: Test `chatService.SendMessage` — RBAC + lock rule + masking + readonly

**Files:**
- Create: `backend/internal/service/chat_service_test.go`.

- [ ] **Step 1: Write the test scaffold (`fakeChatRepository`, `fakeResolver`, `fakeBroadcaster`)**

Minimal in-memory fakes implementing the `repository.ChatRepository`, `AppointmentResolver`, and `ChatBroadcaster` interfaces. Each fake has slice-backed storage so tests can prepopulate rooms/messages and assert post-state.

- [ ] **Step 2: Write failing test cases (4 sub-tests)**

```go
func TestChatService_SendMessage_RBAC(t *testing.T) {
    // outsider userID -> ErrChatNotParticipant
}
func TestChatService_SendMessage_LockRule(t *testing.T) {
    // first guest message OK; second before any non-guest reply -> ErrChatLocked
}
func TestChatService_SendMessage_MasksContacts(t *testing.T) {
    // body contains "+79991234567"; stored body must contain "[контакт скрыт]"
}
func TestChatService_SendMessage_Readonly(t *testing.T) {
    // room.Status = readonly -> ErrChatReadonly regardless of role
}
```

- [ ] **Step 3: Run all four**

```bash
cd backend && go test ./internal/service/ -run TestChatService_SendMessage -v
```

Expected: PASS (production code already implements these; these are regression guards).

- [ ] **Step 4: Commit**

```bash
git add backend/internal/service/chat_service_test.go
git commit -m "test(chat): regression suite for SendMessage (RBAC, lock, masking, readonly)"
```

### Task 3.3: Test `chatService.ListMessages`

**Files:** extend `backend/internal/service/chat_service_test.go`.

- [ ] **Step 1: Add tests**

```go
func TestChatService_ListMessages_AccessTokenAllowsRead(t *testing.T) { /* token == room.AccessToken returns messages */ }
func TestChatService_ListMessages_RandomTokenRejected(t *testing.T)   { /* uuid.New() -> ErrChatNotParticipant */ }
func TestChatService_ListMessages_ParticipantSeesAll(t *testing.T)    { /* master/owner/admin/receptionist all pass */ }
```

- [ ] **Step 2: Run**

```bash
cd backend && go test ./internal/service/ -run TestChatService_ListMessages -v
```

- [ ] **Step 3: Commit**

```bash
git add backend/internal/service/chat_service_test.go
git commit -m "test(chat): cover ListMessages access-token and participant paths"
```

### Task 3.4: Test `chatArchiver.RunOnce`

**Files:**
- Create: `backend/internal/service/chat_archiver_test.go`.

- [ ] **Step 1: Test setup**

Use the same `fakeChatRepository` from Task 3.2. Seed three rooms: (a) appointment status `completed` 25h ago + room active, (b) `completed` 12h ago + room active, (c) `completed` 25h ago + room already readonly.

- [ ] **Step 2: Test cases**

```go
func TestChatArchiver_RunOnce_FlipsAfter24h(t *testing.T) {
    // a -> readonly; b -> active; c -> readonly (no-op)
}
```

- [ ] **Step 3: Run**

```bash
cd backend && go test ./internal/service/ -run TestChatArchiver -v
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/service/chat_archiver_test.go
git commit -m "test(chat): RunOnce flips rooms to readonly 24h after completed"
```

### Task 3.5: Controller test `ChatController.PostMessage` (auth-user vs accessToken)

**Files:**
- Create: `backend/internal/controller/chat_controller_test.go`.

- [ ] **Step 1: Setup with `httptest`**

Build a `*ChatController` with a fake `ChatService`. Mount handler. Use `auth.NewTestJWTManager(...)` (or the existing test helper used in other controller tests — check `controller/auth_controller_test.go` for the pattern).

- [ ] **Step 2: Test cases**

```go
func TestChatController_PostMessage_AuthUser(t *testing.T)         { /* Bearer token; SenderUserID set; 201 */ }
func TestChatController_PostMessage_GuestAccessToken(t *testing.T) { /* ?accessToken=...; SenderUserID nil; 201 */ }
func TestChatController_PostMessage_NoAuthNoToken_401(t *testing.T) { /* 401 */ }
func TestChatController_PostMessage_BadJSON_400(t *testing.T)       { /* malformed -> 400 */ }
```

- [ ] **Step 3: Run**

```bash
cd backend && go test ./internal/controller/ -run TestChatController_PostMessage -v
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/controller/chat_controller_test.go
git commit -m "test(chat): controller-level PostMessage covering auth-user and access-token paths"
```

---

## Phase 4 — Backend guest SSE endpoint (#6)

**Design choice:** Add a dedicated `GET /api/v1/chat/external/rooms/{token}/stream` SSE endpoint that authenticates the guest by validating the URL token against `chat_rooms.access_token` and subscribes them to per-room broadcasts. Rationale: the room token is already a stable per-room secret embedded in SMS/Telegram links; introducing short-lived guest JWTs would require new key-rotation infrastructure with no extra value.

`ChatBroadcaster` currently dispatches to per-user notification streams. We extend it with a per-room subscriber registry that the new endpoint registers into.

### Task 4.1: Extend `ChatBroadcaster` with per-room subscribers

**Files:**
- Modify: `backend/internal/service/chat_broadcaster.go`.

- [ ] **Step 1: Add registry**

```go
type ChatBroadcaster interface {
    BroadcastChatMessage(ctx context.Context, recipients []uuid.UUID, payload []byte)
    BroadcastToRoom(ctx context.Context, roomID uuid.UUID, payload []byte)
    SubscribeRoom(roomID uuid.UUID, ch chan<- []byte) (unsubscribe func())
}
```

Implement with a `sync.RWMutex` + `map[uuid.UUID][]chan<- []byte`. `BroadcastToRoom` iterates the slice and does non-blocking sends (`select { case ch <- payload: default: }`) so a slow/closed subscriber cannot block other subscribers.

- [ ] **Step 2: Wire `BroadcastToRoom` into chat-service `broadcast`**

In `chat_service.go::broadcast` add a single line after the existing `s.broadcaster.BroadcastChatMessage(...)`:

```go
s.broadcaster.BroadcastToRoom(ctx, msg.RoomID, payload)
```

- [ ] **Step 3: Build**

```bash
cd backend && go build ./...
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/service/chat_broadcaster.go backend/internal/service/chat_service.go
git commit -m "feat(chat): per-room broadcaster registry for guest SSE delivery"
```

### Task 4.2: Add `ChatController.StreamGuest` handler

**Files:**
- Modify: `backend/internal/controller/chat_controller.go`.

- [ ] **Step 1: Implement**

```go
func (c *ChatController) StreamGuest(w http.ResponseWriter, r *http.Request) {
    tokenStr := r.PathValue("token")
    token, err := uuid.Parse(tokenStr)
    if err != nil {
        http.Error(w, "invalid token", http.StatusBadRequest)
        return
    }
    room, err := c.svc.GetRoomByToken(r.Context(), token)
    if err != nil {
        http.Error(w, "not found", http.StatusNotFound)
        return
    }

    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "streaming unsupported", http.StatusInternalServerError)
        return
    }
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    w.Header().Set("X-Accel-Buffering", "no")
    flusher.Flush()

    ch := make(chan []byte, 16)
    unsubscribe := c.broadcaster.SubscribeRoom(room.ID, ch)
    defer unsubscribe()

    for {
        select {
        case <-r.Context().Done():
            return
        case payload := <-ch:
            fmt.Fprintf(w, "event: chat.message\ndata: %s\n\n", payload)
            flusher.Flush()
        }
    }
}
```

`ChatController` will need `broadcaster ChatBroadcaster` injected; extend the constructor and Fx provider call accordingly (`controller.NewChatController` in `app.go`).

- [ ] **Step 2: Register the route**

In `backend/internal/controller/server.go`, alongside the other chat routes:

```go
mux.HandleFunc("GET /api/v1/chat/external/rooms/{token}/stream", withCORS(ch.StreamGuest))
```

(no auth middleware — token is the credential).

- [ ] **Step 3: Build**

```bash
cd backend && go build ./...
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/controller/chat_controller.go backend/internal/controller/server.go backend/internal/app/app.go
git commit -m "feat(chat): GET /api/v1/chat/external/rooms/{token}/stream for guest SSE"
```

### Task 4.3: Controller test for `StreamGuest`

**Files:** extend `backend/internal/controller/chat_controller_test.go`.

- [ ] **Step 1: Test cases**

```go
func TestChatController_StreamGuest_InvalidTokenReturns400(t *testing.T) { /* path "not-a-uuid" -> 400 */ }
func TestChatController_StreamGuest_UnknownTokenReturns404(t *testing.T) { /* uuid.New() not in repo -> 404 */ }
func TestChatController_StreamGuest_DeliversChatMessageEvent(t *testing.T) {
    // start handler in goroutine with httptest.ResponseRecorder + cancellable ctx;
    // call broadcaster.BroadcastToRoom(roomID, []byte(`{"hi":1}`));
    // assert recorder body contains "event: chat.message\ndata: {\"hi\":1}\n\n";
    // cancel ctx to terminate.
}
```

- [ ] **Step 2: Run**

```bash
cd backend && go test ./internal/controller/ -run TestChatController_StreamGuest -v
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/controller/chat_controller_test.go
git commit -m "test(chat): StreamGuest endpoint validates token and delivers events"
```

### Task 4.4: Frontend — switch guest path to dedicated stream URL

**Files:**
- Modify: `frontend/src/entities/chat/lib/useChatStream.ts`.

- [ ] **Step 1: Update the hook**

Replace the `if (accessToken) return;` short-circuit with:

```ts
const url = accessToken
    ? `/api/v1/chat/external/rooms/${accessToken}/stream`
    : (streamUrl ?? '/api/v1/notifications/stream');
```

For the guest path, **do not** call `authFetch` — use plain `fetch(url, { signal: controller.signal, headers: { Accept: 'text/event-stream' } })` so the request does not attach the (absent) Bearer token. The auth-user path keeps `authFetch`.

- [ ] **Step 2: Typecheck**

```bash
cd frontend && npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/entities/chat/lib/useChatStream.ts
git commit -m "feat(chat/frontend): connect guest pages to dedicated SSE endpoint"
```

---

## Phase 5 — Frontend i18n (#4 part 1)

### Task 5.1: Add `chat.*` keys to ru/en

**Files:**
- Modify: `frontend/src/shared/i18n/locales/ru.json`.
- Modify: `frontend/src/shared/i18n/locales/en.json`.

- [ ] **Step 1: Add keys (preserve existing structure; place under top-level `chat`)**

`ru.json`:
```json
{
  "chat": {
    "title": "Чат с записью",
    "placeholder": "Напишите сообщение",
    "send": "Отправить",
    "lockHint": "Вы можете отправить одно сообщение мастеру до начала диалога.",
    "lockedAfterFirst": "Дождитесь ответа мастера, чтобы продолжить.",
    "readonly": "Чат закрыт.",
    "empty": "Пока сообщений нет.",
    "systemPrefix": "Система",
    "unread": "Непрочитанных: {{count}}"
  }
}
```

`en.json`:
```json
{
  "chat": {
    "title": "Appointment chat",
    "placeholder": "Type a message",
    "send": "Send",
    "lockHint": "You can send one message to the master before the conversation starts.",
    "lockedAfterFirst": "Wait for the master to reply to continue.",
    "readonly": "This chat is closed.",
    "empty": "No messages yet.",
    "systemPrefix": "System",
    "unread": "Unread: {{count}}"
  }
}
```

- [ ] **Step 2: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('frontend/src/shared/i18n/locales/ru.json','utf8'))" && \
node -e "JSON.parse(require('fs').readFileSync('frontend/src/shared/i18n/locales/en.json','utf8'))"
```

Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/shared/i18n/locales/ru.json frontend/src/shared/i18n/locales/en.json
git commit -m "i18n(chat): add ru/en keys for chat window strings"
```

### Task 5.2: Replace hardcoded strings in chat-window components

**Files:**
- Modify: `frontend/src/features/chat-window/ui/ChatComposer.tsx`, `ChatBubble.tsx`, `ChatWindow.tsx`, `ChatTrigger.tsx`.

- [ ] **Step 1: Add `useTranslation` import and replace literal strings**

For each file, follow the pattern already used in `frontend/src/pages/search/ui/SearchPage.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
// ...
const { t } = useTranslation();
// then: <TextField placeholder={t('chat.placeholder')} />
```

Map: window title → `t('chat.title')`, composer placeholder → `t('chat.placeholder')`, send button → `t('chat.send')`, lock hint → `t('chat.lockHint')`, post-first-message lock → `t('chat.lockedAfterFirst')`, readonly banner → `t('chat.readonly')`, empty state → `t('chat.empty')`, system prefix in `ChatBubble` → `t('chat.systemPrefix')`.

- [ ] **Step 2: Typecheck**

```bash
cd frontend && npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/chat-window/
git commit -m "i18n(chat): wire chat-window components through useTranslation"
```

---

## Phase 6 — Frontend integration gaps (#4 parts 2-4)

### Task 6.1: Pass `currentUserId` into AppointmentDrawer's chat section

**Files:**
- Modify: `frontend/src/pages/dashboard/ui/drawers/AppointmentDrawer.tsx`.
- Modify: `frontend/src/features/chat-window/ui/ChatBubble.tsx` (accept new prop).
- Modify: `frontend/src/features/chat-window/ui/ChatWindow.tsx` (forward prop).

- [ ] **Step 1: Find the auth selector**

```bash
grep -rn "selectCurrentUser\|currentUser\|state\\.auth" frontend/src/app/store.ts frontend/src/entities/auth 2>/dev/null | head -10
```

Use whichever selector exists (likely `selectAuthUser` or similar in `entities/auth/model/selectors.ts` — check that file).

- [ ] **Step 2: Pull user id in `AppointmentDrawer`**

```tsx
import { useAppSelector } from '@app/store';
import { selectAuthUser } from '@entities/auth';
// inside component:
const currentUser = useAppSelector(selectAuthUser);
const currentUserId = currentUser?.id;
```

- [ ] **Step 3: Forward through `AppointmentChatSection` → `ChatWindow` → `ChatBubble`**

```tsx
<AppointmentChatSection appointmentId={appointment.id} currentUserId={currentUserId} />
```

`ChatBubble` derives `isOwn`:
```tsx
const isOwn = currentUserId !== undefined && message.senderUserId === currentUserId;
```

- [ ] **Step 4: Typecheck**

```bash
cd frontend && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/dashboard/ui/drawers/AppointmentDrawer.tsx frontend/src/features/chat-window/
git commit -m "fix(chat/frontend): differentiate own vs other messages in dashboard drawer

Pass currentUserId from auth store through ChatWindow to ChatBubble; previously every
message rendered as 'other' because the bubble had no identity to compare against."
```

### Task 6.2: Embed `ChatTrigger` + `ChatWindow` in `/me` UserAppointment cards

**Files:**
- Modify: `frontend/src/pages/me/ui/sections/AppointmentsSection.tsx`.

- [ ] **Step 1: Inspect current card layout**

```bash
sed -n '1,60p' frontend/src/pages/me/ui/sections/AppointmentsSection.tsx
```

(read the file fully to identify the per-appointment row component).

- [ ] **Step 2: Embed**

For each appointment row, add at the bottom of the card (or in a footer slot):

```tsx
{appointment.id && (
  <Box sx={{ mt: 1 }}>
    <AppointmentChatSection
      appointmentId={appointment.id}
      currentUserId={currentUser?.id}
    />
  </Box>
)}
```

`AppointmentChatSection` is already exported from `features/chat-window`; if not, add it to the public barrel.

- [ ] **Step 3: Typecheck**

```bash
cd frontend && npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/me/ui/sections/AppointmentsSection.tsx frontend/src/features/chat-window/
git commit -m "feat(chat/frontend): embed chat trigger in /me appointment cards"
```

### Task 6.3: Unread counter in `ChatTrigger`

**Files:**
- Modify: `frontend/src/features/chat-window/ui/ChatTrigger.tsx`.
- Possibly extend: `frontend/src/entities/chat/api/chatApi.ts` (add a selector helper).

- [ ] **Step 1: Derive unread count**

```tsx
const { data } = chatApi.useListMessagesQuery({ roomId, accessToken });
const unread = useMemo(() => {
    if (!data?.messages || !currentUserId) return 0;
    return data.messages.filter(m =>
        m.senderUserId !== currentUserId && !m.isReadByMe
    ).length;
}, [data, currentUserId]);
```

`isReadByMe` is **not** currently on `ChatMessage` — extend the backend `ListMessages` response if needed. **Check first**: read `backend/internal/controller/chat_controller.go::ListMessages` and the model. If `is_read_by_me` is computed there, surface it in the response JSON. If not, this task spawns a small backend extension:
- Add a left-join on `chat_message_reads` filtered by current user in the persistence layer.
- Surface `isReadByMe` boolean per message in `ListMessages` response struct.

If extending the backend, write a regression test in `chat_controller_test.go` first.

- [ ] **Step 2: Render the badge**

```tsx
<Badge badgeContent={unread} color="error" invisible={unread === 0}>
  {/* existing trigger icon */}
</Badge>
```

Use `Badge` from MUI.

- [ ] **Step 3: On open, mark room read**

```tsx
const [markRead] = chatApi.useMarkRoomReadMutation();
const handleOpen = () => {
    markRead({ roomId });
    setOpen(true);
};
```

- [ ] **Step 4: Typecheck + manual sanity**

```bash
cd frontend && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/chat-window/ui/ChatTrigger.tsx \
        [frontend/src/entities/chat/api/chatApi.ts] \
        [backend/internal/controller/chat_controller.go] \
        [backend/internal/infrastructure/persistence/chat_repository.go] \
        [backend/internal/controller/chat_controller_test.go]
git commit -m "feat(chat/frontend): unread counter on ChatTrigger with mark-on-open"
```

---

## Phase 7 — Frontend test infrastructure & chat tests (#1, frontend portion)

The frontend has zero test runtime today. We bootstrap Vitest + RTL + MSW from scratch, prove the infra with one trivial test, then write the chat tests.

### Task 7.1: Install dev dependencies

**Files:**
- Modify: `frontend/package.json`.

- [ ] **Step 1: Install**

```bash
cd frontend && npm install --save-dev \
  vitest@^2 \
  @vitest/ui \
  jsdom \
  @testing-library/react \
  @testing-library/user-event \
  @testing-library/jest-dom \
  msw@^2
```

- [ ] **Step 2: Verify scripts placeholder will be added in 7.3**

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(test/frontend): add vitest + RTL + MSW devDependencies"
```

### Task 7.2: Add Vitest config and setup file

**Files:**
- Create: `frontend/vitest.config.ts`.
- Create: `frontend/src/test/setup.ts`.
- Create: `frontend/src/test/server.ts`.

- [ ] **Step 1: `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
  resolve: {
    alias: {
      '@app':      path.resolve(__dirname, 'src/app'),
      '@entities': path.resolve(__dirname, 'src/entities'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@pages':    path.resolve(__dirname, 'src/pages'),
      '@shared':   path.resolve(__dirname, 'src/shared'),
    },
  },
});
```

(Mirror the alias paths from `frontend/vite.config.ts` — read it and copy verbatim if more aliases exist.)

- [ ] **Step 2: `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- [ ] **Step 3: `src/test/server.ts`**

```ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/v1/chat/rooms/:roomId/messages', () =>
    HttpResponse.json({ messages: [] }),
  ),
];

export const server = setupServer(...handlers);
```

- [ ] **Step 4: Commit**

```bash
git add frontend/vitest.config.ts frontend/src/test/setup.ts frontend/src/test/server.ts
git commit -m "chore(test/frontend): scaffold vitest config + MSW server"
```

### Task 7.3: Add npm scripts and a smoke test

**Files:**
- Modify: `frontend/package.json` (scripts).
- Create: `frontend/src/test/smoke.test.ts`.

- [ ] **Step 1: Add scripts**

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest --run",
    "test:ui": "vitest --ui"
  }
}
```

- [ ] **Step 2: Smoke test**

```ts
import { describe, expect, it } from 'vitest';
describe('frontend test infra', () => {
  it('runs', () => { expect(1 + 1).toBe(2); });
});
```

- [ ] **Step 3: Run**

```bash
cd frontend && npm run test:run -- src/test/smoke.test.ts
```

Expected: 1 passed.

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/src/test/smoke.test.ts
git commit -m "chore(test/frontend): add test scripts and smoke test"
```

### Task 7.4: `ChatWindow` test — lock state

**Files:**
- Create: `frontend/src/features/chat-window/ui/ChatWindow.test.tsx`.

- [ ] **Step 1: Test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { I18nextProvider } from 'react-i18next';
import { describe, it, expect } from 'vitest';
import { setupStore } from '@app/store';
import i18n from '@shared/i18n';
import { ChatWindow } from './ChatWindow';

const renderWithStore = (ui: React.ReactNode) => {
  const store = setupStore();
  return render(
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
    </Provider>,
  );
};

describe('ChatWindow lock state', () => {
  it('shows lock hint when room.lockedUntilFirstReply is true', () => {
    // MSW handler returns the locked room and empty messages.
    renderWithStore(<ChatWindow roomId="00000000-0000-0000-0000-000000000001" />);
    expect(screen.getByText(/одно сообщение мастеру/i)).toBeInTheDocument();
  });

  it('disables send button after first guest message before reply', async () => {
    renderWithStore(<ChatWindow roomId="00000000-0000-0000-0000-000000000001" />);
    const input = screen.getByPlaceholderText(/напишите сообщение/i);
    await userEvent.type(input, 'hi');
    await userEvent.click(screen.getByRole('button', { name: /отправить/i }));
    expect(screen.getByText(/дождитесь ответа/i)).toBeInTheDocument();
  });
});
```

Add MSW handlers for the room and messages endpoints in `src/test/server.ts` (or override per test).

- [ ] **Step 2: Run**

```bash
cd frontend && npm run test:run -- src/features/chat-window/ui/ChatWindow.test.tsx
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/chat-window/ui/ChatWindow.test.tsx frontend/src/test/server.ts
git commit -m "test(chat/frontend): ChatWindow lock state and post-first-message guard"
```

### Task 7.5: `ChatWindow` test — readonly state

**Files:** extend `frontend/src/features/chat-window/ui/ChatWindow.test.tsx`.

- [ ] **Step 1: Test**

```tsx
it('renders readonly banner and disables composer when room.status === readonly', async () => {
  // Override MSW handler to return room with status: 'readonly'.
  renderWithStore(<ChatWindow roomId="..." />);
  expect(await screen.findByText(/чат закрыт/i)).toBeInTheDocument();
  expect(screen.queryByPlaceholderText(/напишите сообщение/i)).toBeNull();
});
```

- [ ] **Step 2: Run + Commit**

```bash
cd frontend && npm run test:run -- src/features/chat-window/ui/ChatWindow.test.tsx
git add frontend/src/features/chat-window/ui/ChatWindow.test.tsx
git commit -m "test(chat/frontend): readonly banner suppresses composer"
```

### Task 7.6: `ChatWindow` test — own vs other rendering

**Files:** extend `frontend/src/features/chat-window/ui/ChatWindow.test.tsx`.

- [ ] **Step 1: Test**

```tsx
it('renders own messages with own variant and others with other variant', async () => {
  // MSW returns 2 messages: one from currentUser, one from other.
  renderWithStore(<ChatWindow roomId="..." currentUserId="user-1" />);
  const ownBubble = await screen.findByTestId('chat-bubble-own');
  const otherBubble = await screen.findByTestId('chat-bubble-other');
  expect(ownBubble).toHaveTextContent('my msg');
  expect(otherBubble).toHaveTextContent('their msg');
});
```

(Add `data-testid="chat-bubble-own"` / `chat-bubble-other"` to `ChatBubble` if not present — minimal change.)

- [ ] **Step 2: Run + Commit**

```bash
cd frontend && npm run test:run
git add frontend/src/features/chat-window/
git commit -m "test(chat/frontend): own vs other bubble rendering"
```

### Task 7.7: `useChatStream` test — guest path uses dedicated URL

**Files:**
- Create: `frontend/src/entities/chat/lib/useChatStream.test.ts`.

- [ ] **Step 1: Test**

```ts
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect, vi } from 'vitest';
import { setupStore } from '@app/store';
import { useChatStream } from './useChatStream';

describe('useChatStream', () => {
  it('does nothing when roomId is undefined', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const store = setupStore();
    renderHook(() => useChatStream({ roomId: undefined }), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('hits /api/v1/chat/external/rooms/{token}/stream when accessToken is set', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(new ReadableStream(), { status: 200 }));
    const store = setupStore();
    renderHook(() => useChatStream({ roomId: 'r1', accessToken: 'tok' }), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });
    await new Promise(r => setTimeout(r, 0));
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/chat/external/rooms/tok/stream',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});
```

- [ ] **Step 2: Run**

```bash
cd frontend && npm run test:run -- src/entities/chat/lib/useChatStream.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/entities/chat/lib/useChatStream.test.ts
git commit -m "test(chat/frontend): useChatStream picks correct URL per auth mode"
```

### Task 7.8: Run full frontend test suite

- [ ] **Step 1**

```bash
cd frontend && npm run test:run
```

Expected: all tests PASS, no unhandled requests warnings.

---

## Phase 8 — Mobile integration gaps (#5 parts 1-2)

### Task 8.1: Add Chat button to `AppointmentQuickActionsSheet`

**Files:**
- Modify: `mobile/src/features/calendar/AppointmentQuickActionsSheet.tsx`.

- [ ] **Step 1: Inspect file structure**

Read the file end-to-end and locate where other actions (Cancel, Reschedule, etc.) render.

- [ ] **Step 2: Add the action**

```tsx
import { useNavigation } from 'expo-router';

// inside the actions list:
<Pressable onPress={() => {
  router.push({ pathname: '/chat/[appointmentId]', params: { appointmentId: appointment.id } });
}}>
  <Icon name="chatbubble-outline" />
  <Text>Чат</Text>
</Pressable>
```

If a chat route does not yet exist in `mobile/app/`, add one (`mobile/app/chat/[appointmentId].tsx`) that mounts `<ChatScreen appointmentId={appointmentId} />`.

- [ ] **Step 3: Verify build**

```bash
cd mobile && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/features/calendar/AppointmentQuickActionsSheet.tsx \
        [mobile/app/chat/[appointmentId].tsx]
git commit -m "feat(chat/mobile): open ChatScreen from appointment quick-actions sheet"
```

### Task 8.2: Handle `chat.message` push notification (deep link)

**Files:**
- Modify: `mobile/app/_layout.tsx` (or wherever `Notifications.addNotificationResponseReceivedListener` is set up).

- [ ] **Step 1: Find existing handler**

```bash
grep -rn "addNotificationResponseReceivedListener\|NotificationResponse\|NotificationContent" mobile/app/ mobile/src/notifications 2>/dev/null
```

- [ ] **Step 2: Add chat-message branch**

```tsx
const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as { type?: string; roomId?: string; appointmentId?: string };
    if (data.type === 'chat.message') {
        if (data.appointmentId) {
            router.push({ pathname: '/chat/[appointmentId]', params: { appointmentId: data.appointmentId } });
        }
        return;
    }
    // existing branches...
});
```

If the push payload only contains `roomId`, fetch room → appointment in the chat screen itself.

- [ ] **Step 3: Lint**

```bash
cd mobile && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add mobile/app/_layout.tsx
git commit -m "feat(chat/mobile): deep-link from chat.message push to ChatScreen"
```

---

## Phase 9 — Mobile test infrastructure & chat tests (#1, mobile portion)

### Task 9.1: Install dev dependencies

**Files:**
- Modify: `mobile/package.json`.

- [ ] **Step 1: Install**

```bash
cd mobile && npm install --save-dev \
  jest@^29 \
  jest-expo@~52 \
  @testing-library/react-native@^12 \
  @testing-library/jest-native@^5 \
  @types/jest \
  babel-jest
```

(Match `jest-expo` major to the installed Expo SDK — check `mobile/package.json` `"expo": "..."`.)

- [ ] **Step 2: Commit**

```bash
git add mobile/package.json mobile/package-lock.json
git commit -m "chore(test/mobile): add jest-expo + RNTL devDependencies"
```

### Task 9.2: Jest config + setup

**Files:**
- Create: `mobile/jest.config.js`.
- Create: `mobile/jest-setup.ts`.
- Modify: `mobile/package.json` (script).

- [ ] **Step 1: `jest.config.js`**

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: ['<rootDir>/jest-setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@react-navigation/.*|expo-router|expo-modules-core|@unimodules/.*|unimodules|sentry-expo|native-base|react-clone-referenced-element|react-native-svg))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

- [ ] **Step 2: `jest-setup.ts`**

```ts
import '@testing-library/jest-native/extend-expect';
```

- [ ] **Step 3: Add script**

```json
{ "scripts": { "test": "jest" } }
```

- [ ] **Step 4: Commit**

```bash
git add mobile/jest.config.js mobile/jest-setup.ts mobile/package.json
git commit -m "chore(test/mobile): jest-expo config + RNTL setup"
```

### Task 9.3: Smoke test

**Files:**
- Create: `mobile/src/test-smoke.test.ts`.

- [ ] **Step 1**

```ts
test('mobile test infra runs', () => { expect(1 + 1).toBe(2); });
```

- [ ] **Step 2: Run**

```bash
cd mobile && npm test -- --testPathPattern=test-smoke
```

Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/test-smoke.test.ts
git commit -m "test(mobile): smoke test confirms jest-expo works"
```

### Task 9.4: `useChatStream` polling test

**Files:**
- Create: `mobile/src/lib/chat/useChatStream.test.ts`.

- [ ] **Step 1: Test**

```ts
import { renderHook, act } from '@testing-library/react-native';
import { useChatStream } from './useChatStream';

jest.useFakeTimers();

describe('useChatStream (mobile polling)', () => {
  it('polls every 5s while mounted', () => {
    const refetch = jest.fn();
    renderHook(() => useChatStream({ roomId: 'r1', refetch }));
    expect(refetch).toHaveBeenCalledTimes(0);
    act(() => { jest.advanceTimersByTime(5_000); });
    expect(refetch).toHaveBeenCalledTimes(1);
    act(() => { jest.advanceTimersByTime(15_000); });
    expect(refetch).toHaveBeenCalledTimes(4);
  });

  it('stops on unmount', () => {
    const refetch = jest.fn();
    const { unmount } = renderHook(() => useChatStream({ roomId: 'r1', refetch }));
    unmount();
    act(() => { jest.advanceTimersByTime(60_000); });
    expect(refetch).toHaveBeenCalledTimes(0);
  });

  it('does not poll without roomId', () => {
    const refetch = jest.fn();
    renderHook(() => useChatStream({ roomId: undefined, refetch }));
    act(() => { jest.advanceTimersByTime(60_000); });
    expect(refetch).toHaveBeenCalledTimes(0);
  });
});
```

If the current `useChatStream` signature does not take `refetch` as a prop, adapt the test to inspect what it actually does (e.g. spy on the API call).

- [ ] **Step 2: Run**

```bash
cd mobile && npm test -- --testPathPattern=useChatStream
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/lib/chat/useChatStream.test.ts
git commit -m "test(chat/mobile): polling cadence and lifecycle"
```

### Task 9.5: `ChatScreen` component test

**Files:**
- Create: `mobile/src/components/chat/ChatScreen.test.tsx`.

- [ ] **Step 1: Test**

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ChatScreen } from './ChatScreen';

jest.mock('../../api/chat', () => ({
  listMessages: jest.fn().mockResolvedValue({
    messages: [
      { id: 'm1', body: 'hello', senderRole: 'master', createdAt: new Date().toISOString() },
    ],
  }),
  sendMessage: jest.fn().mockResolvedValue({}),
  getRoomForAppointment: jest.fn().mockResolvedValue({
    id: 'r1', appointmentId: 'a1', status: 'active', lockedUntilFirstReply: false,
  }),
}));

describe('ChatScreen', () => {
  it('renders messages from the API', async () => {
    render(<ChatScreen appointmentId="a1" />);
    expect(await screen.findByText('hello')).toBeTruthy();
  });

  it('disables send button when readonly', async () => {
    const { sendMessage, getRoomForAppointment } = require('../../api/chat');
    getRoomForAppointment.mockResolvedValueOnce({ id: 'r1', appointmentId: 'a1', status: 'readonly', lockedUntilFirstReply: false });
    render(<ChatScreen appointmentId="a1" />);
    const sendBtn = await screen.findByLabelText(/отправить|send/i);
    fireEvent.press(sendBtn);
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run**

```bash
cd mobile && npm test -- --testPathPattern=ChatScreen
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/chat/ChatScreen.test.tsx
git commit -m "test(chat/mobile): ChatScreen renders messages and respects readonly"
```

---

## Phase 10 — Final verification

### Task 10.1: Full backend test pass

- [ ] **Step 1: Run**

```bash
cd backend && go test ./...
```

Expected: PASS, no race or build errors.

### Task 10.2: Full frontend test pass + typecheck + lint

- [ ] **Step 1**

```bash
cd frontend && npm run test:run && npm run typecheck && npm run lint
```

Expected: all green.

### Task 10.3: Full mobile test pass + lint

- [ ] **Step 1**

```bash
cd mobile && npm test && npm run lint
```

### Task 10.4: Manual smoke (#8)

Run a real backend (`cd backend && go run ./cmd/api`) with Postgres, frontend (`cd frontend && npm run dev`), and mobile (Expo dev). Walk through these scenarios and capture observed behavior in a scratch note (do **not** commit the note):

- [ ] **Scenario A — Guest happy path:** create an appointment as a guest (web search → guest booking), open the link from the SMS (or hit `/chat/<accessToken>`), send one message, observe lock state, log into the master dashboard as the receiving master, reply, observe guest can now send freely.
- [ ] **Scenario B — Authenticated user:** log in as a registered user, create appointment, open `/me`, expand chat, exchange messages with master.
- [ ] **Scenario C — Masking:** as guest send "позвони +79991234567" — observed body in DB and rendered UI must contain `[контакт скрыт]`.
- [ ] **Scenario D — Readonly transition:** mark an appointment `completed` in dashboard, force `chatArchiver.RunOnce` (or wait for cron), reload chat — composer must hide, banner must show.
- [ ] **Scenario E — Reschedule system message:** edit appointment time in dashboard, observe a system message appears in the chat with the new start time.

If any scenario fails, file a regression task in this branch (write a failing test first, then fix) before proceeding.

### Task 10.5: Update roadmap and status

**Files:**
- Modify: `docs/vault/product/chat-roadmap.md`.
- Modify: `docs/vault/product/status.md`.

- [ ] **Step 1: Mark Phase 1 follow-up done**

In `chat-roadmap.md`, replace the "Phase 1 follow-up (надо сделать перед мерджем в master)" section with a "Phase 1 follow-up (закрыто YYYY-MM-DD)" block. List delivered items and link to commits where useful. Move Phase 2 sub-sections up. Add a short "Notes" section recording:
- The conflated-commit (#7) audit conclusion: `c2c7460` is correct; the apparent deletions were a refactor of the Expo Metro origin resolver.
- The guest-SSE design decision: dedicated `GET /api/v1/chat/external/rooms/{token}/stream` endpoint; no short-lived JWT.
- Open mobile follow-up (deferred): replace polling fallback with `react-native-sse`.

- [ ] **Step 2: Append status entry**

In `docs/vault/product/status.md` under «Последние изменения», append a one-paragraph entry dated to today with the bullet list of what shipped (hook wiring, guest SSE, i18n, unread, integration, tests).

- [ ] **Step 3: Commit**

```bash
git add docs/vault/product/chat-roadmap.md docs/vault/product/status.md
git commit -m "docs(chat): close Phase 1 follow-up and record decisions"
```

### Task 10.6: Final branch handoff

- [ ] **Step 1: Verify clean tree**

```bash
git status --short
```

Expected: empty.

- [ ] **Step 2: Show commit log for review**

```bash
git log --oneline master..HEAD
```

Expected: ~30-40 commits, conventional commit style, each touching the files in its scope.

- [ ] **Step 3: Hand off to human reviewer**

This branch is ready for the user's `requesting-code-review` skill or for a PR. **Do not push or open a PR without explicit user instruction** (per `CLAUDE.md`). Stop here and surface:
- the branch name (`chore/chat-phase1-followup`),
- the commit count and a short summary,
- the manual smoke scenario results from Task 10.4.

---

## Self-Review

**Spec coverage:** Each of the 8 follow-up items has explicit tasks:
- #1 (tests) — Phases 3, 7, 9 cover backend, frontend, mobile.
- #2 (lint pass) — Phase 1.
- #3 (hook wiring) — Phase 2.
- #4 (frontend gaps) — Phases 5, 6.
- #5 (mobile gaps) — Phase 8 (the `react-native-sse` swap is explicitly deferred to roadmap).
- #6 (guest SSE auth) — Phase 4 + Task 4.4.
- #7 (conflated commit) — debunked in the audit, recorded as a docs-only note in Task 10.5.
- #8 (manual smoke) — Task 10.4.

**Type consistency:** All file paths, struct fields (`AppointmentChatHook`, `chatHook`, `currentUserId`, `senderUserId`, `isReadByMe`), Fx provider names (`service.NewAppointmentChatHook`), endpoint paths (`/api/v1/chat/external/rooms/{token}/stream`), and event names (`appointment.created`, `appointment.status_changed`, `appointment.rescheduled`, `chat.message`) are consistent across phases.

**Risk callouts:**
- **Phase 7 + 9** are large because they bootstrap test infrastructure that does not exist anywhere in the project. If the executor hits unforeseen conflicts (e.g. `vite-tsconfig-paths` plugin missing, jest-expo SDK version mismatch), they should pause and surface it rather than papering over with hacks. The plan assumes vanilla Vite 5 + Expo SDK 52 setups; verify in `frontend/vite.config.ts` and `mobile/package.json` before installing.
- **Task 6.3 (unread counter)** may require a small backend extension (`isReadByMe` per message). The plan flags this with a "spawn a small backend extension if needed" note rather than baking the assumption in. Decide at execution time after reading the response struct.
- **Phase 4 broadcaster extension** introduces a long-lived per-room subscriber map. Make sure `unsubscribe` is **always** called via `defer` — leaking a subscriber chan would slowly OOM the process.
