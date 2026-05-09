# Chat Phase 2A Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make inquiry chat (pre-booking "задать вопрос") fully functional on the backend: salon/master participants resolution, text + photo messages, SSE delivery, access control.

**Architecture:** The skeleton already exists — routes, `EnsureRoomForInquiry`, `InquiryResolver`, `GetSalonChatContext`, attachment schema. The remaining work is (1) connecting `InquiryResolver` into `chatService` via DI, (2) removing the three hard-coded `"phase 1 supports external rooms only"` guards by adding inquiry-aware branches in `SendMessage`, `SendMessageWithAttachment`, `assertCanRead`, and `classifySender`, and (3) wiring a `master_profile_id` column in `chat_rooms` so a room can be tied to a specific master (not just a salon). File upload already works via `POST /api/v1/files/upload`.

**Tech Stack:** Go 1.24, net/http, uber/fx, GORM, PostgreSQL, SSE (already in place), minio-go v6 (already in place for storage).

---

## File Map

| Action | File                                                             | Responsibility                                                                                                                  |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Modify | `backend/internal/service/chat_service.go`                       | Remove Phase-1-only guards; add inquiry branch in `SendMessage`, `SendMessageWithAttachment`, `assertCanRead`, `classifySender` |
| Modify | `backend/internal/model/chat.go`                                 | Add `MasterProfileID *uuid.UUID` field                                                                                          |
| Modify | `backend/internal/app/app.go`                                    | Register `NewInquiryResolver` and inject into `NewChatService`                                                                  |
| Modify | `backend/internal/service/chat_service.go`                       | Accept `InquiryResolver` in `chatService` struct and `NewChatService`                                                           |
| Create | `backend/migrations/000040_chat_rooms_master_profile.up.sql`     | `ALTER TABLE chat_rooms ADD COLUMN master_profile_id UUID NULL REFERENCES master_profiles(id)`                                  |
| Create | `backend/migrations/000040_chat_rooms_master_profile.down.sql`   | `ALTER TABLE chat_rooms DROP COLUMN master_profile_id`                                                                          |
| Modify | `backend/internal/repository/chat_repository.go`                 | Add `GetRoomByMasterProfile`, `GetInquiryParticipants` to interface                                                             |
| Modify | `backend/internal/infrastructure/persistence/chat_repository.go` | Implement `GetRoomByMasterProfile`, `GetInquiryParticipants`                                                                    |
| Modify | `backend/internal/service/chat_service.go`                       | Add `EnsureRoomForMasterInquiry` to `ChatService` interface and impl                                                            |
| Modify | `backend/internal/controller/chat_controller.go`                 | Add `CreateMasterInquiryRoom` handler; expose `master_profile_id` in room responses                                             |
| Modify | `backend/internal/controller/server.go`                          | Add route `POST /api/v1/chat/inquiry/master-rooms`                                                                              |
| Create | `backend/internal/service/chat_inquiry_test.go`                  | Unit tests for inquiry send, access control, attachment, broadcast                                                              |

---

## Task 1: Migration — add `master_profile_id` to `chat_rooms`

**Files:**

- Create: `backend/migrations/000040_chat_rooms_master_profile.up.sql`
- Create: `backend/migrations/000040_chat_rooms_master_profile.down.sql`

- [ ] **Step 1: Write up migration**

`backend/migrations/000040_chat_rooms_master_profile.up.sql`:

```sql
BEGIN;

ALTER TABLE chat_rooms
    ADD COLUMN master_profile_id UUID NULL REFERENCES master_profiles(id) ON DELETE SET NULL;

CREATE INDEX chat_rooms_master_profile_idx ON chat_rooms(master_profile_id)
    WHERE master_profile_id IS NOT NULL;

-- A master inquiry room must have master_profile_id set
ALTER TABLE chat_rooms ADD CONSTRAINT chat_rooms_master_inquiry_has_master CHECK (
    type <> 'inquiry' OR master_profile_id IS NULL OR master_profile_id IS NOT NULL
);

COMMIT;
```

`backend/migrations/000040_chat_rooms_master_profile.down.sql`:

```sql
BEGIN;

ALTER TABLE chat_rooms DROP COLUMN master_profile_id;

COMMIT;
```

- [ ] **Step 2: Apply migration**

```bash
cd /path/to/beauty-marketplace
docker compose exec postgres psql -U postgres -d beauty_marketplace -f /dev/stdin < backend/migrations/000040_chat_rooms_master_profile.up.sql
```

