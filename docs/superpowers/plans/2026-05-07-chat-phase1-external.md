# Chat Phase 1 — External (Guest ↔ Master + Managers) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add appointment-bound chat between guest, master, salon owner and receptionists, with system messages, contact masking, lifecycle archival, and SSE-based real-time delivery.

**Architecture:** Three new tables (`chat_rooms`, `chat_messages`, `chat_message_reads`). Server-side service computes participants from `appointments` + `salon_members`. Sending = HTTP POST. Delivery = existing SSE stream `/api/v1/notifications/stream` with new event type `chat.message`. Anonymous guests authenticate via per-room `access_token` (UUID) embedded in SMS/Telegram link; on OTP login with same phone, ownership transfers automatically. Contact masking is storage-time (irreversible) using regex on RU phone formats and messenger links.

**Tech Stack:** Go 1.24, Uber Fx, GORM, PostgreSQL, net/http; React 18, Redux Toolkit Query, MUI, FSD; React Native (Expo), expo-notifications.

**Phase 2 (separate plan):** Internal chat (salon channel + DM) and "Ask a question" (pre-booking inquiry). See `docs/vault/product/chat-roadmap.md`.

**Conventions used in this plan:**
- Backend test command: `cd backend && go test ./internal/...` (or specific package)
- Frontend test command: `cd frontend && npm test -- --run <pattern>`
- Mobile test command: `cd mobile && npm test`
- All new Go files must include build directive only if existing files do; otherwise plain `package` directive

---

## File Structure

**Backend (Go):**
- Create `backend/migrations/000034_chat_tables.up.sql` + `.down.sql`
- Create `backend/internal/model/chat.go` — `ChatRoom`, `ChatMessage`, `ChatMessageRead`
- Create `backend/internal/repository/chat_repository.go` — interface
- Create `backend/internal/infrastructure/persistence/chat_repository.go` — GORM impl
- Create `backend/internal/service/chat_masking.go` + `chat_masking_test.go`
- Create `backend/internal/service/chat_service.go` + `chat_service_test.go`
- Create `backend/internal/service/chat_archiver.go` + `chat_archiver_test.go`
- Create `backend/internal/controller/chat_controller.go` + `chat_controller_test.go`
- Modify `backend/internal/service/notification_service.go` — extend SSE event type
- Modify `backend/internal/service/appointment_notifier.go` — emit system chat messages on lifecycle events
- Modify `backend/internal/controller/server.go` — register chat routes
- Modify `backend/internal/app/app.go` — wire Fx providers + cron invoke

**Frontend (React, FSD):**
- Create `frontend/src/entities/chat/model/types.ts`
- Create `frontend/src/entities/chat/api/chatApi.ts` — RTK Query
- Create `frontend/src/entities/chat/lib/useChatStream.ts` — SSE subscription hook
- Create `frontend/src/entities/chat/index.ts` — barrel
- Create `frontend/src/features/chat-window/ui/ChatBubble.tsx`
- Create `frontend/src/features/chat-window/ui/ChatComposer.tsx`
- Create `frontend/src/features/chat-window/ui/ChatWindow.tsx`
- Create `frontend/src/features/chat-window/ui/ChatTrigger.tsx` — red fixed bubble
- Create `frontend/src/features/chat-window/index.ts`
- Create `frontend/src/pages/guest-chat/GuestChatPage.tsx`
- Modify `frontend/src/app/routes.ts` — add `/chat/:accessToken`
- Modify `frontend/src/pages/dashboard/.../AppointmentDrawer.tsx` — embed chat window
- Modify `frontend/src/pages/me/.../UserAppointmentDrawer.tsx` — embed chat window
- Modify `frontend/src/shared/i18n/ru.json` + `en.json` — add `chat.*` keys

**Mobile (React Native):**
- Create `mobile/src/api/chat.ts`
- Create `mobile/src/hooks/useChatStream.ts`
- Create `mobile/src/components/chat/ChatScreen.tsx`
- Create `mobile/src/components/chat/ChatBubble.tsx`
- Modify `mobile/app/(tabs)/appointments.tsx` (or detail screen) — link to chat
- Modify `mobile/src/notifications/handler.ts` — handle `chat.message` push

**Docs:**
- Modify `docs/vault/product/status.md` — add entry
- Modify `docs/vault/architecture/code-map.md` — register chat pointers
- (`docs/vault/product/chat-roadmap.md` already created with Phase 2 backlog)

---

## Task 1: Database migration

**Files:**
- Create: `backend/migrations/000034_chat_tables.up.sql`
- Create: `backend/migrations/000034_chat_tables.down.sql`

- [ ] **Step 1: Create up migration**

```sql
-- backend/migrations/000034_chat_tables.up.sql
BEGIN;

CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('external', 'internal', 'inquiry')),
    appointment_id UUID NULL REFERENCES appointments(id) ON DELETE CASCADE,
    salon_id UUID NULL REFERENCES salons(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'readonly', 'archived')),
    locked_until_first_reply BOOLEAN NOT NULL DEFAULT FALSE,
    access_token UUID NOT NULL DEFAULT gen_random_uuid(),
    readonly_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_rooms_external_has_appointment CHECK (
        type <> 'external' OR appointment_id IS NOT NULL
    ),
    CONSTRAINT chat_rooms_internal_has_salon CHECK (
        type <> 'internal' OR salon_id IS NOT NULL
    )
);

CREATE UNIQUE INDEX chat_rooms_external_appt_uniq
    ON chat_rooms(appointment_id)
    WHERE type = 'external';

CREATE UNIQUE INDEX chat_rooms_access_token_uniq ON chat_rooms(access_token);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('guest', 'master', 'owner', 'receptionist', 'system')),
    body TEXT NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_messages_system_has_no_sender CHECK (
        (is_system = TRUE AND sender_user_id IS NULL AND sender_role = 'system')
        OR (is_system = FALSE)
    )
);

CREATE INDEX chat_messages_room_created_idx ON chat_messages(room_id, created_at DESC);

CREATE TABLE chat_message_reads (
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

CREATE INDEX chat_message_reads_user_idx ON chat_message_reads(user_id);

COMMIT;
```

- [ ] **Step 2: Create down migration**

```sql
-- backend/migrations/000034_chat_tables.down.sql
BEGIN;
DROP TABLE IF EXISTS chat_message_reads;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_rooms;
COMMIT;
```

- [ ] **Step 3: Apply migration locally and verify**

Run: `cd backend && make migrate-up` (or equivalent in repo)
Expected: migration `000034` reported as applied
Run: `psql $DATABASE_URL -c '\d chat_rooms'`
Expected: table listed with all columns and constraints

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/000034_chat_tables.up.sql backend/migrations/000034_chat_tables.down.sql
git commit -m "feat(chat): add chat_rooms, chat_messages, chat_message_reads tables"
```

---

## Task 2: Domain models

**Files:**
- Create: `backend/internal/model/chat.go`

- [ ] **Step 1: Create model file**

```go
// backend/internal/model/chat.go
package model

import (
	"time"

	"github.com/google/uuid"
)

type ChatRoomType string

const (
	ChatRoomTypeExternal ChatRoomType = "external"
	ChatRoomTypeInternal ChatRoomType = "internal"
	ChatRoomTypeInquiry  ChatRoomType = "inquiry"
)

type ChatRoomStatus string

const (
	ChatRoomStatusActive   ChatRoomStatus = "active"
	ChatRoomStatusReadonly ChatRoomStatus = "readonly"
	ChatRoomStatusArchived ChatRoomStatus = "archived"
)

type ChatRoom struct {
	ID                    uuid.UUID      `gorm:"primaryKey" json:"id"`
	Type                  ChatRoomType   `json:"type"`
	AppointmentID         *uuid.UUID     `json:"appointmentId,omitempty"`
	SalonID               *uuid.UUID     `json:"salonId,omitempty"`
	Status                ChatRoomStatus `json:"status"`
	LockedUntilFirstReply bool           `gorm:"column:locked_until_first_reply" json:"lockedUntilFirstReply"`
	AccessToken           uuid.UUID      `gorm:"column:access_token" json:"-"`
	ReadonlyAt            *time.Time     `gorm:"column:readonly_at" json:"readonlyAt,omitempty"`
	CreatedAt             time.Time      `json:"createdAt"`
	UpdatedAt             time.Time      `json:"updatedAt"`
}

func (ChatRoom) TableName() string { return "chat_rooms" }

type ChatSenderRole string

const (
	ChatSenderRoleGuest        ChatSenderRole = "guest"
	ChatSenderRoleMaster       ChatSenderRole = "master"
	ChatSenderRoleOwner        ChatSenderRole = "owner"
	ChatSenderRoleReceptionist ChatSenderRole = "receptionist"
	ChatSenderRoleSystem       ChatSenderRole = "system"
)

type ChatMessage struct {
	ID           uuid.UUID      `gorm:"primaryKey" json:"id"`
	RoomID       uuid.UUID      `gorm:"column:room_id" json:"roomId"`
	SenderUserID *uuid.UUID     `gorm:"column:sender_user_id" json:"senderUserId,omitempty"`
	SenderRole   ChatSenderRole `gorm:"column:sender_role" json:"senderRole"`
	Body         string         `json:"body"`
	IsSystem     bool           `gorm:"column:is_system" json:"isSystem"`
	CreatedAt    time.Time      `json:"createdAt"`
}

func (ChatMessage) TableName() string { return "chat_messages" }

type ChatMessageRead struct {
	MessageID uuid.UUID `gorm:"column:message_id;primaryKey" json:"messageId"`
	UserID    uuid.UUID `gorm:"column:user_id;primaryKey" json:"userId"`
	ReadAt    time.Time `gorm:"column:read_at" json:"readAt"`
}

func (ChatMessageRead) TableName() string { return "chat_message_reads" }
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && go build ./internal/model/...`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add backend/internal/model/chat.go
git commit -m "feat(chat): add ChatRoom, ChatMessage, ChatMessageRead models"
```

---

## Task 3: Repository interface

**Files:**
- Create: `backend/internal/repository/chat_repository.go`

- [ ] **Step 1: Create interface**

```go
// backend/internal/repository/chat_repository.go
package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/model"
)

type ChatRepository interface {
	GetRoomByAppointment(ctx context.Context, appointmentID uuid.UUID) (*model.ChatRoom, error)
	GetRoomByID(ctx context.Context, id uuid.UUID) (*model.ChatRoom, error)
	GetRoomByAccessToken(ctx context.Context, token uuid.UUID) (*model.ChatRoom, error)
	CreateRoom(ctx context.Context, room *model.ChatRoom) error
	UpdateRoomStatus(ctx context.Context, roomID uuid.UUID, status model.ChatRoomStatus, readonlyAt *time.Time) error
	UnlockRoomFirstReply(ctx context.Context, roomID uuid.UUID) error

	InsertMessage(ctx context.Context, msg *model.ChatMessage) error
	ListMessages(ctx context.Context, roomID uuid.UUID, limit, offset int) ([]model.ChatMessage, error)
	CountUnreadForUser(ctx context.Context, roomID, userID uuid.UUID) (int64, error)

	MarkRead(ctx context.Context, messageID, userID uuid.UUID) error
	MarkAllReadInRoom(ctx context.Context, roomID, userID uuid.UUID) error

	// Lifecycle
	FindRoomsToReadonly(ctx context.Context, completedBefore time.Time) ([]model.ChatRoom, error)
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && go build ./internal/repository/...`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add backend/internal/repository/chat_repository.go
git commit -m "feat(chat): add ChatRepository interface"
```

---

## Task 4: Repository GORM implementation

**Files:**
- Create: `backend/internal/infrastructure/persistence/chat_repository.go`

- [ ] **Step 1: Implement repository**

```go
// backend/internal/infrastructure/persistence/chat_repository.go
package persistence

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/beauty-marketplace/backend/internal/model"
	"github.com/beauty-marketplace/backend/internal/repository"
)

type chatRepository struct {
	db *gorm.DB
}

func NewChatRepository(db *gorm.DB) repository.ChatRepository {
	return &chatRepository{db: db}
}

func (r *chatRepository) GetRoomByAppointment(ctx context.Context, appointmentID uuid.UUID) (*model.ChatRoom, error) {
	var room model.ChatRoom
	if err := r.db.WithContext(ctx).
		Where("appointment_id = ? AND type = ?", appointmentID, model.ChatRoomTypeExternal).
		First(&room).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &room, nil
}

func (r *chatRepository) GetRoomByID(ctx context.Context, id uuid.UUID) (*model.ChatRoom, error) {
	var room model.ChatRoom
	if err := r.db.WithContext(ctx).First(&room, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &room, nil
}

func (r *chatRepository) GetRoomByAccessToken(ctx context.Context, token uuid.UUID) (*model.ChatRoom, error) {
	var room model.ChatRoom
	if err := r.db.WithContext(ctx).First(&room, "access_token = ?", token).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &room, nil
}

func (r *chatRepository) CreateRoom(ctx context.Context, room *model.ChatRoom) error {
	return r.db.WithContext(ctx).Create(room).Error
}

func (r *chatRepository) UpdateRoomStatus(ctx context.Context, roomID uuid.UUID, status model.ChatRoomStatus, readonlyAt *time.Time) error {
	updates := map[string]any{
		"status":     status,
		"updated_at": time.Now(),
	}
	if readonlyAt != nil {
		updates["readonly_at"] = *readonlyAt
	}
	return r.db.WithContext(ctx).Model(&model.ChatRoom{}).
		Where("id = ?", roomID).Updates(updates).Error
}

func (r *chatRepository) UnlockRoomFirstReply(ctx context.Context, roomID uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&model.ChatRoom{}).
		Where("id = ?", roomID).
		Update("locked_until_first_reply", false).Error
}