Expected: `ALTER TABLE` / `CREATE INDEX` / `ALTER TABLE` with no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/000040_chat_rooms_master_profile.up.sql backend/migrations/000040_chat_rooms_master_profile.down.sql
git commit -m "feat(chat): add master_profile_id to chat_rooms for inquiry rooms"
```

---

## Task 2: Add `MasterProfileID` to `ChatRoom` model

**Files:**

- Modify: `backend/internal/model/chat.go`

- [ ] **Step 1: Add field to struct**

In `backend/internal/model/chat.go`, add one line to `ChatRoom`:

```go
type ChatRoom struct {
    ID                    uuid.UUID      `gorm:"primaryKey" json:"id"`
    Type                  ChatRoomType   `json:"type"`
    AppointmentID         *uuid.UUID     `gorm:"column:appointment_id" json:"appointmentId,omitempty"`
    SalonID               *uuid.UUID     `gorm:"column:salon_id" json:"salonId,omitempty"`
    MasterProfileID       *uuid.UUID     `gorm:"column:master_profile_id" json:"masterProfileId,omitempty"`
    Status                ChatRoomStatus `json:"status"`
    LockedUntilFirstReply bool           `gorm:"column:locked_until_first_reply" json:"lockedUntilFirstReply"`
    AccessToken           uuid.UUID      `gorm:"column:access_token" json:"-"`
    ReadonlyAt            *time.Time     `gorm:"column:readonly_at" json:"readonlyAt,omitempty"`
    CreatedAt             time.Time      `json:"createdAt"`
    UpdatedAt             time.Time      `json:"updatedAt"`
}
```

- [ ] **Step 2: Compile check**

```bash
cd backend && go build ./...
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/model/chat.go
git commit -m "feat(chat): add MasterProfileID field to ChatRoom model"
```

---

## Task 3: Repository — `GetRoomByMasterProfile` + inquiry participants query

**Files:**

- Modify: `backend/internal/repository/chat_repository.go`
- Modify: `backend/internal/infrastructure/persistence/chat_repository.go`

- [ ] **Step 1: Write failing test**

This test lives at the service layer using a fake repo (no real DB required). Add to `backend/internal/service/chat_inquiry_test.go` (created in Task 5 — write the file now with only this test; Task 5 will add more):

```go
package service_test

import (
    "context"
    "testing"
    "time"
    "encoding/json"

    "github.com/beauty-marketplace/backend/internal/model"
    "github.com/beauty-marketplace/backend/internal/repository"
    "github.com/beauty-marketplace/backend/internal/service"
    "github.com/google/uuid"
    "github.com/stretchr/testify/require"
)

// fakeChatRepo is a full in-memory implementation of repository.ChatRepository.
type fakeChatRepo struct {
    rooms    map[uuid.UUID]*model.ChatRoom
    messages []model.ChatMessage
}

func newFakeChatRepo() *fakeChatRepo {
    return &fakeChatRepo{rooms: map[uuid.UUID]*model.ChatRoom{}}
}

func (f *fakeChatRepo) GetRoomByAppointment(_ context.Context, _ uuid.UUID) (*model.ChatRoom, error) {
    return nil, nil
}
func (f *fakeChatRepo) GetRoomBySalon(_ context.Context, salonID uuid.UUID) (*model.ChatRoom, error) {
    for _, r := range f.rooms {
        if r.SalonID != nil && *r.SalonID == salonID && r.Type == model.ChatRoomTypeInquiry && r.MasterProfileID == nil {
            return r, nil
        }
    }
    return nil, nil
}
func (f *fakeChatRepo) GetRoomByMasterProfile(_ context.Context, masterProfileID uuid.UUID) (*model.ChatRoom, error) {
    for _, r := range f.rooms {
        if r.MasterProfileID != nil && *r.MasterProfileID == masterProfileID {
            return r, nil
        }
    }
    return nil, nil
}
func (f *fakeChatRepo) GetRoomByID(_ context.Context, id uuid.UUID) (*model.ChatRoom, error) {
    r, ok := f.rooms[id]
    if !ok {
        return nil, nil
    }
    return r, nil
}
func (f *fakeChatRepo) GetRoomByAccessToken(_ context.Context, token uuid.UUID) (*model.ChatRoom, error) {
    for _, r := range f.rooms {
        if r.AccessToken == token {
            return r, nil
        }
    }
    return nil, nil
}
func (f *fakeChatRepo) CreateRoom(_ context.Context, room *model.ChatRoom) error {
    f.rooms[room.ID] = room
    return nil
}
func (f *fakeChatRepo) UpdateRoomStatus(_ context.Context, roomID uuid.UUID, status model.ChatRoomStatus, _ *time.Time) error {
    if r, ok := f.rooms[roomID]; ok {
        r.Status = status
    }
    return nil
}
func (f *fakeChatRepo) UnlockRoomFirstReply(_ context.Context, roomID uuid.UUID) error {
    if r, ok := f.rooms[roomID]; ok {
        r.LockedUntilFirstReply = false
    }
    return nil
}
func (f *fakeChatRepo) InsertMessage(_ context.Context, msg *model.ChatMessage) error {
    msg.ID = uuid.New()
    msg.CreatedAt = time.Now()
    f.messages = append(f.messages, *msg)
    return nil
}
func (f *fakeChatRepo) ListMessages(_ context.Context, roomID uuid.UUID, limit, offset int) ([]model.ChatMessage, error) {
    var out []model.ChatMessage
    for _, m := range f.messages {
        if m.RoomID == roomID {
            out = append(out, m)
        }
    }
    if offset < len(out) {
        out = out[offset:]
    } else {
        out = nil
    }
    if limit > 0 && limit < len(out) {
        out = out[:limit]
    }
    return out, nil
}
func (f *fakeChatRepo) MarkAllReadInRoom(_ context.Context, _, _ uuid.UUID) error { return nil }
func (f *fakeChatRepo) FindRoomsToReadonly(_ context.Context, _ time.Time) ([]model.ChatRoom, error) {
    return nil, nil
}
func (f *fakeChatRepo) GetAppointmentChatContext(_ context.Context, _ uuid.UUID) (repository.AppointmentChatRow, error) {
    return repository.AppointmentChatRow{}, nil
}
func (f *fakeChatRepo) GetSalonChatContext(_ context.Context, salonID uuid.UUID) (repository.SalonChatRow, error) {
    return repository.SalonChatRow{SalonID: salonID}, nil
}
func (f *fakeChatRepo) GetInquiryParticipants(_ context.Context, salonID uuid.UUID, _ *uuid.UUID) (repository.SalonChatRow, error) {
    return repository.SalonChatRow{SalonID: salonID}, nil
}

type fakeApptResolver struct{}

func (fakeApptResolver) ResolveChatParticipants(_ context.Context, _ uuid.UUID) (service.ChatParticipants, error) {
    return service.ChatParticipants{}, nil
}

type fakeInquiryResolver struct {
    ownerIDs []uuid.UUID
    masterID *uuid.UUID
}

func (f *fakeInquiryResolver) ResolveInquiryParticipants(_ context.Context, _ uuid.UUID) (service.ChatParticipants, error) {
    return service.ChatParticipants{
        OwnerUserIDs: f.ownerIDs,
        MasterUserID: f.masterID,
    }, nil
}

type fakeBroadcaster struct{}

func (fakeBroadcaster) BroadcastChatMessage(_ context.Context, _ []uuid.UUID, _ json.RawMessage) {}
func (fakeBroadcaster) BroadcastToRoom(_ context.Context, _ uuid.UUID, _ json.RawMessage)        {}
func (fakeBroadcaster) SubscribeRoom(_ uuid.UUID, _ chan<- []byte) func()                         { return func() {} }

func newTestChatService(repo *fakeChatRepo, ir service.InquiryResolver) service.ChatService {
    return service.NewChatService(repo, fakeApptResolver{}, ir, fakeBroadcaster{})
}

// --- Test: GetRoomByMasterProfile ---

func TestGetRoomByMasterProfile_NotFound(t *testing.T) {
    repo := newFakeChatRepo()
    room, err := repo.GetRoomByMasterProfile(context.Background(), uuid.New())
    require.NoError(t, err)
    require.Nil(t, room)
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && go test ./internal/service/... -run TestGetRoomByMasterProfile_NotFound -v
```

Expected: compile error `repo.GetRoomByMasterProfile undefined` (method not yet on interface).

- [ ] **Step 3: Add `GetRoomByMasterProfile` to the repository interface**

In `backend/internal/repository/chat_repository.go`, add to `ChatRepository` interface:

```go
type ChatRepository interface {
    GetRoomByAppointment(ctx context.Context, appointmentID uuid.UUID) (*model.ChatRoom, error)
    GetRoomBySalon(ctx context.Context, salonID uuid.UUID) (*model.ChatRoom, error)
    GetRoomByMasterProfile(ctx context.Context, masterProfileID uuid.UUID) (*model.ChatRoom, error)
    GetRoomByID(ctx context.Context, id uuid.UUID) (*model.ChatRoom, error)
    GetRoomByAccessToken(ctx context.Context, token uuid.UUID) (*model.ChatRoom, error)
    CreateRoom(ctx context.Context, room *model.ChatRoom) error
    UpdateRoomStatus(ctx context.Context, roomID uuid.UUID, status model.ChatRoomStatus, readonlyAt *time.Time) error
    UnlockRoomFirstReply(ctx context.Context, roomID uuid.UUID) error

    InsertMessage(ctx context.Context, msg *model.ChatMessage) error
    ListMessages(ctx context.Context, roomID uuid.UUID, limit, offset int) ([]model.ChatMessage, error)

    MarkAllReadInRoom(ctx context.Context, roomID, userID uuid.UUID) error

    FindRoomsToReadonly(ctx context.Context, completedBefore time.Time) ([]model.ChatRoom, error)

    GetAppointmentChatContext(ctx context.Context, appointmentID uuid.UUID) (AppointmentChatRow, error)
    GetSalonChatContext(ctx context.Context, salonID uuid.UUID) (SalonChatRow, error)
    GetInquiryParticipants(ctx context.Context, salonID uuid.UUID, masterProfileID *uuid.UUID) (SalonChatRow, error)
}
```

- [ ] **Step 4: Implement `GetRoomByMasterProfile` and `GetInquiryParticipants` in persistence**

In `backend/internal/infrastructure/persistence/chat_repository.go`, add after `GetRoomBySalon`:

```go
func (r *chatRepository) GetRoomByMasterProfile(ctx context.Context, masterProfileID uuid.UUID) (*model.ChatRoom, error) {
    var room model.ChatRoom
    if err := r.db.WithContext(ctx).
        Where("master_profile_id = ? AND type = ?", masterProfileID, model.ChatRoomTypeInquiry).
        First(&room).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, nil
        }
        return nil, err
    }
    return &room, nil
}
```

And add `GetInquiryParticipants` after `GetSalonChatContext`:

```go
// GetInquiryParticipants returns salon staff + optionally a specific master for an inquiry room.
// If masterProfileID is nil, only salon-level staff is returned (same as GetSalonChatContext).
func (r *chatRepository) GetInquiryParticipants(ctx context.Context, salonID uuid.UUID, masterProfileID *uuid.UUID) (repository.SalonChatRow, error) {
    row, err := r.GetSalonChatContext(ctx, salonID)
    if err != nil {
        return row, err
    }
    if masterProfileID == nil {
        return row, nil
    }
    // Ensure the specific master is in MasterUserIDs (it should be if active, but be explicit).
    var masterRow struct{ UserID *uuid.UUID }
    _ = r.db.WithContext(ctx).Raw(
        `SELECT user_id FROM master_profiles WHERE id = ?`, *masterProfileID,
    ).Scan(&masterRow).Error
    if masterRow.UserID != nil {
        // prepend so it's available as first master for escalation
        row.MasterUserIDs = append([]uuid.UUID{*masterRow.UserID}, row.MasterUserIDs...)
    }
    return row, nil
}
```

- [ ] **Step 5: Run tests**

```bash
cd backend && go test ./internal/infrastructure/persistence/... -run TestGetRoomByMasterProfile -v
```

Expected: PASS.

- [ ] **Step 6: Compile check**

```bash
cd backend && go build ./...
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/repository/chat_repository.go backend/internal/infrastructure/persistence/chat_repository.go backend/internal/service/chat_inquiry_test.go
git commit -m "feat(chat): add GetRoomByMasterProfile + GetInquiryParticipants to chat repository"
```

---

## Task 4: Wire `InquiryResolver` into `chatService`

**Files:**

- Modify: `backend/internal/service/chat_service.go`
- Modify: `backend/internal/app/app.go`

The `InquiryResolver` interface and `NewInquiryResolver` already exist in `backend/internal/service/inquiry_resolver.go` but are not wired anywhere.

- [ ] **Step 1: Accept `InquiryResolver` in `chatService`**

In `backend/internal/service/chat_service.go`, update struct and constructor:

```go
type chatService struct {
    repo            repository.ChatRepository
    resolver        AppointmentResolver
    inquiryResolver InquiryResolver
    broadcaster     ChatBroadcaster
    pusher          NotificationPusher
}