func (r *chatRepository) InsertMessage(ctx context.Context, msg *model.ChatMessage) error {
	return r.db.WithContext(ctx).Create(msg).Error
}

func (r *chatRepository) ListMessages(ctx context.Context, roomID uuid.UUID, limit, offset int) ([]model.ChatMessage, error) {
	var msgs []model.ChatMessage
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if err := r.db.WithContext(ctx).
		Where("room_id = ?", roomID).
		Order("created_at ASC").
		Limit(limit).Offset(offset).
		Find(&msgs).Error; err != nil {
		return nil, err
	}
	return msgs, nil
}

func (r *chatRepository) CountUnreadForUser(ctx context.Context, roomID, userID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Table("chat_messages cm").
		Where(`cm.room_id = ? AND cm.sender_user_id <> ?
			AND NOT EXISTS (SELECT 1 FROM chat_message_reads r WHERE r.message_id = cm.id AND r.user_id = ?)`,
			roomID, userID, userID).
		Count(&count).Error
	return count, err
}

func (r *chatRepository) MarkRead(ctx context.Context, messageID, userID uuid.UUID) error {
	return r.db.WithContext(ctx).Exec(
		`INSERT INTO chat_message_reads (message_id, user_id) VALUES (?, ?)
		 ON CONFLICT (message_id, user_id) DO NOTHING`,
		messageID, userID,
	).Error
}

func (r *chatRepository) MarkAllReadInRoom(ctx context.Context, roomID, userID uuid.UUID) error {
	return r.db.WithContext(ctx).Exec(
		`INSERT INTO chat_message_reads (message_id, user_id)
		 SELECT id, ? FROM chat_messages WHERE room_id = ?
		 ON CONFLICT (message_id, user_id) DO NOTHING`,
		userID, roomID,
	).Error
}

func (r *chatRepository) FindRoomsToReadonly(ctx context.Context, completedBefore time.Time) ([]model.ChatRoom, error) {
	var rooms []model.ChatRoom
	err := r.db.WithContext(ctx).
		Joins("JOIN appointments a ON a.id = chat_rooms.appointment_id").
		Where(`chat_rooms.type = ? AND chat_rooms.status = ?
			AND a.status = 'completed' AND a.updated_at <= ?`,
			model.ChatRoomTypeExternal, model.ChatRoomStatusActive, completedBefore).
		Find(&rooms).Error
	return rooms, err
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && go build ./internal/infrastructure/persistence/...`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add backend/internal/infrastructure/persistence/chat_repository.go
git commit -m "feat(chat): add GORM ChatRepository implementation"
```

---

## Task 5: Contact masking — TDD

**Files:**
- Create: `backend/internal/service/chat_masking.go`
- Create: `backend/internal/service/chat_masking_test.go`

- [ ] **Step 1: Write failing tests**

```go
// backend/internal/service/chat_masking_test.go
package service

import "testing"

func TestMaskContacts_RUPhones(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"звони +7 (999) 123-45-67", "звони [контакт скрыт]"},
		{"мой 8-999-123-45-67", "мой [контакт скрыт]"},
		{"тел 89991234567", "тел [контакт скрыт]"},
		{"+79991234567 — это я", "[контакт скрыт] — это я"},
		{"7 999 123 45 67", "[контакт скрыт]"},
		{"номер не телефонный 12345", "номер не телефонный 12345"},
	}
	for _, c := range cases {
		got := MaskContacts(c.in)
		if got != c.want {
			t.Errorf("MaskContacts(%q) = %q; want %q", c.in, got, c.want)
		}
	}
}

func TestMaskContacts_Messengers(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"пиши t.me/master", "пиши [контакт скрыт]"},
		{"https://wa.me/79991234567 жду", "[контакт скрыт] жду"},
		{"мой Telegram: @master_beauty", "мой [контакт скрыт]"},
		{"WhatsApp есть", "[контакт скрыт] есть"},
		{"instagram.com/master", "[контакт скрыт]"},
		{"viber 89991234567", "[контакт скрыт] [контакт скрыт]"},
		{"normal text without contacts", "normal text without contacts"},
	}
	for _, c := range cases {
		got := MaskContacts(c.in)
		if got != c.want {
			t.Errorf("MaskContacts(%q) = %q; want %q", c.in, got, c.want)
		}
	}
}

func TestMaskContacts_PreservesEmpty(t *testing.T) {
	if MaskContacts("") != "" {
		t.Fatal("empty string should remain empty")
	}
}
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `cd backend && go test ./internal/service/ -run TestMaskContacts -v`
Expected: build error — `MaskContacts` undefined

- [ ] **Step 3: Implement masker**

```go
// backend/internal/service/chat_masking.go
package service

import "regexp"

const maskedPlaceholder = "[контакт скрыт]"

var (
	// RU phone: optional +7|7|8, then 10 digits with optional spaces/dashes/parens
	phoneRe = regexp.MustCompile(`(?i)(?:\+?7|8)[\s\-\(\)]*\d{3}[\s\-\(\)]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}`)

	// Messenger keywords (case-insensitive). Order matters: check URLs before bare keywords.
	messengerRe = regexp.MustCompile(`(?i)(https?://)?(t\.me|wa\.me|telegram\.me|api\.whatsapp\.com|instagram\.com|vk\.com|viber\.com)/?[\w\-/.@]*`)
	keywordRe   = regexp.MustCompile(`(?i)\b(telegram|whatsapp|вотсап|вацап|viber|вайбер|insta(gram)?|инст(аграмм?)?|вконтакте|@[a-z0-9_]{3,})\b`)
)

// MaskContacts replaces RU phone numbers and messenger references with a placeholder.
// Storage-time masking: the original text is never persisted.
func MaskContacts(s string) string {
	if s == "" {
		return s
	}
	s = phoneRe.ReplaceAllString(s, maskedPlaceholder)
	s = messengerRe.ReplaceAllString(s, maskedPlaceholder)
	s = keywordRe.ReplaceAllString(s, maskedPlaceholder)
	return s
}
```

- [ ] **Step 4: Run tests, expect PASS**

Run: `cd backend && go test ./internal/service/ -run TestMaskContacts -v`
Expected: PASS for all sub-cases

- [ ] **Step 5: Commit**

```bash
git add backend/internal/service/chat_masking.go backend/internal/service/chat_masking_test.go
git commit -m "feat(chat): contact masking for phones and messengers"
```

---

## Task 6: Chat service — interface + ensureRoom (TDD)

**Files:**
- Create: `backend/internal/service/chat_service.go`
- Create: `backend/internal/service/chat_service_test.go`

- [ ] **Step 1: Write failing test for EnsureRoomForAppointment**

```go
// backend/internal/service/chat_service_test.go
package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/model"
)

// fakeChatRepo — minimal in-memory stub
type fakeChatRepo struct {
	roomsByAppt  map[uuid.UUID]*model.ChatRoom
	roomsByID    map[uuid.UUID]*model.ChatRoom
	roomsByToken map[uuid.UUID]*model.ChatRoom
	messages     []model.ChatMessage
	reads        map[string]struct{}
}

func newFakeChatRepo() *fakeChatRepo {
	return &fakeChatRepo{
		roomsByAppt:  map[uuid.UUID]*model.ChatRoom{},
		roomsByID:    map[uuid.UUID]*model.ChatRoom{},
		roomsByToken: map[uuid.UUID]*model.ChatRoom{},
		reads:        map[string]struct{}{},
	}
}

func (f *fakeChatRepo) GetRoomByAppointment(_ context.Context, id uuid.UUID) (*model.ChatRoom, error) {
	return f.roomsByAppt[id], nil
}
func (f *fakeChatRepo) GetRoomByID(_ context.Context, id uuid.UUID) (*model.ChatRoom, error) {
	return f.roomsByID[id], nil
}
func (f *fakeChatRepo) GetRoomByAccessToken(_ context.Context, t uuid.UUID) (*model.ChatRoom, error) {
	return f.roomsByToken[t], nil
}
func (f *fakeChatRepo) CreateRoom(_ context.Context, r *model.ChatRoom) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	if r.AccessToken == uuid.Nil {
		r.AccessToken = uuid.New()
	}
	r.CreatedAt = time.Now()
	r.UpdatedAt = r.CreatedAt
	f.roomsByID[r.ID] = r
	if r.AppointmentID != nil {
		f.roomsByAppt[*r.AppointmentID] = r
	}
	f.roomsByToken[r.AccessToken] = r
	return nil
}
func (f *fakeChatRepo) UpdateRoomStatus(_ context.Context, id uuid.UUID, st model.ChatRoomStatus, ra *time.Time) error {
	if r, ok := f.roomsByID[id]; ok {
		r.Status = st
		if ra != nil {
			r.ReadonlyAt = ra
		}
	}
	return nil
}
func (f *fakeChatRepo) UnlockRoomFirstReply(_ context.Context, id uuid.UUID) error {
	if r, ok := f.roomsByID[id]; ok {
		r.LockedUntilFirstReply = false
	}
	return nil
}
func (f *fakeChatRepo) InsertMessage(_ context.Context, m *model.ChatMessage) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	m.CreatedAt = time.Now()
	f.messages = append(f.messages, *m)
	return nil
}
func (f *fakeChatRepo) ListMessages(_ context.Context, roomID uuid.UUID, limit, offset int) ([]model.ChatMessage, error) {
	var out []model.ChatMessage
	for _, m := range f.messages {
		if m.RoomID == roomID {
			out = append(out, m)
		}
	}
	return out, nil
}
func (f *fakeChatRepo) CountUnreadForUser(_ context.Context, _, _ uuid.UUID) (int64, error) {
	return 0, nil
}
func (f *fakeChatRepo) MarkRead(_ context.Context, m, u uuid.UUID) error {
	f.reads[m.String()+u.String()] = struct{}{}
	return nil
}
func (f *fakeChatRepo) MarkAllReadInRoom(_ context.Context, _, _ uuid.UUID) error { return nil }
func (f *fakeChatRepo) FindRoomsToReadonly(_ context.Context, _ time.Time) ([]model.ChatRoom, error) {
	return nil, nil
}

func TestEnsureRoomForAppointment_CreatesIfMissing(t *testing.T) {
	repo := newFakeChatRepo()
	svc := NewChatService(repo, nil, nil)
	apptID := uuid.New()

	room, err := svc.EnsureRoomForAppointment(context.Background(), apptID)
	if err != nil {
		t.Fatal(err)
	}
	if room.AppointmentID == nil || *room.AppointmentID != apptID {
		t.Errorf("expected appointmentID=%s, got %v", apptID, room.AppointmentID)
	}
	if room.Type != model.ChatRoomTypeExternal {
		t.Errorf("expected external type, got %s", room.Type)
	}
	if !room.LockedUntilFirstReply {
		t.Error("new external room should be locked until first staff reply")
	}
	if room.AccessToken == uuid.Nil {
		t.Error("expected access token to be generated")
	}
}

func TestEnsureRoomForAppointment_Idempotent(t *testing.T) {
	repo := newFakeChatRepo()
	svc := NewChatService(repo, nil, nil)
	apptID := uuid.New()

	r1, _ := svc.EnsureRoomForAppointment(context.Background(), apptID)
	r2, _ := svc.EnsureRoomForAppointment(context.Background(), apptID)

	if r1.ID != r2.ID {
		t.Errorf("expected same room across calls, got %s vs %s", r1.ID, r2.ID)
	}
}
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `cd backend && go test ./internal/service/ -run TestEnsureRoomForAppointment -v`
Expected: build error — `NewChatService`/`EnsureRoomForAppointment` undefined

- [ ] **Step 3: Implement service skeleton + EnsureRoomForAppointment**