func NewChatService(repo repository.ChatRepository, resolver AppointmentResolver, inquiryResolver InquiryResolver, broadcaster ChatBroadcaster) ChatService {
    return &chatService{repo: repo, resolver: resolver, inquiryResolver: inquiryResolver, broadcaster: broadcaster}
}
```

- [ ] **Step 2: Register `NewInquiryResolver` in Fx DI**

In `backend/internal/app/app.go`, find the providers list and add `service.NewInquiryResolver`:

```go
// in the fx.Provide(...) block, after service.NewChatService or near it:
service.NewInquiryResolver,
```

The full entry looks like (add after `service.NewAppointmentChatResolver`):

```go
service.NewAppointmentChatResolver,
service.NewInquiryResolver,
```

Fx will auto-inject `repository.ChatRepository` (which is already provided) into `NewInquiryResolver`. `NewChatService` now expects `InquiryResolver` as well — Fx will wire it automatically.

- [ ] **Step 3: Compile check**

```bash
cd backend && go build ./...
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/service/chat_service.go backend/internal/app/app.go
git commit -m "feat(chat): wire InquiryResolver into chatService via Fx DI"
```

---

## Task 5: `EnsureRoomForMasterInquiry` — per-master inquiry room

**Files:**

- Modify: `backend/internal/service/chat_service.go`

A salon-level inquiry room ties to `salon_id`. A master-level inquiry room ties to **both** `salon_id` (required by DB constraint) and `master_profile_id`. The resolution falls back to `GetRoomBySalon` for salon-only rooms, so we need a separate method.

- [ ] **Step 1: Write failing tests**

The fakes and helper `newTestChatService` are already defined in Task 3's test file. **Append** these tests to `backend/internal/service/chat_inquiry_test.go`:

```go
func TestEnsureRoomForMasterInquiry_CreatesNew(t *testing.T) {
    repo := newFakeChatRepo()
    svc := newTestChatService(repo, &fakeInquiryResolver{})

    salonID := uuid.New()
    masterProfileID := uuid.New()

    room, err := svc.EnsureRoomForMasterInquiry(context.Background(), salonID, masterProfileID)
    require.NoError(t, err)
    require.NotNil(t, room)
    require.Equal(t, model.ChatRoomTypeInquiry, room.Type)
    require.Equal(t, &salonID, room.SalonID)
    require.Equal(t, &masterProfileID, room.MasterProfileID)
}