```go
// backend/internal/service/chat_service.go
package service

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/beauty-marketplace/backend/internal/model"
	"github.com/beauty-marketplace/backend/internal/repository"
)

var (
	ErrChatRoomNotFound  = errors.New("chat room not found")
	ErrChatNotParticipant = errors.New("not a chat participant")
	ErrChatRoomReadonly  = errors.New("chat room is readonly")
	ErrChatGuestLocked   = errors.New("guest may send only one message before staff reply")
)

type ChatParticipants struct {
	GuestUserID    *uuid.UUID
	GuestPhone     string
	MasterUserID   *uuid.UUID
	OwnerUserIDs   []uuid.UUID
	ReceptionistUserIDs []uuid.UUID
}

// AppointmentResolver returns participants for an appointment-bound chat room.
type AppointmentResolver interface {
	ResolveChatParticipants(ctx context.Context, appointmentID uuid.UUID) (ChatParticipants, error)
}

type ChatService interface {
	EnsureRoomForAppointment(ctx context.Context, appointmentID uuid.UUID) (*model.ChatRoom, error)
	GetRoom(ctx context.Context, id uuid.UUID) (*model.ChatRoom, error)
	GetRoomByAccessToken(ctx context.Context, token uuid.UUID) (*model.ChatRoom, error)

	SendMessage(ctx context.Context, p SendMessageParams) (*model.ChatMessage, error)
	PostSystemMessage(ctx context.Context, roomID uuid.UUID, body string) (*model.ChatMessage, error)

	ListMessages(ctx context.Context, roomID uuid.UUID, requesterUserID *uuid.UUID, accessToken *uuid.UUID, limit, offset int) ([]model.ChatMessage, error)
	MarkRoomRead(ctx context.Context, roomID, userID uuid.UUID) error

	LockRoomReadonly(ctx context.Context, roomID uuid.UUID) error
}

type SendMessageParams struct {
	RoomID      uuid.UUID
	Body        string
	SenderUserID *uuid.UUID
	AccessToken  *uuid.UUID // anonymous guest path
}

type ChatBroadcaster interface {
	BroadcastChatMessage(ctx context.Context, recipientUserIDs []uuid.UUID, payload json.RawMessage)
}

type chatService struct {
	repo        repository.ChatRepository
	resolver    AppointmentResolver
	broadcaster ChatBroadcaster
}

func NewChatService(repo repository.ChatRepository, resolver AppointmentResolver, broadcaster ChatBroadcaster) ChatService {
	return &chatService{repo: repo, resolver: resolver, broadcaster: broadcaster}
}

func (s *chatService) EnsureRoomForAppointment(ctx context.Context, apptID uuid.UUID) (*model.ChatRoom, error) {
	if existing, err := s.repo.GetRoomByAppointment(ctx, apptID); err != nil {
		return nil, err
	} else if existing != nil {
		return existing, nil
	}
	room := &model.ChatRoom{
		Type:                  model.ChatRoomTypeExternal,
		AppointmentID:         &apptID,
		Status:                model.ChatRoomStatusActive,
		LockedUntilFirstReply: true,
	}
	if err := s.repo.CreateRoom(ctx, room); err != nil {
		return nil, err
	}
	return room, nil
}

func (s *chatService) GetRoom(ctx context.Context, id uuid.UUID) (*model.ChatRoom, error) {
	r, err := s.repo.GetRoomByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if r == nil {
		return nil, ErrChatRoomNotFound
	}
	return r, nil
}

func (s *chatService) GetRoomByAccessToken(ctx context.Context, token uuid.UUID) (*model.ChatRoom, error) {
	r, err := s.repo.GetRoomByAccessToken(ctx, token)
	if err != nil {
		return nil, err
	}
	if r == nil {
		return nil, ErrChatRoomNotFound
	}
	return r, nil
}

// Stubs for later tasks (intentionally minimal so tests compile):
func (s *chatService) SendMessage(ctx context.Context, p SendMessageParams) (*model.ChatMessage, error) {
	return nil, errors.New("not implemented")
}
func (s *chatService) PostSystemMessage(ctx context.Context, roomID uuid.UUID, body string) (*model.ChatMessage, error) {
	return nil, errors.New("not implemented")
}
func (s *chatService) ListMessages(ctx context.Context, roomID uuid.UUID, requesterUserID *uuid.UUID, accessToken *uuid.UUID, limit, offset int) ([]model.ChatMessage, error) {
	return nil, errors.New("not implemented")
}
func (s *chatService) MarkRoomRead(ctx context.Context, roomID, userID uuid.UUID) error {
	return errors.New("not implemented")
}
func (s *chatService) LockRoomReadonly(ctx context.Context, roomID uuid.UUID) error {
	now := time.Now()
	return s.repo.UpdateRoomStatus(ctx, roomID, model.ChatRoomStatusReadonly, &now)
}
```

- [ ] **Step 4: Run tests, expect PASS**

Run: `cd backend && go test ./internal/service/ -run TestEnsureRoom -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/service/chat_service.go backend/internal/service/chat_service_test.go
git commit -m "feat(chat): ChatService skeleton with EnsureRoomForAppointment"
```

---

## Task 7: Appointment resolver — participants from appointment + salon_members

**Files:**
- Create: `backend/internal/service/chat_resolver.go`
- Create: `backend/internal/service/chat_resolver_test.go`

- [ ] **Step 1: Write failing test**

```go
// backend/internal/service/chat_resolver_test.go
package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

type fakeApptStore struct {
	apptID, masterUserID, ownerID, receptionistID uuid.UUID
	guestUserID                                   *uuid.UUID
	guestPhone                                    string
}

func (f *fakeApptStore) GetAppointmentChatContext(_ context.Context, id uuid.UUID) (apptChatRow, error) {
	if id != f.apptID {
		return apptChatRow{}, ErrChatRoomNotFound
	}
	return apptChatRow{
		AppointmentID:    f.apptID,
		MasterUserID:     &f.masterUserID,
		OwnerUserIDs:     []uuid.UUID{f.ownerID},
		ReceptionistIDs:  []uuid.UUID{f.receptionistID},
		GuestUserID:      f.guestUserID,
		GuestPhone:       f.guestPhone,
	}, nil
}

func TestAppointmentChatResolver_ReturnsAllParticipants(t *testing.T) {
	apptID := uuid.New()
	masterUID := uuid.New()
	ownerUID := uuid.New()
	recUID := uuid.New()
	guestUID := uuid.New()

	store := &fakeApptStore{
		apptID: apptID, masterUserID: masterUID,
		ownerID: ownerUID, receptionistID: recUID,
		guestUserID: &guestUID, guestPhone: "+79991234567",
	}
	r := NewAppointmentChatResolver(store)
	got, err := r.ResolveChatParticipants(context.Background(), apptID)
	if err != nil {
		t.Fatal(err)
	}
	if got.MasterUserID == nil || *got.MasterUserID != masterUID {
		t.Errorf("master mismatch: %+v", got.MasterUserID)
	}
	if len(got.OwnerUserIDs) != 1 || got.OwnerUserIDs[0] != ownerUID {
		t.Errorf("owner mismatch: %+v", got.OwnerUserIDs)
	}
	if len(got.ReceptionistUserIDs) != 1 || got.ReceptionistUserIDs[0] != recUID {
		t.Errorf("receptionist mismatch: %+v", got.ReceptionistUserIDs)
	}
	if got.GuestUserID == nil || *got.GuestUserID != guestUID {
		t.Errorf("guest mismatch: %+v", got.GuestUserID)
	}
	if got.GuestPhone != "+79991234567" {
		t.Errorf("phone mismatch: %s", got.GuestPhone)
	}
}
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `cd backend && go test ./internal/service/ -run TestAppointmentChatResolver -v`
Expected: build error

- [ ] **Step 3: Implement resolver + storage interface**

```go
// backend/internal/service/chat_resolver.go
package service

import (
	"context"

	"github.com/google/uuid"
)

type apptChatRow struct {
	AppointmentID   uuid.UUID
	MasterUserID    *uuid.UUID
	OwnerUserIDs    []uuid.UUID
	ReceptionistIDs []uuid.UUID
	GuestUserID     *uuid.UUID
	GuestPhone      string
}

// AppointmentChatStore aggregates participants of an appointment for chat purposes.
// Backed by appointments + salon_members + master_profiles via repository.
type AppointmentChatStore interface {
	GetAppointmentChatContext(ctx context.Context, appointmentID uuid.UUID) (apptChatRow, error)
}

type apptResolver struct {
	store AppointmentChatStore
}

func NewAppointmentChatResolver(store AppointmentChatStore) AppointmentResolver {
	return &apptResolver{store: store}
}

func (r *apptResolver) ResolveChatParticipants(ctx context.Context, appointmentID uuid.UUID) (ChatParticipants, error) {
	row, err := r.store.GetAppointmentChatContext(ctx, appointmentID)
	if err != nil {
		return ChatParticipants{}, err
	}
	return ChatParticipants{
		GuestUserID:         row.GuestUserID,
		GuestPhone:          row.GuestPhone,
		MasterUserID:        row.MasterUserID,
		OwnerUserIDs:        row.OwnerUserIDs,
		ReceptionistUserIDs: row.ReceptionistIDs,
	}, nil
}
```

- [ ] **Step 4: Add `GetAppointmentChatContext` to repository interface and GORM impl**

Modify `backend/internal/repository/chat_repository.go` — add to `ChatRepository`:

```go
GetAppointmentChatContext(ctx context.Context, appointmentID uuid.UUID) (AppointmentChatRow, error)
```

Add the row type at top of `chat_repository.go`:

```go
type AppointmentChatRow struct {
	AppointmentID   uuid.UUID
	MasterUserID    *uuid.UUID
	OwnerUserIDs    []uuid.UUID
	ReceptionistIDs []uuid.UUID
	GuestUserID     *uuid.UUID
	GuestPhone      string
}
```

Modify `backend/internal/infrastructure/persistence/chat_repository.go` — append:

```go
func (r *chatRepository) GetAppointmentChatContext(ctx context.Context, apptID uuid.UUID) (repository.AppointmentChatRow, error) {
	var apptRow struct {
		ID            uuid.UUID
		SalonID       *uuid.UUID
		MasterUserID  *uuid.UUID
		ClientUserID  *uuid.UUID
		GuestPhone    string
	}
	if err := r.db.WithContext(ctx).Raw(`
		SELECT a.id, a.salon_id, mp.user_id AS master_user_id, a.client_user_id, a.guest_phone
		FROM appointments a
		LEFT JOIN master_profiles mp ON mp.id = a.master_profile_id
		WHERE a.id = ?`, apptID).Scan(&apptRow).Error; err != nil {
		return repository.AppointmentChatRow{}, err
	}
	if apptRow.ID == uuid.Nil {
		return repository.AppointmentChatRow{}, gorm.ErrRecordNotFound
	}

	out := repository.AppointmentChatRow{
		AppointmentID: apptRow.ID,
		MasterUserID:  apptRow.MasterUserID,
		GuestUserID:   apptRow.ClientUserID,
		GuestPhone:    apptRow.GuestPhone,
	}
	if apptRow.SalonID != nil {
		var members []struct {
			UserID uuid.UUID
			Role   string
		}
		if err := r.db.WithContext(ctx).Raw(`
			SELECT user_id, role FROM salon_members
			WHERE salon_id = ? AND status = 'active' AND role IN ('owner','receptionist')`,
			*apptRow.SalonID).Scan(&members).Error; err != nil {
			return repository.AppointmentChatRow{}, err
		}
		for _, m := range members {
			switch m.Role {
			case "owner":
				out.OwnerUserIDs = append(out.OwnerUserIDs, m.UserID)
			case "receptionist":
				out.ReceptionistIDs = append(out.ReceptionistIDs, m.UserID)
			}
		}
	}
	return out, nil
}
```

Then update the resolver type alias in `chat_resolver.go` to use `repository.AppointmentChatRow` instead of the local `apptChatRow`. Replace the local `apptChatRow` struct and the resolver test fake to use `repository.AppointmentChatRow`.

> **Note:** verify `appointments` table column names with `psql ... \d appointments` before writing the SQL. Adjust `client_user_id`/`guest_phone`/`master_profile_id` to actual names if they differ. Do NOT proceed if columns differ — fix the query first.

- [ ] **Step 5: Run tests, expect PASS**

Run: `cd backend && go test ./internal/service/ -run TestAppointmentChatResolver -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/internal/service/chat_resolver.go backend/internal/service/chat_resolver_test.go backend/internal/repository/chat_repository.go backend/internal/infrastructure/persistence/chat_repository.go
git commit -m "feat(chat): appointment-based chat participant resolver"
```

---

## Task 8: SendMessage with masking, RBAC, lock rule (TDD)

**Files:**
- Modify: `backend/internal/service/chat_service.go`
- Modify: `backend/internal/service/chat_service_test.go`

- [ ] **Step 1: Write failing tests**

Append to `chat_service_test.go`:

```go
type fakeBroadcaster struct {
	calls []struct {
		recipients []uuid.UUID
		payload    []byte
	}
}

func (b *fakeBroadcaster) BroadcastChatMessage(_ context.Context, rcpts []uuid.UUID, payload json.RawMessage) {
	b.calls = append(b.calls, struct {
		recipients []uuid.UUID
		payload    []byte
	}{rcpts, payload})
}

type fixedResolver struct{ p ChatParticipants }

func (f *fixedResolver) ResolveChatParticipants(_ context.Context, _ uuid.UUID) (ChatParticipants, error) {
	return f.p, nil
}

func TestSendMessage_GuestFirstMessage_LockedRoom(t *testing.T) {
	repo := newFakeChatRepo()
	apptID := uuid.New()
	guestUID := uuid.New()
	masterUID := uuid.New()
	resolver := &fixedResolver{p: ChatParticipants{
		GuestUserID:  &guestUID,
		MasterUserID: &masterUID,
	}}
	bc := &fakeBroadcaster{}
	svc := NewChatService(repo, resolver, bc)

	room, _ := svc.EnsureRoomForAppointment(context.Background(), apptID)

	msg, err := svc.SendMessage(context.Background(), SendMessageParams{
		RoomID: room.ID, Body: "Здравствуйте!", SenderUserID: &guestUID,
	})
	if err != nil {
		t.Fatalf("first guest message must succeed: %v", err)
	}
	if msg.SenderRole != model.ChatSenderRoleGuest {
		t.Errorf("expected sender role guest, got %s", msg.SenderRole)
	}

	_, err = svc.SendMessage(context.Background(), SendMessageParams{
		RoomID: room.ID, Body: "ещё одно", SenderUserID: &guestUID,
	})
	if err != ErrChatGuestLocked {
		t.Errorf("expected ErrChatGuestLocked on second guest message, got %v", err)
	}
}

func TestSendMessage_StaffReplyUnlocksRoom(t *testing.T) {
	repo := newFakeChatRepo()
	apptID := uuid.New()
	guestUID := uuid.New()
	masterUID := uuid.New()
	resolver := &fixedResolver{p: ChatParticipants{
		GuestUserID:  &guestUID,
		MasterUserID: &masterUID,
	}}
	svc := NewChatService(repo, resolver, &fakeBroadcaster{})
	room, _ := svc.EnsureRoomForAppointment(context.Background(), apptID)

	svc.SendMessage(context.Background(), SendMessageParams{
		RoomID: room.ID, Body: "вопрос", SenderUserID: &guestUID,
	})
	_, err := svc.SendMessage(context.Background(), SendMessageParams{
		RoomID: room.ID, Body: "Ок, ждём", SenderUserID: &masterUID,
	})
	if err != nil {
		t.Fatalf("master reply failed: %v", err)
	}
	// after staff reply, guest can send again
	_, err = svc.SendMessage(context.Background(), SendMessageParams{
		RoomID: room.ID, Body: "спасибо", SenderUserID: &guestUID,
	})
	if err != nil {
		t.Fatalf("guest follow-up after staff reply must succeed: %v", err)
	}
}

func TestSendMessage_MasksPhoneAndMessenger(t *testing.T) {
	repo := newFakeChatRepo()
	apptID := uuid.New()
	masterUID := uuid.New()
	guestUID := uuid.New()
	resolver := &fixedResolver{p: ChatParticipants{
		GuestUserID: &guestUID, MasterUserID: &masterUID,
	}}
	svc := NewChatService(repo, resolver, &fakeBroadcaster{})
	room, _ := svc.EnsureRoomForAppointment(context.Background(), apptID)

	msg, err := svc.SendMessage(context.Background(), SendMessageParams{
		RoomID: room.ID, Body: "пиши на +7 999 123 45 67 или t.me/master",
		SenderUserID: &masterUID,
	})
	if err != nil {
		t.Fatal(err)
	}
	if !contains(msg.Body, "[контакт скрыт]") || contains(msg.Body, "+7") || contains(msg.Body, "t.me") {
		t.Errorf("contacts not masked: %q", msg.Body)
	}
}

func TestSendMessage_RejectsNonParticipant(t *testing.T) {
	repo := newFakeChatRepo()
	apptID := uuid.New()
	masterUID := uuid.New()
	resolver := &fixedResolver{p: ChatParticipants{MasterUserID: &masterUID}}
	svc := NewChatService(repo, resolver, &fakeBroadcaster{})
	room, _ := svc.EnsureRoomForAppointment(context.Background(), apptID)

	stranger := uuid.New()
	_, err := svc.SendMessage(context.Background(), SendMessageParams{
		RoomID: room.ID, Body: "hi", SenderUserID: &stranger,
	})
	if err != ErrChatNotParticipant {
		t.Errorf("expected ErrChatNotParticipant, got %v", err)
	}
}

func TestSendMessage_RejectsReadonlyRoom(t *testing.T) {
	repo := newFakeChatRepo()
	apptID := uuid.New()
	masterUID := uuid.New()
	resolver := &fixedResolver{p: ChatParticipants{MasterUserID: &masterUID}}
	svc := NewChatService(repo, resolver, &fakeBroadcaster{})
	room, _ := svc.EnsureRoomForAppointment(context.Background(), apptID)
	svc.LockRoomReadonly(context.Background(), room.ID)

	_, err := svc.SendMessage(context.Background(), SendMessageParams{
		RoomID: room.ID, Body: "hi", SenderUserID: &masterUID,
	})
	if err != ErrChatRoomReadonly {
		t.Errorf("expected ErrChatRoomReadonly, got %v", err)
	}
}

func TestSendMessage_AnonymousGuestByAccessToken(t *testing.T) {
	repo := newFakeChatRepo()
	apptID := uuid.New()
	masterUID := uuid.New()
	resolver := &fixedResolver{p: ChatParticipants{MasterUserID: &masterUID}}
	svc := NewChatService(repo, resolver, &fakeBroadcaster{})
	room, _ := svc.EnsureRoomForAppointment(context.Background(), apptID)

	tok := room.AccessToken
	msg, err := svc.SendMessage(context.Background(), SendMessageParams{
		RoomID: room.ID, Body: "анон-вопрос", AccessToken: &tok,
	})
	if err != nil {
		t.Fatal(err)
	}
	if msg.SenderRole != model.ChatSenderRoleGuest {
		t.Errorf("expected guest role for anonymous, got %s", msg.SenderRole)
	}
	if msg.SenderUserID != nil {
		t.Errorf("anonymous guest should have nil sender_user_id, got %v", msg.SenderUserID)
	}
}

// contains is a small helper so we don't need strings import inline
func contains(s, sub string) bool { return len(s) >= len(sub) && (s == sub || stringIndex(s, sub) >= 0) }
func stringIndex(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `cd backend && go test ./internal/service/ -run TestSendMessage -v`
Expected: tests fail (currently `SendMessage` returns "not implemented")

- [ ] **Step 3: Implement SendMessage**

Replace the stub `SendMessage` in `chat_service.go`:

```go
func (s *chatService) SendMessage(ctx context.Context, p SendMessageParams) (*model.ChatMessage, error) {
	if p.RoomID == uuid.Nil || p.Body == "" {
		return nil, errors.New("invalid params")
	}
	room, err := s.repo.GetRoomByID(ctx, p.RoomID)
	if err != nil {
		return nil, err
	}
	if room == nil {
		return nil, ErrChatRoomNotFound
	}
	if room.Status != model.ChatRoomStatusActive {
		return nil, ErrChatRoomReadonly
	}
	if room.AppointmentID == nil {
		return nil, errors.New("phase 1 supports external rooms only")
	}

	parts, err := s.resolver.ResolveChatParticipants(ctx, *room.AppointmentID)
	if err != nil {
		return nil, err
	}

	role, err := s.classifySender(p, room, parts)
	if err != nil {
		return nil, err
	}

	if role == model.ChatSenderRoleGuest && room.LockedUntilFirstReply {
		// guest can send only if no prior guest message exists
		prior, _ := s.repo.ListMessages(ctx, room.ID, 200, 0)
		for _, m := range prior {
			if m.SenderRole == model.ChatSenderRoleGuest {
				return nil, ErrChatGuestLocked
			}
		}
	}

	msg := &model.ChatMessage{
		RoomID:       room.ID,
		SenderUserID: p.SenderUserID,
		SenderRole:   role,
		Body:         MaskContacts(p.Body),
		IsSystem:     false,
	}
	if err := s.repo.InsertMessage(ctx, msg); err != nil {
		return nil, err
	}

	// staff reply unlocks the room
	if room.LockedUntilFirstReply && role != model.ChatSenderRoleGuest {
		if err := s.repo.UnlockRoomFirstReply(ctx, room.ID); err == nil {
			room.LockedUntilFirstReply = false
		}
	}

	s.broadcast(ctx, room, parts, msg, p.SenderUserID)
	return msg, nil
}

func (s *chatService) classifySender(p SendMessageParams, room *model.ChatRoom, parts ChatParticipants) (model.ChatSenderRole, error) {
	if p.SenderUserID == nil {
		// anonymous guest path requires matching access token
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
	return "", ErrChatNotParticipant
}

func (s *chatService) broadcast(ctx context.Context, room *model.ChatRoom, parts ChatParticipants, msg *model.ChatMessage, exclude *uuid.UUID) {
	if s.broadcaster == nil {
		return
	}
	rcpts := collectParticipants(parts)
	rcpts = filterUUID(rcpts, exclude)
	payload, _ := json.Marshal(map[string]any{
		"roomId":    msg.RoomID,
		"messageId": msg.ID,
		"senderRole": msg.SenderRole,
		"body":      msg.Body,
		"createdAt": msg.CreatedAt,
	})
	s.broadcaster.BroadcastChatMessage(ctx, rcpts, payload)
}

func collectParticipants(p ChatParticipants) []uuid.UUID {
	var out []uuid.UUID
	if p.GuestUserID != nil {
		out = append(out, *p.GuestUserID)
	}
	if p.MasterUserID != nil {
		out = append(out, *p.MasterUserID)
	}
	out = append(out, p.OwnerUserIDs...)
	out = append(out, p.ReceptionistUserIDs...)
	return out
}

func filterUUID(in []uuid.UUID, exclude *uuid.UUID) []uuid.UUID {
	if exclude == nil {
		return in
	}
	out := in[:0]
	for _, u := range in {
		if u != *exclude {
			out = append(out, u)
		}
	}
	return out
}
```

- [ ] **Step 4: Run tests, expect PASS**

Run: `cd backend && go test ./internal/service/ -run TestSendMessage -v`
Expected: PASS for all six sub-tests

- [ ] **Step 5: Commit**

```bash
git add backend/internal/service/chat_service.go backend/internal/service/chat_service_test.go
git commit -m "feat(chat): SendMessage with RBAC, lock rule, masking, broadcast"
```

---

## Task 9: ListMessages + MarkRoomRead + RBAC for reading

**Files:**
- Modify: `backend/internal/service/chat_service.go`
- Modify: `backend/internal/service/chat_service_test.go`

- [ ] **Step 1: Write failing tests**

Append:

```go
func TestListMessages_AnonymousAccessTokenAllowed(t *testing.T) {
	repo := newFakeChatRepo()
	apptID := uuid.New()
	masterUID := uuid.New()
	resolver := &fixedResolver{p: ChatParticipants{MasterUserID: &masterUID}}
	svc := NewChatService(repo, resolver, &fakeBroadcaster{})
	room, _ := svc.EnsureRoomForAppointment(context.Background(), apptID)
	tok := room.AccessToken
	svc.SendMessage(context.Background(), SendMessageParams{
		RoomID: room.ID, Body: "hi", AccessToken: &tok,
	})
	msgs, err := svc.ListMessages(context.Background(), room.ID, nil, &tok, 100, 0)
	if err != nil {
		t.Fatal(err)
	}
	if len(msgs) != 1 {
		t.Errorf("expected 1 message, got %d", len(msgs))
	}
}

func TestListMessages_RejectsStranger(t *testing.T) {
	repo := newFakeChatRepo()
	apptID := uuid.New()
	masterUID := uuid.New()
	resolver := &fixedResolver{p: ChatParticipants{MasterUserID: &masterUID}}
	svc := NewChatService(repo, resolver, &fakeBroadcaster{})
	room, _ := svc.EnsureRoomForAppointment(context.Background(), apptID)
	stranger := uuid.New()
	_, err := svc.ListMessages(context.Background(), room.ID, &stranger, nil, 100, 0)
	if err != ErrChatNotParticipant {
		t.Errorf("expected ErrChatNotParticipant, got %v", err)
	}
}
```

- [ ] **Step 2: Run, expect FAIL**

Run: `cd backend && go test ./internal/service/ -run TestListMessages -v`
Expected: tests fail (returns "not implemented")

- [ ] **Step 3: Implement**

Replace the stubs in `chat_service.go`:

```go
func (s *chatService) ListMessages(ctx context.Context, roomID uuid.UUID, requesterUserID *uuid.UUID, accessToken *uuid.UUID, limit, offset int) ([]model.ChatMessage, error) {
	room, err := s.repo.GetRoomByID(ctx, roomID)
	if err != nil {
		return nil, err
	}
	if room == nil {
		return nil, ErrChatRoomNotFound
	}
	if err := s.assertCanRead(ctx, room, requesterUserID, accessToken); err != nil {
		return nil, err
	}
	return s.repo.ListMessages(ctx, roomID, limit, offset)
}

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

func (s *chatService) MarkRoomRead(ctx context.Context, roomID, userID uuid.UUID) error {
	room, err := s.repo.GetRoomByID(ctx, roomID)
	if err != nil {
		return err
	}
	if room == nil {
		return ErrChatRoomNotFound
	}
	if err := s.assertCanRead(ctx, room, &userID, nil); err != nil {
		return err
	}
	return s.repo.MarkAllReadInRoom(ctx, roomID, userID)
}

func (s *chatService) PostSystemMessage(ctx context.Context, roomID uuid.UUID, body string) (*model.ChatMessage, error) {
	room, err := s.repo.GetRoomByID(ctx, roomID)
	if err != nil {
		return nil, err
	}
	if room == nil {
		return nil, ErrChatRoomNotFound
	}
	msg := &model.ChatMessage{
		RoomID:     roomID,
		SenderRole: model.ChatSenderRoleSystem,
		Body:       body,
		IsSystem:   true,
	}
	if err := s.repo.InsertMessage(ctx, msg); err != nil {
		return nil, err
	}
	if room.AppointmentID != nil {
		parts, err := s.resolver.ResolveChatParticipants(ctx, *room.AppointmentID)
		if err == nil {
			s.broadcast(ctx, room, parts, msg, nil)
		}
	}
	return msg, nil
}
```

- [ ] **Step 4: Run all chat-service tests, expect PASS**

Run: `cd backend && go test ./internal/service/ -run "TestSendMessage|TestListMessages|TestEnsureRoom|TestMaskContacts|TestAppointmentChatResolver" -v`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/service/chat_service.go backend/internal/service/chat_service_test.go
git commit -m "feat(chat): ListMessages, MarkRoomRead, PostSystemMessage with RBAC"
```

---

## Task 10: Lifecycle archiver — completed → readonly after 24h

**Files:**
- Create: `backend/internal/service/chat_archiver.go`
- Create: `backend/internal/service/chat_archiver_test.go`

- [ ] **Step 1: Write failing test**

```go
// backend/internal/service/chat_archiver_test.go
package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/model"
)