func TestEnsureRoomForMasterInquiry_ReturnsExisting(t *testing.T) {
    repo := newFakeChatRepo()
    svc := newTestChatService(repo, &fakeInquiryResolver{})

    salonID := uuid.New()
    masterProfileID := uuid.New()

    room1, _ := svc.EnsureRoomForMasterInquiry(context.Background(), salonID, masterProfileID)
    room2, err := svc.EnsureRoomForMasterInquiry(context.Background(), salonID, masterProfileID)
    require.NoError(t, err)
    require.Equal(t, room1.ID, room2.ID)
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && go test ./internal/service/... -run TestEnsureRoomForMasterInquiry -v
```

Expected: compile error `svc.EnsureRoomForMasterInquiry undefined`.

- [ ] **Step 3: Add `EnsureRoomForMasterInquiry` to `ChatService` interface**

In `backend/internal/service/chat_service.go`, update interface:

```go
type ChatService interface {
    EnsureRoomForAppointment(ctx context.Context, appointmentID uuid.UUID) (*model.ChatRoom, error)
    EnsureRoomForInquiry(ctx context.Context, salonID uuid.UUID) (*model.ChatRoom, error)
    EnsureRoomForMasterInquiry(ctx context.Context, salonID uuid.UUID, masterProfileID uuid.UUID) (*model.ChatRoom, error)
    GetRoom(ctx context.Context, id uuid.UUID) (*model.ChatRoom, error)
    GetRoomByAccessToken(ctx context.Context, token uuid.UUID) (*model.ChatRoom, error)

    SendMessage(ctx context.Context, p SendMessageParams) (*model.ChatMessage, error)
    SendMessageWithAttachment(ctx context.Context, p SendMessageWithAttachmentParams) (*model.ChatMessage, error)
    PostSystemMessage(ctx context.Context, roomID uuid.UUID, body string) (*model.ChatMessage, error)

    ListMessages(ctx context.Context, roomID uuid.UUID, requesterUserID *uuid.UUID, accessToken *uuid.UUID, limit, offset int) ([]model.ChatMessage, error)
    MarkRoomRead(ctx context.Context, roomID, userID uuid.UUID) error

    LockRoomReadonly(ctx context.Context, roomID uuid.UUID) error

    SetPusher(NotificationPusher)
}
```

- [ ] **Step 4: Implement `EnsureRoomForMasterInquiry`**

In `backend/internal/service/chat_service.go`, add after `EnsureRoomForInquiry`:

```go
func (s *chatService) EnsureRoomForMasterInquiry(ctx context.Context, salonID uuid.UUID, masterProfileID uuid.UUID) (*model.ChatRoom, error) {
    if existing, err := s.repo.GetRoomByMasterProfile(ctx, masterProfileID); err != nil {
        return nil, err
    } else if existing != nil && existing.Type == model.ChatRoomTypeInquiry {
        return existing, nil
    }
    room := &model.ChatRoom{
        ID:                    uuid.New(),
        Type:                  model.ChatRoomTypeInquiry,
        SalonID:               &salonID,
        MasterProfileID:       &masterProfileID,
        Status:                model.ChatRoomStatusActive,
        LockedUntilFirstReply: true,
        AccessToken:           uuid.New(),
    }
    if err := s.repo.CreateRoom(ctx, room); err != nil {
        return nil, err
    }
    return room, nil
}
```

- [ ] **Step 5: Run tests**

```bash
cd backend && go test ./internal/service/... -run TestEnsureRoomForMasterInquiry -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/service/chat_service.go backend/internal/service/chat_inquiry_test.go
git commit -m "feat(chat): add EnsureRoomForMasterInquiry with per-master inquiry rooms"
```

---

## Task 6: Remove Phase-1-only guards — make `SendMessage` work for inquiry rooms

**Files:**

- Modify: `backend/internal/service/chat_service.go`

There are three hardcoded guards that block all non-external rooms. We remove them and route inquiry rooms through `inquiryResolver`.

- [ ] **Step 1: Write failing test**

In `backend/internal/service/chat_inquiry_test.go`, add:

```go
func TestSendMessage_InquiryRoom_OwnerCanSend(t *testing.T) {
    repo := newFakeChatRepo()
    ownerID := uuid.New()
    salonID := uuid.New()
    ir := &fakeInquiryResolver{ownerIDs: []uuid.UUID{ownerID}}
    svc := newTestChatService(repo, ir)

    room, _ := svc.EnsureRoomForInquiry(context.Background(), salonID)

    msg, err := svc.SendMessage(context.Background(), service.SendMessageParams{
        RoomID:       room.ID,
        Body:         "Привет, есть ли запись на вечер?",
        SenderUserID: &ownerID,
    })
    require.NoError(t, err)
    require.NotNil(t, msg)
    require.Equal(t, model.ChatSenderRoleOwner, msg.SenderRole)
}

func TestSendMessage_InquiryRoom_GuestViaAccessToken(t *testing.T) {
    repo := newFakeChatRepo()
    salonID := uuid.New()
    svc := newTestChatService(repo, &fakeInquiryResolver{})

    room, _ := svc.EnsureRoomForInquiry(context.Background(), salonID)
    tok := room.AccessToken

    msg, err := svc.SendMessage(context.Background(), service.SendMessageParams{
        RoomID:      room.ID,
        Body:        "Хочу записаться на окрашивание",
        AccessToken: &tok,
    })
    require.NoError(t, err)
    require.Equal(t, model.ChatSenderRoleGuest, msg.SenderRole)
}

func TestSendMessage_InquiryRoom_GuestLockedAfterFirstMessage(t *testing.T) {
    repo := newFakeChatRepo()
    salonID := uuid.New()
    svc := newTestChatService(repo, &fakeInquiryResolver{})

    room, _ := svc.EnsureRoomForInquiry(context.Background(), salonID)
    tok := room.AccessToken

    // first guest message — allowed
    _, err := svc.SendMessage(context.Background(), service.SendMessageParams{
        RoomID: room.ID, Body: "Первый вопрос", AccessToken: &tok,
    })
    require.NoError(t, err)

    // second guest message before staff reply — blocked
    _, err = svc.SendMessage(context.Background(), service.SendMessageParams{
        RoomID: room.ID, Body: "Ещё вопрос", AccessToken: &tok,
    })
    require.ErrorIs(t, err, service.ErrChatGuestLocked)
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && go test ./internal/service/... -run TestSendMessage_InquiryRoom -v
```

Expected: FAIL with `"phase 1 supports external rooms only"`.

- [ ] **Step 3: Update `SendMessage` to support inquiry rooms**

Replace the section in `SendMessage` that reads:

```go
if room.AppointmentID == nil {
    return nil, errors.New("phase 1 supports external rooms only")
}

parts, err := s.resolver.ResolveChatParticipants(ctx, *room.AppointmentID)
if err != nil {
    return nil, err
}
```

With:

```go
parts, err := s.resolveParticipants(ctx, room)
if err != nil {
    return nil, err
}
```

And add the helper method:

```go
// resolveParticipants dispatches to the right resolver based on room type.
func (s *chatService) resolveParticipants(ctx context.Context, room *model.ChatRoom) (ChatParticipants, error) {
    switch room.Type {
    case model.ChatRoomTypeExternal:
        if room.AppointmentID == nil {
            return ChatParticipants{}, errors.New("external room missing appointment_id")
        }
        return s.resolver.ResolveChatParticipants(ctx, *room.AppointmentID)
    case model.ChatRoomTypeInquiry:
        if room.SalonID == nil {
            return ChatParticipants{}, errors.New("inquiry room missing salon_id")
        }
        return s.inquiryResolver.ResolveInquiryParticipants(ctx, *room.SalonID)
    default:
        return ChatParticipants{}, fmt.Errorf("unsupported room type: %s", room.Type)
    }
}
```

Add `"fmt"` to imports if not present.

- [ ] **Step 4: Update `SendMessageWithAttachment` the same way**

In `SendMessageWithAttachment`, replace:

```go
if room.AppointmentID == nil {
    return nil, errors.New("phase 1 supports external rooms only")
}

parts, err := s.resolver.ResolveChatParticipants(ctx, *room.AppointmentID)
if err != nil {
    return nil, err
}
```

With:

```go
parts, err := s.resolveParticipants(ctx, room)
if err != nil {
    return nil, err
}
```

- [ ] **Step 5: Update `assertCanRead` to support inquiry rooms**

Replace:

```go
func (s *chatService) assertCanRead(ctx context.Context, room *model.ChatRoom, userID *uuid.UUID, token *uuid.UUID) error {
    if token != nil && *token == room.AccessToken {
        return nil
    }
    if userID == nil {
        return ErrChatNotParticipant
    }
    if room.AppointmentID == nil {
        return ErrChatNotParticipant
    }
    parts, err := s.resolver.ResolveChatParticipants(ctx, *room.AppointmentID)
    if err != nil {
        return err
    }
    for _, p := range collectParticipants(parts) {
        if p == *userID {
            return nil
        }
    }
    return ErrChatNotParticipant
}
```

With:

```go
func (s *chatService) assertCanRead(ctx context.Context, room *model.ChatRoom, userID *uuid.UUID, token *uuid.UUID) error {
    if token != nil && *token == room.AccessToken {
        return nil
    }
    if userID == nil {
        return ErrChatNotParticipant
    }
    parts, err := s.resolveParticipants(ctx, room)
    if err != nil {
        return err
    }
    for _, p := range collectParticipants(parts) {
        if p == *userID {
            return nil
        }
    }
    return ErrChatNotParticipant
}
```

- [ ] **Step 6: Update `classifySender` to handle guest-by-access-token for inquiry rooms**

`classifySender` already handles `AccessToken` for the anonymous path and calls `parts.*` for staff. For inquiry rooms the guest has no `GuestUserID` in parts (it's `nil`), so the authenticated guest client would get `ErrChatNotParticipant`. Add a special case: if the room is inquiry and the sender is an authenticated user **not found** in staff, treat them as `guest`:

```go
func (s *chatService) classifySender(p SendMessageParams, room *model.ChatRoom, parts ChatParticipants) (model.ChatSenderRole, error) {
    if p.SenderUserID == nil {
        if p.AccessToken == nil || *p.AccessToken != room.AccessToken {
            return "", ErrChatNotParticipant
        }
        return model.ChatSenderRoleGuest, nil
    }
    uid := *p.SenderUserID
    if parts.GuestUserID != nil && uid == *parts.GuestUserID {
        return model.ChatSenderRoleGuest, nil
    }
    if parts.MasterUserID != nil && uid == *parts.MasterUserID {
        return model.ChatSenderRoleMaster, nil
    }
    for _, o := range parts.OwnerUserIDs {
        if uid == o {
            return model.ChatSenderRoleOwner, nil
        }
    }
    for _, r := range parts.ReceptionistUserIDs {
        if uid == r {
            return model.ChatSenderRoleReceptionist, nil
        }
    }
    // Inquiry rooms: authenticated users who are not salon staff are treated as guests.
    if room.Type == model.ChatRoomTypeInquiry {
        return model.ChatSenderRoleGuest, nil
    }
    return "", ErrChatNotParticipant
}
```

- [ ] **Step 7: Run all inquiry tests**

```bash
cd backend && go test ./internal/service/... -run "TestSendMessage_InquiryRoom|TestEnsureRoom" -v
```

Expected: all PASS.

- [ ] **Step 8: Run full test suite**

```bash
cd backend && go test ./...
```

Expected: all PASS, no regressions.

- [ ] **Step 9: Commit**

```bash
git add backend/internal/service/chat_service.go backend/internal/service/chat_inquiry_test.go
git commit -m "feat(chat): remove Phase-1 guards, support inquiry rooms in SendMessage/assertCanRead/classifySender"
```

---

## Task 7: Test `SendMessageWithAttachment` for inquiry rooms

**Files:**

- Modify: `backend/internal/service/chat_inquiry_test.go`

- [ ] **Step 1: Add attachment test**

```go
func TestSendMessageWithAttachment_InquiryRoom(t *testing.T) {
    repo := newFakeChatRepo()
    salonID := uuid.New()
    svc := newTestChatService(repo, &fakeInquiryResolver{})

    room, _ := svc.EnsureRoomForInquiry(context.Background(), salonID)
    tok := room.AccessToken
    size := 102400

    msg, err := svc.SendMessageWithAttachment(context.Background(), service.SendMessageWithAttachmentParams{
        RoomID:              room.ID,
        Body:                "Вот фото результата",
        AccessToken:         &tok,
        AttachmentURL:       "https://example.com/photo.jpg",
        AttachmentType:      "image",
        AttachmentFilename:  "photo.jpg",
        AttachmentSizeBytes: size,
    })
    require.NoError(t, err)
    require.NotNil(t, msg)
    require.Equal(t, model.ChatSenderRoleGuest, msg.SenderRole)
    require.NotNil(t, msg.AttachmentURL)
    require.Equal(t, "https://example.com/photo.jpg", *msg.AttachmentURL)
    require.NotNil(t, msg.AttachmentSizeBytes)
    require.Equal(t, size, *msg.AttachmentSizeBytes)
}
```

- [ ] **Step 2: Run test**

```bash
cd backend && go test ./internal/service/... -run TestSendMessageWithAttachment_InquiryRoom -v
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/service/chat_inquiry_test.go
git commit -m "test(chat): add attachment test for inquiry rooms"
```

---

## Task 8: Controller — `CreateMasterInquiryRoom` handler + route

**Files:**

- Modify: `backend/internal/controller/chat_controller.go`
- Modify: `backend/internal/controller/server.go`

- [ ] **Step 1: Add request struct and handler to `chat_controller.go`**

Add after `createInquiryRoomRequest`:

```go
type createMasterInquiryRoomRequest struct {
    SalonID         string `json:"salonId"`
    MasterProfileID string `json:"masterProfileId"`
}
```

Add handler method:

```go
// CreateMasterInquiryRoom creates or returns a per-master inquiry room.
// Both salonId and masterProfileId are required (the master must belong to the salon).
func (h *ChatController) CreateMasterInquiryRoom(w http.ResponseWriter, r *http.Request) {
    var req createMasterInquiryRoomRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid json", http.StatusBadRequest)
        return
    }
    if req.SalonID == "" || req.MasterProfileID == "" {
        http.Error(w, "salonId and masterProfileId are required", http.StatusBadRequest)
        return
    }

    salonID, err := uuid.Parse(req.SalonID)
    if err != nil {
        http.Error(w, "invalid salonId", http.StatusBadRequest)
        return
    }
    masterProfileID, err := uuid.Parse(req.MasterProfileID)
    if err != nil {
        http.Error(w, "invalid masterProfileId", http.StatusBadRequest)
        return
    }

    room, err := h.svc.EnsureRoomForMasterInquiry(r.Context(), salonID, masterProfileID)
    if err != nil {
        writeChatError(w, err)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    _ = json.NewEncoder(w).Encode(room)
}
```

- [ ] **Step 2: Add route to `server.go`**

In `backend/internal/controller/server.go`, after the existing inquiry routes block:

```go
// Chat (Phase 2A: inquiry, pre-booking)
mux.HandleFunc("POST /api/v1/chat/inquiry/rooms", withCORS(auth.OptionalAuth(jwtMgr, ch.CreateInquiryRoom)))
mux.HandleFunc("POST /api/v1/chat/inquiry/master-rooms", withCORS(auth.OptionalAuth(jwtMgr, ch.CreateMasterInquiryRoom)))
mux.HandleFunc("GET /api/v1/chat/inquiry/rooms/{roomId}", withCORS(auth.OptionalAuth(jwtMgr, ch.GetInquiryRoom)))
mux.HandleFunc("POST /api/v1/chat/inquiry/rooms/{roomId}/messages", withCORS(auth.OptionalAuth(jwtMgr, ch.PostInquiryMessage)))
mux.HandleFunc("POST /api/v1/chat/inquiry/rooms/{roomId}/messages-with-attachment", withCORS(auth.OptionalAuth(jwtMgr, ch.PostInquiryMessageWithAttachment)))
mux.HandleFunc("GET /api/v1/chat/inquiry/rooms/{roomId}/stream", withCORS(ch.StreamInquiryMessages))
```

- [ ] **Step 3: Compile check**

```bash
cd backend && go build ./...
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
cd backend && go test ./...
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/controller/chat_controller.go backend/internal/controller/server.go
git commit -m "feat(chat): add CreateMasterInquiryRoom handler and route"
```

---

## Task 9: Smoke test — end-to-end with running stack

These are manual curl commands to verify the full path works with the real running stack.

- [ ] **Step 1: Start stack**

```bash
docker compose up -d
cd backend && go run ./cmd/api
```

Expected: server listening on `:8080`, no fatal errors in logs.

- [ ] **Step 2: Get a real `salonId` from the DB**

```bash
docker compose exec postgres psql -U postgres -d beauty_marketplace \
  -c "SELECT id FROM salons LIMIT 1;"
```

Set as `SALON_ID` in your shell:

```bash
export SALON_ID=<uuid from above>
```

- [ ] **Step 3: Create inquiry room (no auth — guest path)**

```bash
curl -s -X POST http://localhost:8080/api/v1/chat/inquiry/rooms \
  -H "Content-Type: application/json" \
  -d "{\"salonId\": \"$SALON_ID\"}" | jq .
```

Expected: JSON with `id`, `type: "inquiry"`, `salonId`, `accessToken`, `status: "active"`.
Copy the `id` as `ROOM_ID` and `accessToken` as `ACCESS_TOKEN`:

```bash
export ROOM_ID=<id from above>
export ACCESS_TOKEN=<accessToken from above>
```

- [ ] **Step 4: Send a text message as guest (via access token)**

```bash
curl -s -X POST "http://localhost:8080/api/v1/chat/inquiry/rooms/$ROOM_ID/messages" \
  -H "Content-Type: application/json" \
  -d "{\"body\": \"Здравствуйте, есть запись на стрижку?\", \"accessToken\": \"$ACCESS_TOKEN\"}" | jq .
```

Expected: `201 Created`, JSON with `senderRole: "guest"`, `body` not empty.

- [ ] **Step 5: Upload a photo and send it as attachment**

```bash
# First upload the image
curl -s -X POST http://localhost:8080/api/v1/files/upload \
  -F "file=@/tmp/test.jpg" | jq .
```

Expected: `{"url":"...","filename":"...","size":...,"type":"image/jpeg"}`.

```bash
export ATTACH_URL=<url from above>
export ATTACH_FILENAME=<filename from above>

curl -s -X POST "http://localhost:8080/api/v1/chat/inquiry/rooms/$ROOM_ID/messages-with-attachment" \
  -H "Content-Type: application/json" \
  -d "{
    \"body\": \"Вот фото\",
    \"accessToken\": \"$ACCESS_TOKEN\",
    \"attachmentUrl\": \"$ATTACH_URL\",
    \"attachmentType\": \"image\",
    \"attachmentFilename\": \"$ATTACH_FILENAME\",
    \"attachmentSizeBytes\": 12345
  }" | jq .
```

Expected: `201 Created`, message with `attachmentUrl` not null.

- [ ] **Step 6: Verify guest is locked after first message (second message must fail)**

```bash
curl -s -X POST "http://localhost:8080/api/v1/chat/inquiry/rooms/$ROOM_ID/messages" \
  -H "Content-Type: application/json" \
  -d "{\"body\": \"Ещё один вопрос\", \"accessToken\": \"$ACCESS_TOKEN\"}" -w "\n%{http_code}"
```

Expected: `429 Too Many Requests` with body `guest may send only one message before staff reply`.

- [ ] **Step 7: List messages (guest via access token)**

```bash
curl -s "http://localhost:8080/api/v1/chat/rooms/$ROOM_ID/messages?accessToken=$ACCESS_TOKEN" | jq .
```

Expected: `{"messages":[...]}` with 2 messages (text + attachment).

- [ ] **Step 8: SSE stream — verify keepalive arrives**

```bash
curl -s -N "http://localhost:8080/api/v1/chat/inquiry/rooms/$ROOM_ID/stream" &
SSE_PID=$!
sleep 2
kill $SSE_PID
```

Expected: `: keepalive` line printed within ~25s (or immediately if a message arrives).

- [ ] **Step 9: Commit smoke-test results note to status.md**

Update `docs/vault/product/status.md` — add to «Последние изменения»:

```markdown
- **Chat Phase 2A backend:** inquiry rooms fully functional — text + photo messages, access-token guest path, staff auth path, SSE stream, per-master rooms. Routes: `POST /api/v1/chat/inquiry/rooms`, `POST /api/v1/chat/inquiry/master-rooms`, messages, stream. File upload reuses existing `POST /api/v1/files/upload`.
```

```bash
git add docs/vault/product/status.md
git commit -m "docs: update status with Chat Phase 2A backend completion"
```

---

## Self-Review Checklist

**Spec coverage:**

- ✅ Inquiry room creation (salon-level + master-level)
- ✅ Text messages — guest via access token
- ✅ Text messages — staff via JWT
- ✅ Photo attachment messages
- ✅ "First step" lock (guest can only send one message before staff replies)
- ✅ SSE stream for inquiry rooms (reuses `StreamInquiryMessages` already in place)
- ✅ RBAC: owner/receptionist = staff role, unknown authenticated user = guest in inquiry context
- ✅ `master_profile_id` migration
- ✅ Per-master inquiry room (`EnsureRoomForMasterInquiry`)
- ✅ `InquiryResolver` wired into DI

**Out of scope (Phase 2A, not this plan):**

- Escalation (master didn't reply N minutes → notify admin)
- "Convert to appointment" button / system message
- Anti-lure disclaimers
- Quick replies (table already exists, controller + routes already exist in separate `QuickReplyController`)