type fakeArchiverRepo struct {
	*fakeChatRepo
	dueRooms []model.ChatRoom
}

func (f *fakeArchiverRepo) FindRoomsToReadonly(_ context.Context, _ time.Time) ([]model.ChatRoom, error) {
	return f.dueRooms, nil
}

func TestChatArchiver_LocksRoomsCompletedOver24h(t *testing.T) {
	base := newFakeChatRepo()
	apptID := uuid.New()
	room := &model.ChatRoom{
		ID: uuid.New(), Type: model.ChatRoomTypeExternal,
		AppointmentID: &apptID, Status: model.ChatRoomStatusActive,
	}
	base.roomsByID[room.ID] = room
	repo := &fakeArchiverRepo{fakeChatRepo: base, dueRooms: []model.ChatRoom{*room}}

	a := NewChatArchiver(repo, 24*time.Hour, nil)
	n, err := a.RunOnce(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Errorf("expected 1 archived, got %d", n)
	}
	if base.roomsByID[room.ID].Status != model.ChatRoomStatusReadonly {
		t.Errorf("room status not updated: %s", base.roomsByID[room.ID].Status)
	}
}
```

- [ ] **Step 2: Run, expect FAIL**

Run: `cd backend && go test ./internal/service/ -run TestChatArchiver -v`
Expected: build error

- [ ] **Step 3: Implement archiver**

```go
// backend/internal/service/chat_archiver.go
package service

import (
	"context"
	"time"

	"go.uber.org/zap"

	"github.com/beauty-marketplace/backend/internal/model"
	"github.com/beauty-marketplace/backend/internal/repository"
)

type ChatArchiver struct {
	repo   repository.ChatRepository
	grace  time.Duration
	log    *zap.Logger
}

func NewChatArchiver(repo repository.ChatRepository, grace time.Duration, log *zap.Logger) *ChatArchiver {
	if log == nil {
		log = zap.NewNop()
	}
	return &ChatArchiver{repo: repo, grace: grace, log: log}
}

// RunOnce locks all active external rooms whose appointment completed before now-grace.
func (a *ChatArchiver) RunOnce(ctx context.Context) (int, error) {
	cutoff := time.Now().Add(-a.grace)
	rooms, err := a.repo.FindRoomsToReadonly(ctx, cutoff)
	if err != nil {
		return 0, err
	}
	now := time.Now()
	count := 0
	for _, r := range rooms {
		if err := a.repo.UpdateRoomStatus(ctx, r.ID, model.ChatRoomStatusReadonly, &now); err != nil {
			a.log.Warn("chat archiver: failed to lock room", zap.String("room", r.ID.String()), zap.Error(err))
			continue
		}
		count++
	}
	return count, nil
}

// Start runs RunOnce on a ticker; cancel ctx to stop.
func (a *ChatArchiver) Start(ctx context.Context, period time.Duration) {
	go func() {
		t := time.NewTicker(period)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				if _, err := a.RunOnce(ctx); err != nil {
					a.log.Error("chat archiver tick failed", zap.Error(err))
				}
			}
		}
	}()
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `cd backend && go test ./internal/service/ -run TestChatArchiver -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/service/chat_archiver.go backend/internal/service/chat_archiver_test.go
git commit -m "feat(chat): archiver locks rooms 24h after appointment completed"
```

---

## Task 11: SSE broadcaster — wire chat into NotificationService

**Files:**
- Modify: `backend/internal/service/notification_service.go`

- [ ] **Step 1: Inspect notification service to find broadcast extension point**

Run: `grep -n "Subscribe\|publish\|broadcast" backend/internal/service/notification_service.go`
Note the existing `Subscribe(userID)` returning a channel and the internal `subs` map used for fan-out on `CreateForUsers`.

- [ ] **Step 2: Add a generic `BroadcastEvent` method that pushes a typed envelope to subscribers without persisting a notification row**

Append to `notification_service.go`:

```go
// EventEnvelope is the over-the-wire SSE payload for non-notification events (e.g. chat).
type EventEnvelope struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// PublishEvent delivers an arbitrary event to the SSE channels of the given users.
// It does not write to the notifications table.
func (s *notificationService) PublishEvent(userIDs []uuid.UUID, eventType string, data json.RawMessage) {
	env := EventEnvelope{Type: eventType, Data: data}
	payload, _ := json.Marshal(env)
	row := repository.NotificationRow{
		// Reuse the channel type but mark transient via Type field.
		Type: "__event__",
		Data: payload,
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, uid := range userIDs {
		if subs, ok := s.subs[uid]; ok {
			for ch := range subs {
				select {
				case ch <- row:
				default:
				}
			}
		}
	}
}
```

Add to interface:

```go
type NotificationService interface {
	// ...existing...
	PublishEvent(userIDs []uuid.UUID, eventType string, data json.RawMessage)
}
```

- [ ] **Step 3: Update SSE controller to forward `__event__` rows verbatim**

In `backend/internal/controller/notification_controller.go`, locate the `Stream` handler. When a row of type `__event__` is received, write it as-is using `event:` field equal to its envelope `Type`. Pseudocode (find `Stream` and adjust):

```go
if row.Type == "__event__" {
	var env service.EventEnvelope
	_ = json.Unmarshal(row.Data, &env)
	fmt.Fprintf(w, "event: %s\ndata: %s\n\n", env.Type, env.Data)
	flusher.Flush()
	continue
}
```

(Apply this branch above the existing `notification` event-write code.)

- [ ] **Step 4: Build to verify**

Run: `cd backend && go build ./...`
Expected: no errors

- [ ] **Step 5: Add chat broadcaster adapter**

Create `backend/internal/service/chat_broadcaster.go`:

```go
package service

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
)

type notificationChatBroadcaster struct {
	notif NotificationService
}

func NewChatBroadcaster(notif NotificationService) ChatBroadcaster {
	return &notificationChatBroadcaster{notif: notif}
}

func (b *notificationChatBroadcaster) BroadcastChatMessage(_ context.Context, recipients []uuid.UUID, payload json.RawMessage) {
	b.notif.PublishEvent(recipients, "chat.message", payload)
}
```

- [ ] **Step 6: Commit**

```bash
git add backend/internal/service/notification_service.go backend/internal/service/chat_broadcaster.go backend/internal/controller/notification_controller.go
git commit -m "feat(chat): SSE broadcasting for chat.message via notification stream"
```

---

## Task 12: System messages on appointment lifecycle events

**Files:**
- Modify: `backend/internal/service/appointment_notifier.go`

- [ ] **Step 1: Find existing emitters**

Run: `grep -n "appointment.created\|appointment.confirmed\|appointment.cancelled\|appointment.rescheduled" backend/internal/service/appointment_notifier.go`
Note where each event is currently published.

- [ ] **Step 2: Inject ChatService into AppointmentNotifier**

Open `appointment_notifier.go`, locate the constructor. Add `chat ChatService` to the struct and constructor. Update `NewAppointmentNotifier` callers (the Fx provider in `app.go`) accordingly — handled in Task 16.

- [ ] **Step 3: Post system messages on the four lifecycle events**

Add helper:

```go
func (n *appointmentNotifier) postChatSystem(ctx context.Context, apptID uuid.UUID, body string) {
	if n.chat == nil {
		return
	}
	room, err := n.chat.EnsureRoomForAppointment(ctx, apptID)
	if err != nil {
		return
	}
	_, _ = n.chat.PostSystemMessage(ctx, room.ID, body)
}
```

In each existing emitter, after the notification is sent, add:

| Event | Body |
|---|---|
| `appointment.created` | `Запись создана. Можно задать вопрос мастеру.` |
| `appointment.confirmed` | `Запись подтверждена.` |
| `appointment.rescheduled` | `Запись перенесена на {newDate}.` (substitute via `fmt.Sprintf`) |
| `appointment.cancelled` | `Запись отменена.` (then call `n.chat.LockRoomReadonly(ctx, room.ID)`) |
| `appointment.reminder` | `Мастер ожидает вас через 15 минут.` |

For each, call `n.postChatSystem(ctx, apptID, body)` immediately after the existing notification publish.

- [ ] **Step 4: Verify build**

Run: `cd backend && go build ./...`
Expected: compiles after Task 16 wires the new dependency. If you build now and `app.go` is not yet updated, expect Fx container error at runtime — that is acceptable since Task 16 finishes the wiring.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/service/appointment_notifier.go
git commit -m "feat(chat): emit system chat messages on appointment lifecycle events"
```

---

## Task 13: HTTP controller

**Files:**
- Create: `backend/internal/controller/chat_controller.go`
- Create: `backend/internal/controller/chat_controller_test.go`

- [ ] **Step 1: Write failing controller test**

```go
// backend/internal/controller/chat_controller_test.go
package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/beauty-marketplace/backend/internal/auth"
	"github.com/beauty-marketplace/backend/internal/model"
	"github.com/beauty-marketplace/backend/internal/service"
)

type fakeChatService struct {
	send   func(ctx context.Context, p service.SendMessageParams) (*model.ChatMessage, error)
	list   func(ctx context.Context, roomID uuid.UUID, u *uuid.UUID, t *uuid.UUID, l, o int) ([]model.ChatMessage, error)
	ensure func(ctx context.Context, apptID uuid.UUID) (*model.ChatRoom, error)
	getRoom func(ctx context.Context, id uuid.UUID) (*model.ChatRoom, error)
}

func (f *fakeChatService) EnsureRoomForAppointment(ctx context.Context, id uuid.UUID) (*model.ChatRoom, error) {
	return f.ensure(ctx, id)
}
func (f *fakeChatService) GetRoom(ctx context.Context, id uuid.UUID) (*model.ChatRoom, error) {
	return f.getRoom(ctx, id)
}
func (f *fakeChatService) GetRoomByAccessToken(_ context.Context, _ uuid.UUID) (*model.ChatRoom, error) {
	return nil, errors.New("nyi")
}
func (f *fakeChatService) SendMessage(ctx context.Context, p service.SendMessageParams) (*model.ChatMessage, error) {
	return f.send(ctx, p)
}
func (f *fakeChatService) PostSystemMessage(_ context.Context, _ uuid.UUID, _ string) (*model.ChatMessage, error) {
	return nil, errors.New("nyi")
}
func (f *fakeChatService) ListMessages(ctx context.Context, r uuid.UUID, u *uuid.UUID, t *uuid.UUID, l, o int) ([]model.ChatMessage, error) {
	return f.list(ctx, r, u, t, l, o)
}
func (f *fakeChatService) MarkRoomRead(_ context.Context, _ uuid.UUID, _ uuid.UUID) error { return nil }
func (f *fakeChatService) LockRoomReadonly(_ context.Context, _ uuid.UUID) error          { return nil }

func TestChatController_PostMessage_AuthUser(t *testing.T) {
	roomID := uuid.New()
	userID := uuid.New()
	svc := &fakeChatService{
		send: func(_ context.Context, p service.SendMessageParams) (*model.ChatMessage, error) {
			if p.SenderUserID == nil || *p.SenderUserID != userID {
				t.Errorf("expected senderUserID=%s, got %v", userID, p.SenderUserID)
			}
			return &model.ChatMessage{ID: uuid.New(), RoomID: p.RoomID, Body: p.Body}, nil
		},
	}
	ctrl := NewChatController(svc, zap.NewNop())

	body := bytes.NewBufferString(`{"body":"привет"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/chat/rooms/"+roomID.String()+"/messages", body)
	req = req.WithContext(auth.WithUserID(req.Context(), userID))
	req.SetPathValue("roomId", roomID.String())
	w := httptest.NewRecorder()

	ctrl.PostMessage(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["body"] != "привет" {
		t.Errorf("unexpected body: %v", resp)
	}
}

func TestChatController_PostMessage_AnonymousByToken(t *testing.T) {
	roomID := uuid.New()
	tok := uuid.New()
	svc := &fakeChatService{
		send: func(_ context.Context, p service.SendMessageParams) (*model.ChatMessage, error) {
			if p.AccessToken == nil || *p.AccessToken != tok {
				t.Errorf("expected token=%s, got %v", tok, p.AccessToken)
			}
			return &model.ChatMessage{ID: uuid.New(), RoomID: p.RoomID, Body: p.Body}, nil
		},
	}
	ctrl := NewChatController(svc, zap.NewNop())

	body := bytes.NewBufferString(`{"body":"hi","accessToken":"` + tok.String() + `"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/chat/rooms/"+roomID.String()+"/messages", body)
	req.SetPathValue("roomId", roomID.String())
	w := httptest.NewRecorder()

	ctrl.PostMessage(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}
```

- [ ] **Step 2: Run, expect FAIL**

Run: `cd backend && go test ./internal/controller/ -run TestChatController -v`
Expected: build error

- [ ] **Step 3: Implement controller**

```go
// backend/internal/controller/chat_controller.go
package controller

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/beauty-marketplace/backend/internal/auth"
	"github.com/beauty-marketplace/backend/internal/service"
)

type ChatController struct {
	svc service.ChatService
	log *zap.Logger
}

func NewChatController(svc service.ChatService, log *zap.Logger) *ChatController {
	return &ChatController{svc: svc, log: log}
}

type postMessageRequest struct {
	Body        string `json:"body"`
	AccessToken string `json:"accessToken,omitempty"`
}

func (h *ChatController) PostMessage(w http.ResponseWriter, r *http.Request) {
	roomID, err := uuid.Parse(r.PathValue("roomId"))
	if err != nil {
		http.Error(w, "invalid roomId", http.StatusBadRequest)
		return
	}
	var req postMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if req.Body == "" {
		http.Error(w, "body required", http.StatusBadRequest)
		return
	}

	params := service.SendMessageParams{RoomID: roomID, Body: req.Body}
	if uid, ok := auth.UserIDFromContext(r.Context()); ok {
		params.SenderUserID = &uid
	}
	if req.AccessToken != "" {
		tok, err := uuid.Parse(req.AccessToken)
		if err != nil {
			http.Error(w, "invalid accessToken", http.StatusBadRequest)
			return
		}
		params.AccessToken = &tok
	}
	if params.SenderUserID == nil && params.AccessToken == nil {
		http.Error(w, "auth required", http.StatusUnauthorized)
		return
	}

	msg, err := h.svc.SendMessage(r.Context(), params)
	if err != nil {
		writeChatError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(msg)
}

func (h *ChatController) ListMessages(w http.ResponseWriter, r *http.Request) {
	roomID, err := uuid.Parse(r.PathValue("roomId"))
	if err != nil {
		http.Error(w, "invalid roomId", http.StatusBadRequest)
		return
	}
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	var userID *uuid.UUID
	if uid, ok := auth.UserIDFromContext(r.Context()); ok {
		userID = &uid
	}
	var token *uuid.UUID
	if t := q.Get("accessToken"); t != "" {
		parsed, err := uuid.Parse(t)
		if err != nil {
			http.Error(w, "invalid accessToken", http.StatusBadRequest)
			return
		}
		token = &parsed
	}

	msgs, err := h.svc.ListMessages(r.Context(), roomID, userID, token, limit, offset)
	if err != nil {
		writeChatError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"messages": msgs})
}

func (h *ChatController) GetRoomForAppointment(w http.ResponseWriter, r *http.Request) {
	apptID, err := uuid.Parse(r.PathValue("appointmentId"))
	if err != nil {
		http.Error(w, "invalid appointmentId", http.StatusBadRequest)
		return
	}
	room, err := h.svc.EnsureRoomForAppointment(r.Context(), apptID)
	if err != nil {
		writeChatError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(room)
}

func (h *ChatController) MarkRead(w http.ResponseWriter, r *http.Request) {
	roomID, err := uuid.Parse(r.PathValue("roomId"))
	if err != nil {
		http.Error(w, "invalid roomId", http.StatusBadRequest)
		return
	}
	uid, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "auth required", http.StatusUnauthorized)
		return
	}
	if err := h.svc.MarkRoomRead(r.Context(), roomID, uid); err != nil {
		writeChatError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func writeChatError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrChatRoomNotFound):
		http.Error(w, err.Error(), http.StatusNotFound)
	case errors.Is(err, service.ErrChatNotParticipant):
		http.Error(w, err.Error(), http.StatusForbidden)
	case errors.Is(err, service.ErrChatRoomReadonly):
		http.Error(w, err.Error(), http.StatusConflict)
	case errors.Is(err, service.ErrChatGuestLocked):
		http.Error(w, err.Error(), http.StatusTooManyRequests)
	default:
		http.Error(w, "internal", http.StatusInternalServerError)
	}
}
```

> **If `auth.WithUserID` / `auth.UserIDFromContext` do not exist:** check `backend/internal/auth/` for the actual context helpers (look for `RequireAuth` middleware in `server.go`) and adjust calls. Do not invent helpers — adapt to what already exists.

- [ ] **Step 4: Run tests, expect PASS**

Run: `cd backend && go test ./internal/controller/ -run TestChatController -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/controller/chat_controller.go backend/internal/controller/chat_controller_test.go
git commit -m "feat(chat): HTTP controller for chat rooms and messages"
```

---

## Task 14: Wire chat into Fx + routes

**Files:**
- Modify: `backend/internal/app/app.go`
- Modify: `backend/internal/controller/server.go`

- [ ] **Step 1: Update Fx providers**

In `backend/internal/app/app.go`, inside the `fx.Provide(...)` block, add (alongside other repos and services):

```go
fx.Annotate(
    persistence.NewChatRepository,
    fx.As(new(repository.ChatRepository)),
),
service.NewAppointmentChatResolver,
service.NewChatBroadcaster,
service.NewChatService,
service.NewChatArchiver,
controller.NewChatController,
```

> **Resolver dependency note:** `NewAppointmentChatResolver` takes a `service.AppointmentChatStore`. The chat repository implements it via `GetAppointmentChatContext`. Add an Fx adapter:
>
> ```go
> func provideChatStore(r repository.ChatRepository) service.AppointmentChatStore {
>     return chatStoreAdapter{r: r}
> }
>
> type chatStoreAdapter struct{ r repository.ChatRepository }
>
> func (a chatStoreAdapter) GetAppointmentChatContext(ctx context.Context, id uuid.UUID) (service.AppointmentChatRow, error) {
>     row, err := a.r.GetAppointmentChatContext(ctx, id)
>     return service.AppointmentChatRow(row), err
> }
> ```
>
> Add `provideChatStore` to `fx.Provide(...)` and ensure the resolver test/fakes use the same `service.AppointmentChatRow` alias. (Or: simplify by exporting `repository.AppointmentChatRow` directly from the resolver — keep one type only.)

- [ ] **Step 2: Inject ChatService into AppointmentNotifier provider**

Update the existing `provideAppointmentNotifier` (or `service.NewAppointmentNotifier`) constructor signature to accept `service.ChatService` and pass it through. Confirm the Fx graph resolves with no missing deps.

- [ ] **Step 3: Start the archiver in Fx lifecycle**

Add an `fx.Invoke` after the existing `fx.Invoke(func(*http.Server) {})`:

```go
fx.Invoke(func(lc fx.Lifecycle, a *service.ChatArchiver) {
    ctx, cancel := context.WithCancel(context.Background())
    lc.Append(fx.Hook{
        OnStart: func(_ context.Context) error {
            a.Start(ctx, time.Hour)
            return nil
        },
        OnStop: func(_ context.Context) error {
            cancel()
            return nil
        },
    })
}),
```

Ensure `context` and `time` are imported.

- [ ] **Step 4: Register routes in server.go**

In `backend/internal/controller/server.go`, locate the route block. Add `ch *ChatController` to the `NewHTTPServer` parameters (alongside `nh *NotificationController`). Register routes:

```go
// Chat (Phase 1: external, appointment-bound)
mux.HandleFunc("GET /api/v1/chat/appointments/{appointmentId}/room", withCORS(auth.RequireAuth(jwtMgr, ch.GetRoomForAppointment)))
mux.HandleFunc("GET /api/v1/chat/rooms/{roomId}/messages", withCORS(ch.ListMessages))         // optional auth (token allowed)
mux.HandleFunc("POST /api/v1/chat/rooms/{roomId}/messages", withCORS(ch.PostMessage))           // optional auth
mux.HandleFunc("POST /api/v1/chat/rooms/{roomId}/read", withCORS(auth.RequireAuth(jwtMgr, ch.MarkRead)))
```

For the optional-auth routes, follow the pattern used elsewhere when both authenticated and token-bearing requests are accepted. If no such helper exists, write a small `optionalAuth(jwtMgr, handler)` wrapper that attaches the user ID to context when a valid Bearer token is present, and otherwise passes through unchanged.

- [ ] **Step 5: Build and run smoke**

Run: `cd backend && go build ./...`
Expected: no errors

Run: `cd backend && go test ./...`
Expected: all tests pass

- [ ] **Step 6: Manual smoke test**

Start the API locally (`make run` or equivalent). Use existing dev seed to obtain an appointment ID. With `curl`:

```bash
APPT_ID=<seed-appointment-id>
TOKEN=<jwt-of-master-or-owner>

# 1) Ensure room exists
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/chat/appointments/$APPT_ID/room

# 2) Post a message as authenticated staff
ROOM_ID=$(... extract from previous response ...)
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"body":"тест"}' \
  http://localhost:8080/api/v1/chat/rooms/$ROOM_ID/messages

# 3) List messages
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/chat/rooms/$ROOM_ID/messages
```

Expected: 200/201, message appears in list. Body of any message containing a phone or `t.me` should display as `[контакт скрыт]`.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/app/app.go backend/internal/controller/server.go
git commit -m "feat(chat): wire ChatController + archiver into Fx and HTTP router"
```

---

## Task 15: Frontend — entity types and RTK Query API

**Files:**
- Create: `frontend/src/entities/chat/model/types.ts`
- Create: `frontend/src/entities/chat/api/chatApi.ts`
- Create: `frontend/src/entities/chat/index.ts`

- [ ] **Step 1: Types**

```ts
// frontend/src/entities/chat/model/types.ts
export type ChatSenderRole = 'guest' | 'master' | 'owner' | 'receptionist' | 'system';
export type ChatRoomStatus = 'active' | 'readonly' | 'archived';
export type ChatRoomType = 'external' | 'internal' | 'inquiry';

export interface ChatRoom {
  id: string;
  type: ChatRoomType;
  appointmentId?: string | null;
  salonId?: string | null;
  status: ChatRoomStatus;
  lockedUntilFirstReply: boolean;
  readonlyAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderUserId?: string | null;
  senderRole: ChatSenderRole;
  body: string;
  isSystem: boolean;
  createdAt: string;
}

export interface SendMessageInput {
  roomId: string;
  body: string;
  accessToken?: string;
}
```

- [ ] **Step 2: RTK Query API**

```ts
// frontend/src/entities/chat/api/chatApi.ts
import { rtkApi } from '@/shared/api/rtkApi';
import type { ChatMessage, ChatRoom, SendMessageInput } from '../model/types';

export const chatApi = rtkApi.injectEndpoints({
  endpoints: (builder) => ({
    getRoomForAppointment: builder.query<ChatRoom, string>({
      query: (appointmentId) => ({
        url: `/chat/appointments/${appointmentId}/room`,
      }),
      providesTags: (room) => (room ? [{ type: 'ChatRoom', id: room.id }] : []),
    }),
    listMessages: builder.query<{ messages: ChatMessage[] }, { roomId: string; accessToken?: string; limit?: number; offset?: number }>({
      query: ({ roomId, accessToken, limit = 100, offset = 0 }) => {
        const params = new URLSearchParams();
        params.set('limit', String(limit));
        params.set('offset', String(offset));
        if (accessToken) params.set('accessToken', accessToken);
        return { url: `/chat/rooms/${roomId}/messages?${params.toString()}` };
      },
      providesTags: (_res, _err, arg) => [{ type: 'ChatMessages', id: arg.roomId }],
    }),
    sendMessage: builder.mutation<ChatMessage, SendMessageInput>({
      query: ({ roomId, body, accessToken }) => ({
        url: `/chat/rooms/${roomId}/messages`,
        method: 'POST',
        body: { body, accessToken },
      }),
      async onQueryStarted({ roomId, accessToken }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            chatApi.util.updateQueryData(
              'listMessages',
              { roomId, accessToken },
              (draft) => {
                draft.messages.push(data);
              },
            ),
          );
        } catch {
          /* RTK Query keeps cache untouched on error */
        }
      },
    }),
    markRoomRead: builder.mutation<void, string>({
      query: (roomId) => ({ url: `/chat/rooms/${roomId}/read`, method: 'POST' }),
      invalidatesTags: (_res, _err, roomId) => [{ type: 'ChatMessages', id: roomId }],
    }),
  }),
});

export const {
  useGetRoomForAppointmentQuery,
  useListMessagesQuery,
  useSendMessageMutation,
  useMarkRoomReadMutation,
} = chatApi;
```

- [ ] **Step 3: Add tag types to `rtkApi`**

Open `frontend/src/shared/api/rtkApi.ts`, find the `tagTypes` array, and add `'ChatRoom'`, `'ChatMessages'`.

- [ ] **Step 4: Barrel**

```ts
// frontend/src/entities/chat/index.ts
export * from './model/types';
export {
  chatApi,
  useGetRoomForAppointmentQuery,
  useListMessagesQuery,
  useSendMessageMutation,
  useMarkRoomReadMutation,
} from './api/chatApi';
```

- [ ] **Step 5: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/entities/chat frontend/src/shared/api/rtkApi.ts
git commit -m "feat(chat): RTK Query entity for chat rooms and messages"
```

---

## Task 16: Frontend — SSE subscription hook

**Files:**
- Create: `frontend/src/entities/chat/lib/useChatStream.ts`

- [ ] **Step 1: Inspect existing SSE hook**

Run: `grep -rn "EventSource\|notifications/stream" frontend/src/`
If a hook for the notifications stream exists, reuse it. Otherwise the new hook below opens its own EventSource.

- [ ] **Step 2: Implement hook**

```ts
// frontend/src/entities/chat/lib/useChatStream.ts
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { chatApi } from '../api/chatApi';
import type { ChatMessage } from '../model/types';

export interface ChatStreamPayload {
  roomId: string;
  messageId: string;
  senderRole: string;
  body: string;
  createdAt: string;
}

/** Subscribes to SSE chat.message events for a single room and patches RTK cache. */
export function useChatStream(opts: { roomId: string | undefined; accessToken?: string; baseUrl: string; authToken?: string }) {
  const dispatch = useDispatch();
  const { roomId, accessToken, baseUrl, authToken } = opts;

  useEffect(() => {
    if (!roomId) return;
    const url = new URL(`${baseUrl}/notifications/stream`);
    if (authToken) url.searchParams.set('token', authToken);
    if (accessToken) url.searchParams.set('chatAccessToken', accessToken);

    const es = new EventSource(url.toString(), { withCredentials: true });
    es.addEventListener('chat.message', (ev) => {
      try {
        const payload = JSON.parse((ev as MessageEvent).data) as ChatStreamPayload;
        if (payload.roomId !== roomId) return;
        dispatch(
          chatApi.util.updateQueryData('listMessages', { roomId, accessToken }, (draft) => {
            if (draft.messages.some((m) => m.id === payload.messageId)) return;
            const msg: ChatMessage = {
              id: payload.messageId,
              roomId: payload.roomId,
              senderRole: payload.senderRole as ChatMessage['senderRole'],
              body: payload.body,
              isSystem: payload.senderRole === 'system',
              createdAt: payload.createdAt,
              senderUserId: null,
            };
            draft.messages.push(msg);
          }),
        );
      } catch {
        /* ignore malformed events */
      }
    });
    return () => es.close();
  }, [roomId, accessToken, baseUrl, authToken, dispatch]);
}
```

> **Note:** confirm how the existing notifications SSE authenticates (Bearer header vs `?token=` query). Adjust the hook to match. If headers are required, use the existing project SSE wrapper instead of `EventSource` directly.

- [ ] **Step 3: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/entities/chat/lib/useChatStream.ts
git commit -m "feat(chat): useChatStream SSE subscription hook"
```

---

## Task 17: Frontend — chat UI primitives

**Files:**
- Create: `frontend/src/features/chat-window/ui/ChatBubble.tsx`
- Create: `frontend/src/features/chat-window/ui/ChatComposer.tsx`
- Create: `frontend/src/features/chat-window/ui/ChatWindow.tsx`
- Create: `frontend/src/features/chat-window/index.ts`

- [ ] **Step 1: ChatBubble**

```tsx
// frontend/src/features/chat-window/ui/ChatBubble.tsx
import { Box, Typography } from '@mui/material';
import type { ChatMessage } from '@/entities/chat';

export function ChatBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  if (msg.isSystem) {
    return (
      <Box sx={{ alignSelf: 'center', my: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
          {msg.body}
        </Typography>
      </Box>
    );
  }
  return (
    <Box
      sx={{
        alignSelf: isOwn ? 'flex-end' : 'flex-start',
        bgcolor: isOwn ? 'primary.main' : 'grey.100',
        color: isOwn ? 'primary.contrastText' : 'text.primary',
        px: 1.5,
        py: 1,
        borderRadius: 2,
        maxWidth: '78%',
        my: 0.25,
      }}
    >
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {msg.body}
      </Typography>
      <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mt: 0.25 }}>
        {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
      </Typography>
    </Box>
  );
}
```

- [ ] **Step 2: ChatComposer**

```tsx
// frontend/src/features/chat-window/ui/ChatComposer.tsx
import { Box, IconButton, TextField } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useState } from 'react';

export interface ChatComposerProps {
  disabled?: boolean;
  placeholder?: string;
  onSubmit: (body: string) => Promise<void>;
}

export function ChatComposer({ disabled, placeholder, onSubmit }: ChatComposerProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSubmit(trimmed);
      setValue('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
      <TextField
        fullWidth
        size="small"
        multiline
        maxRows={4}
        value={value}
        disabled={disabled || busy}
        placeholder={placeholder ?? 'Сообщение…'}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <IconButton color="primary" onClick={handleSubmit} disabled={disabled || busy || !value.trim()}>
        <SendIcon />
      </IconButton>
    </Box>
  );
}
```

- [ ] **Step 3: ChatWindow**

```tsx
// frontend/src/features/chat-window/ui/ChatWindow.tsx
import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect, useMemo, useRef } from 'react';
import {
  useGetRoomForAppointmentQuery,
  useListMessagesQuery,
  useMarkRoomReadMutation,
  useSendMessageMutation,
} from '@/entities/chat';
import { useChatStream } from '@/entities/chat/lib/useChatStream';
import { ChatBubble } from './ChatBubble';
import { ChatComposer } from './ChatComposer';

export interface ChatWindowProps {
  appointmentId: string;
  currentUserId?: string | null;
  /** When provided, chat is opened in anonymous mode using the access token. */
  accessToken?: string;
  /** Origin for SSE base URL (defaults to runtime env). */
  apiBase?: string;
  authToken?: string;
}

export function ChatWindow({ appointmentId, currentUserId, accessToken, apiBase = '/api/v1', authToken }: ChatWindowProps) {
  const room = useGetRoomForAppointmentQuery(appointmentId, { skip: !appointmentId || Boolean(accessToken) });
  const roomId = room.data?.id;

  const messages = useListMessagesQuery({ roomId: roomId ?? '', accessToken }, { skip: !roomId });

  const [send] = useSendMessageMutation();
  const [markRead] = useMarkRoomReadMutation();

  useChatStream({ roomId, accessToken, baseUrl: apiBase, authToken });

  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.data?.messages.length]);

  useEffect(() => {
    if (roomId && currentUserId) markRead(roomId);
  }, [roomId, currentUserId, markRead]);

  const isReadonly = room.data?.status === 'readonly';
  const isGuest = !currentUserId; // anonymous flow
  const guestLocked = useMemo(() => {
    if (!isGuest || !room.data?.lockedUntilFirstReply) return false;
    return (messages.data?.messages ?? []).some((m) => m.senderRole === 'guest');
  }, [isGuest, room.data, messages.data]);

  const composerDisabled = isReadonly || guestLocked;

  if (!roomId || messages.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box ref={listRef} sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', p: 1 }}>
        {(messages.data?.messages ?? []).map((m) => (
          <ChatBubble
            key={m.id}
            msg={m}
            isOwn={!!currentUserId && m.senderUserId === currentUserId}
          />
        ))}
      </Box>
      {isReadonly && (
        <Typography variant="caption" sx={{ p: 1, color: 'text.secondary', textAlign: 'center' }}>
          Чат закрыт.
        </Typography>
      )}
      {guestLocked && !isReadonly && (
        <Typography variant="caption" sx={{ p: 1, color: 'text.secondary', textAlign: 'center' }}>
          Сообщение отправлено мастеру. Дождитесь ответа, чтобы продолжить диалог.
        </Typography>
      )}
      <ChatComposer
        disabled={composerDisabled}
        placeholder={
          isGuest && room.data?.lockedUntilFirstReply
            ? 'Можно отправить одно сообщение мастеру'
            : 'Сообщение…'
        }
        onSubmit={async (body) => {
          await send({ roomId, body, accessToken }).unwrap();
        }}
      />
    </Box>
  );
}
```

- [ ] **Step 4: Barrel**

```ts
// frontend/src/features/chat-window/index.ts
export { ChatWindow } from './ui/ChatWindow';
export { ChatTrigger } from './ui/ChatTrigger';
```

- [ ] **Step 5: Build**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors (note: `ChatTrigger` exported in barrel will be added in next task — temporarily comment that line if running TSC now, or proceed to Task 18 first)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/chat-window
git commit -m "feat(chat): ChatWindow, ChatBubble, ChatComposer primitives"
```

---

## Task 18: Frontend — ChatTrigger (red fixed bubble) + unread badge

**Files:**
- Create: `frontend/src/features/chat-window/ui/ChatTrigger.tsx`

- [ ] **Step 1: Implement**

```tsx
// frontend/src/features/chat-window/ui/ChatTrigger.tsx
import { Badge, Drawer, Fab } from '@mui/material';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import { useState, type ReactNode } from 'react';

export interface ChatTriggerProps {
  unreadCount?: number;
  children: ReactNode; // ChatWindow instance
  drawerWidth?: number;
}

export function ChatTrigger({ unreadCount = 0, children, drawerWidth = 380 }: ChatTriggerProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Fab
        color="error"
        sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: (t) => t.zIndex.modal + 1 }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Открыть чат"
      >
        <Badge badgeContent={unreadCount} color="default" overlap="circular" invisible={!unreadCount}>
          <ChatBubbleIcon />
        </Badge>
      </Fab>
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: '100vw', sm: drawerWidth } } } }}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>{children}</div>
      </Drawer>
    </>
  );
}
```

- [ ] **Step 2: Build + commit**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

```bash
git add frontend/src/features/chat-window/ui/ChatTrigger.tsx
git commit -m "feat(chat): ChatTrigger fixed bubble with unread badge"
```

---

## Task 19: Frontend integration — salon dashboard appointment drawer

**Files:**
- Modify: `frontend/src/pages/dashboard/.../AppointmentDrawer.tsx` (locate via `grep -rn "AppointmentDrawer" frontend/src/pages/dashboard/`)

- [ ] **Step 1: Embed ChatWindow inside an existing drawer tab/section**

In `AppointmentDrawer.tsx`, add a Tabs control with two tabs: "Информация" (existing content) and "Чат". The Чат tab content:

```tsx
import { ChatWindow } from '@/features/chat-window';

// inside the component
<Box sx={{ height: 480 }}>
  <ChatWindow
    appointmentId={appointment.id}
    currentUserId={currentUser.id}
  />
</Box>
```

If the drawer already uses tabs, just add the new tab. If not, choose the smaller refactor — add a simple toggle or an accordion, whichever matches the existing UI patterns. **Do not** reorganize the drawer beyond what is needed.

- [ ] **Step 2: Verify in browser**

Start backend + frontend (`make dev` or equivalent). Log in as a salon owner with at least one pending appointment. Open the appointment drawer → switch to chat tab. Send a test message. Expect it to appear immediately. Open the same record in another browser as the master — message should arrive via SSE.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/dashboard
git commit -m "feat(chat): embed ChatWindow in salon dashboard appointment drawer"
```

---

## Task 20: Frontend integration — `/me` (registered guest)

**Files:**
- Modify: `frontend/src/pages/me/.../UserAppointmentDrawer.tsx` (locate via `grep -rn "UserAppointmentDrawer\|user-appointment" frontend/src/pages/me/`)

- [ ] **Step 1: Embed ChatTrigger + ChatWindow**

Inside the drawer for a single user appointment, render:

```tsx
import { ChatTrigger, ChatWindow } from '@/features/chat-window';
import { useGetRoomForAppointmentQuery } from '@/entities/chat';

const room = useGetRoomForAppointmentQuery(appointment.id);
// ...
<ChatTrigger unreadCount={0 /* TODO: derive from room messages later */}>
  <ChatWindow appointmentId={appointment.id} currentUserId={currentUser.id} />
</ChatTrigger>
```

- [ ] **Step 2: Verify in browser**

Log in as a registered user with an upcoming appointment. Open `/me`, click the red bubble → chat opens. Confirm "первое сообщение" lock is shown if no staff has replied yet.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/me
git commit -m "feat(chat): embed chat in /me appointment drawer"
```

---

## Task 21: Frontend — standalone `/chat/:accessToken` page

**Files:**
- Create: `frontend/src/pages/guest-chat/GuestChatPage.tsx`
- Modify: `frontend/src/app/routes.ts`

- [ ] **Step 1: Page implementation**

```tsx
// frontend/src/pages/guest-chat/GuestChatPage.tsx
import { Box, Container, Paper, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { ChatWindow } from '@/features/chat-window';
import { useGetRoomByTokenQuery } from '@/entities/chat'; // see step 2

export default function GuestChatPage() {
  const { accessToken } = useParams<{ accessToken: string }>();
  const room = useGetRoomByTokenQuery(accessToken ?? '', { skip: !accessToken });

  if (!accessToken) return <Typography>Нет токена доступа.</Typography>;

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h6" gutterBottom>
        Чат с салоном
      </Typography>
      <Paper sx={{ height: { xs: 'calc(100vh - 160px)', sm: 600 } }}>
        <Box sx={{ height: '100%' }}>
          {room.data && (
            <ChatWindow
              appointmentId={room.data.appointmentId ?? ''}
              accessToken={accessToken}
            />
          )}
        </Box>
      </Paper>
    </Container>
  );
}
```

- [ ] **Step 2: Add `getRoomByToken` endpoint to chatApi**

Backend: extend `chat_controller.go` with `GET /api/v1/chat/rooms/by-token/{token}` that calls `svc.GetRoomByAccessToken`. Register in `server.go`. (No auth required.)

Frontend: add to `chatApi.ts`:

```ts
getRoomByToken: builder.query<ChatRoom, string>({
  query: (token) => ({ url: `/chat/rooms/by-token/${token}` }),
}),
```

Export `useGetRoomByTokenQuery` from the barrel.

- [ ] **Step 3: Register route**

In `frontend/src/app/routes.ts` (or wherever route table lives):

```ts
{ path: '/chat/:accessToken', element: <GuestChatPage /> }
```

- [ ] **Step 4: Verify in browser**

Use the access token from a chat room created in earlier tasks. Open `http://localhost:5173/chat/<token>` in an incognito window. Expect the chat window to render and accept messages without auth.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/guest-chat frontend/src/app/routes.ts frontend/src/entities/chat backend/internal/controller
git commit -m "feat(chat): standalone /chat/:accessToken page for anonymous guests"
```

---

## Task 22: Frontend — i18n keys

**Files:**
- Modify: `frontend/src/shared/i18n/ru.json`
- Modify: `frontend/src/shared/i18n/en.json` (if EN exists)

- [ ] **Step 1: Add chat keys**

Append under root:

```json
"chat": {
  "title": "Чат",
  "placeholder": "Сообщение…",
  "guestLocked": "Сообщение отправлено мастеру. Дождитесь ответа, чтобы продолжить диалог.",
  "readonly": "Чат закрыт.",
  "guestFirstHint": "Можно отправить одно сообщение мастеру"
}
```

- [ ] **Step 2: Replace inline strings in ChatWindow with `t('chat.*')` calls**

Edit `ChatWindow.tsx` and `ChatComposer.tsx` to consume i18n via the existing `useTranslation` hook (find via `grep -n "useTranslation" frontend/src/`). Keep behavior identical.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/shared/i18n frontend/src/features/chat-window
git commit -m "feat(chat): i18n keys for chat UI strings"
```

---

## Task 23: Mobile — chat API client + hook

**Files:**
- Create: `mobile/src/api/chat.ts`
- Create: `mobile/src/hooks/useChatStream.ts`

- [ ] **Step 1: API client**

```ts
// mobile/src/api/chat.ts
import { apiClient } from './client';
import type { AxiosRequestConfig } from 'axios';

export type ChatSenderRole = 'guest' | 'master' | 'owner' | 'receptionist' | 'system';
export interface ChatMessage {
  id: string;
  roomId: string;
  senderUserId?: string | null;
  senderRole: ChatSenderRole;
  body: string;
  isSystem: boolean;
  createdAt: string;
}
export interface ChatRoom {
  id: string;
  appointmentId?: string | null;
  status: 'active' | 'readonly' | 'archived';
  lockedUntilFirstReply: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getRoomForAppointment(apptId: string, cfg?: AxiosRequestConfig) {
  const { data } = await apiClient.get<ChatRoom>(`/chat/appointments/${apptId}/room`, cfg);
  return data;
}
export async function listMessages(roomId: string, cfg?: AxiosRequestConfig) {
  const { data } = await apiClient.get<{ messages: ChatMessage[] }>(`/chat/rooms/${roomId}/messages?limit=100`, cfg);
  return data.messages;
}
export async function sendMessage(roomId: string, body: string, cfg?: AxiosRequestConfig) {
  const { data } = await apiClient.post<ChatMessage>(`/chat/rooms/${roomId}/messages`, { body }, cfg);
  return data;
}
export async function markRoomRead(roomId: string, cfg?: AxiosRequestConfig) {
  await apiClient.post(`/chat/rooms/${roomId}/read`, undefined, cfg);
}
```

- [ ] **Step 2: SSE hook (using `react-native-sse` if available, otherwise polling fallback)**

Run: `grep -rn "react-native-sse\|EventSource" mobile/`
If `react-native-sse` is in `package.json`, use it. Otherwise implement a 5-second polling hook in this task and leave a TODO note (no need to add a new dependency).

```ts
// mobile/src/hooks/useChatStream.ts (polling fallback variant)
import { useEffect, useRef } from 'react';
import { listMessages, type ChatMessage } from '../api/chat';

export function useChatStream(roomId: string | undefined, onAppend: (msgs: ChatMessage[]) => void) {
  const lastID = useRef<string | null>(null);
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const all = await listMessages(roomId);
        if (cancelled) return;
        const last = lastID.current;
        if (!last) {
          onAppend(all);
        } else {
          const idx = all.findIndex((m) => m.id === last);
          const tail = idx >= 0 ? all.slice(idx + 1) : all;
          if (tail.length) onAppend(tail);
        }
        lastID.current = all[all.length - 1]?.id ?? lastID.current;
      } catch {
        /* swallow transient errors */
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [roomId, onAppend]);
}
```

- [ ] **Step 3: Build verify**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add mobile/src/api/chat.ts mobile/src/hooks/useChatStream.ts
git commit -m "feat(chat): mobile chat API client + polling stream hook"
```

---

## Task 24: Mobile — ChatScreen + integration into appointment detail

**Files:**
- Create: `mobile/src/components/chat/ChatScreen.tsx`
- Create: `mobile/src/components/chat/ChatBubble.tsx`
- Modify: appointment detail screen (find via `grep -rn "AppointmentDetail\|appointments/" mobile/app/`)

- [ ] **Step 1: ChatBubble**

```tsx
// mobile/src/components/chat/ChatBubble.tsx
import { StyleSheet, Text, View } from 'react-native';
import type { ChatMessage } from '../../api/chat';

export function ChatBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  if (msg.isSystem) {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.system}>{msg.body}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.bubble, isOwn ? styles.own : styles.other]}>
      <Text style={isOwn ? styles.ownText : styles.otherText}>{msg.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '80%', borderRadius: 12, padding: 8, marginVertical: 2 },
  own: { alignSelf: 'flex-end', backgroundColor: '#7c3aed' },
  other: { alignSelf: 'flex-start', backgroundColor: '#eee' },
  ownText: { color: 'white' },
  otherText: { color: 'black' },
  systemWrap: { alignSelf: 'center', marginVertical: 4 },
  system: { fontStyle: 'italic', color: '#666', fontSize: 12 },
});
```

- [ ] **Step 2: ChatScreen**

```tsx
// mobile/src/components/chat/ChatScreen.tsx
import { useCallback, useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View, Text } from 'react-native';
import {
  getRoomForAppointment,
  listMessages,
  sendMessage,
  markRoomRead,
  type ChatMessage,
  type ChatRoom,
} from '../../api/chat';
import { useChatStream } from '../../hooks/useChatStream';
import { ChatBubble } from './ChatBubble';

export function ChatScreen({ appointmentId, currentUserId }: { appointmentId: string; currentUserId: string }) {
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await getRoomForAppointment(appointmentId);
      if (cancelled) return;
      setRoom(r);
      const m = await listMessages(r.id);
      if (cancelled) return;
      setMessages(m);
      await markRoomRead(r.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  const onAppend = useCallback((tail: ChatMessage[]) => {
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      return [...prev, ...tail.filter((m) => !seen.has(m.id))];
    });
  }, []);
  useChatStream(room?.id, onAppend);

  const send = async () => {
    const body = draft.trim();
    if (!body || !room) return;
    const msg = await sendMessage(room.id, body);
    setMessages((prev) => [...prev, msg]);
    setDraft('');
  };

  const readonly = room?.status === 'readonly';

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <ChatBubble msg={item} isOwn={item.senderUserId === currentUserId} />}
        contentContainerStyle={{ padding: 12, gap: 4 }}
      />
      {readonly ? (
        <Text style={styles.readonly}>Чат закрыт.</Text>
      ) : (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Сообщение…"
            multiline
            style={styles.input}
          />
          <TouchableOpacity onPress={send} style={styles.send} disabled={!draft.trim()}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'white' },
  composer: { flexDirection: 'row', padding: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' },
  input: { flex: 1, paddingHorizontal: 8, paddingVertical: 6, maxHeight: 100 },
  send: { paddingHorizontal: 12, justifyContent: 'center' },
  sendText: { color: '#7c3aed', fontWeight: '600' },
  readonly: { textAlign: 'center', color: '#666', padding: 8 },
});
```

- [ ] **Step 3: Integrate into appointment detail screen**

In the appointment detail screen, add a "Чат" button or tab that navigates to `ChatScreen`. The exact integration depends on existing navigation; reuse the `@gorhom/bottom-sheet` pattern already in use (`AppointmentQuickActionsSheet.tsx`) if practical.

- [ ] **Step 4: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Manual smoke test on simulator/Expo Go**

Open mobile app, open an appointment, tap chat, send a message, confirm message appears in salon dashboard via SSE within ~5 seconds (polling cadence).

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/chat mobile/app
git commit -m "feat(chat): mobile ChatScreen + integration in appointment detail"
```

---

## Task 25: Mobile — push notification on `chat.message`

**Files:**
- Modify: `mobile/src/notifications/handler.ts` (or wherever incoming Expo push payloads are handled — find via `grep -rn "addNotificationReceivedListener\|expo-notifications" mobile/src/`)

- [ ] **Step 1: Backend — opt to send push for chat messages**

To avoid breaking earlier tests that call `NewChatService(repo, resolver, broadcaster)` with three arguments, add the pusher via a setter rather than changing the constructor signature.

In `backend/internal/service/chat_service.go`:

```go
// add field
type chatService struct {
    repo        repository.ChatRepository
    resolver    AppointmentResolver
    broadcaster ChatBroadcaster
    pusher      NotificationPusher
}

// add setter (called from Fx wiring)
func (s *chatService) SetPusher(p NotificationPusher) { s.pusher = p }

// add to interface
type ChatService interface {
    // ...existing methods...
    SetPusher(NotificationPusher)
}
```

In the existing `broadcast` method, after `s.broadcaster.BroadcastChatMessage(...)`:

```go
if s.pusher != nil && len(rcpts) > 0 {
    ids := make([]string, 0, len(rcpts))
    for _, u := range rcpts {
        ids = append(ids, u.String())
    }
    s.pusher.PushForUsers(ctx, ids, "Новое сообщение в чате", msg.Body, payload)
}
```

In `backend/internal/app/app.go`, after both `service.NewChatService` and the pusher are constructed by Fx, add an `fx.Invoke` that wires them:

```go
fx.Invoke(func(c service.ChatService, p *push.ExpoPusher) {
    c.SetPusher(p)
}),
```

Note: `push.ExpoPusher` already implements `service.NotificationPusher` (used by `NotificationService`).

- [ ] **Step 2: Mobile — handle incoming `chat.message` payload**

In the mobile push handler, when payload `data.type === 'chat.message'`, navigate the user to the appointment chat (deep link via `router.push('/(tabs)/appointments?focusRoom=<roomId>')` or similar — adjust to existing routing). Foreground notifications should refresh the room messages query.

- [ ] **Step 3: Manual test**

Background the mobile app, send a chat message from the dashboard as guest. Expect a push to arrive on the master's device. Tap → opens the appointment chat.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/service/chat_service.go backend/internal/app/app.go mobile/src/notifications backend/internal/controller
git commit -m "feat(chat): push notify masters on new chat message"
```

---

## Task 26: Documentation update

**Files:**
- Modify: `docs/vault/product/status.md`
- Modify: `docs/vault/architecture/code-map.md`

- [ ] **Step 1: Append to `status.md` under "Последние изменения"**

Add a new dated section (today):

```markdown
### Последние изменения (2026-05-07)

- **Чат Phase 1 — внешний (Гость ↔ Мастер + Управленцы):** добавлены таблицы `chat_rooms` / `chat_messages` / `chat_message_reads` (миграция `000034`), сервисный слой с RBAC от участников записи, маскировка контактов (RU телефоны и мессенджеры) на storage-level, правило «первого шага» для гостя, разблокировка после ответа персонала, SSE-доставка через существующий `/api/v1/notifications/stream` (новое событие `chat.message`), системные сообщения на lifecycle-события записи (`appointment.created/confirmed/rescheduled/cancelled/reminder`), архивация чата через 24ч после `completed` (cron в Fx). Frontend: FSD-entity `entities/chat`, фича `features/chat-window` с `ChatTrigger` (красный fixed-block), интеграция в дашборд салона и `/me`, standalone-страница `/chat/:accessToken` для анонимных гостей. Mobile: `ChatScreen` + push-уведомления `chat.message`. Phase 2 (внутренний чат и «Задать вопрос») — отдельный план, см. [`product/chat-roadmap.md`](chat-roadmap.md).
```

- [ ] **Step 2: Append to `code-map.md`**

Add chat-related concept rows pointing to the new files.

- [ ] **Step 3: Commit**

```bash
git add docs/vault
git commit -m "docs(chat): document Phase 1 external chat in vault status and code map"
```

---

## Task 27: Final verification

- [ ] **Step 1: Full backend test suite**

Run: `cd backend && go test ./...`
Expected: PASS

- [ ] **Step 2: Frontend type check + tests**

Run: `cd frontend && npx tsc --noEmit && npm test -- --run`
Expected: PASS

- [ ] **Step 3: Mobile type check**

Run: `cd mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: End-to-end smoke**

Walk through these flows manually with a fresh DB seed:

1. Salon owner creates an appointment for a guest with phone `+79991234567` (no account).
2. Guest receives SMS/Telegram with link to `/chat/<token>` (use the `access_token` from the DB row directly for now).
3. Guest opens the link in incognito → sees system message "Запись создана…".
4. Guest types `пиши на +79998887766` — confirm stored as `пиши на [контакт скрыт]`.
5. Master logs into web dashboard → opens the appointment → sees chat tab with the masked guest message.
6. Master replies "Хорошо, ждём" → guest's window updates within ~1 sec via SSE.
7. Owner switches the appointment to `completed`, advances DB `updated_at` by 25 hours, runs archiver tick — verify `status='readonly'` and that the composer is disabled.

- [ ] **Step 5: If anything is broken, fix inline and recommit.** Otherwise:

```bash
git log --oneline | head -30
```

Plan complete.

---

## Reminders

- **Phase 2 backlog:** `docs/vault/product/chat-roadmap.md` — internal chat (salon channel + DM) and "Ask a question" pre-booking inquiry. Both are explicitly OUT OF SCOPE for this plan.
- **DB column names:** several tasks reference `appointments.client_user_id`, `appointments.guest_phone`, `appointments.master_profile_id`, `salon_members.role`, `salon_members.status`. Verify against `psql ... \d appointments` and `\d salon_members` before writing the SQL in Task 7. If names differ, adjust the queries — do not invent columns.
- **Auth helpers:** `auth.UserIDFromContext`, `auth.WithUserID`, `auth.RequireAuth`, `withCORS` are referenced by name. Check `backend/internal/auth/` and `backend/internal/controller/server.go` for the actual API and adapt accordingly. Do not invent helpers.
