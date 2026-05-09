# Implementation Plan — Chat Backend Polishing (Phase 2A/2C)

This plan covers the remaining backend tasks to fully stabilize the chat system, focusing on user experience (unread counts), safety (anti-lure), and workflow integration (appointment conversion).

## 1. Unread Counts

Enable the frontend to show red dots or numbers for unread messages.

- **Model**: Add `UnreadCount` field to `ChatRoom` struct (ignored by GORM during save, populated during fetch).
- **Repository**:
    - `GetUnreadCounts(ctx, userID) map[uuid.UUID]int`
    - `GetRoomByID` enrichment with unread count for a specific user.
- **Service**:
    - `GetRoomsWithUnread(ctx, userID)`
- **Controller**:
    - `GET /api/v1/chat/rooms/unread-counts` (returns counts per room for current user).

## 2. Anti-Lure Disclaimers & Welcome Messages

Automatically post system messages when a room is created to set expectations and warn about off-platform payments.

- **Service**:
    - Update `EnsureRoom...` methods to call `PostSystemMessage` with localized strings.
    - Note: System messages should not trigger "First step" lock (already handled as `SenderRole == system`).

## 3. "Convert to Appointment" Support

Provide a backend mechanism to signal that a chat inquiry is being turned into a real appointment.

- **Controller**:
    - `POST /api/v1/chat/rooms/{roomId}/request-appointment`
    - Payload: `{ serviceId, startsAt, priceCents }` (optional).
    - Logic: Posts a system message with a special JSON payload in the body that the frontend recognizes as a "Booking Request Card".

## 4. Inquiry Escalation (Background Job)

Notify admins if an inquiry remains unanswered.

- **Service**:
    - `EscalateUnansweredInquiries(ctx)` — Finds rooms with 1 guest message and 0 staff messages older than 15 minutes.
    - Sends Telegram/Push notification to salon owners.
- **Worker**:
    - Simple cron-like loop in `app.go` or a dedicated worker.

---

## Proposed Changes

### Database
No schema changes needed (using `chat_message_reads` and `is_system` flag).

### Backend (Go)

#### `ChatRepository` enrichment
```go
// Add to internal/repository/chat_repository.go
GetUnreadCount(ctx context.Context, roomID, userID uuid.UUID) (int, error)
```

#### `ChatService` welcome logic
```go
// In internal/service/chat_service.go
func (s *chatService) postWelcomeMessages(ctx context.Context, room *model.ChatRoom) {
    if room.Type == model.ChatRoomTypeInquiry {
        s.PostSystemMessage(ctx, room.ID, "safety.anti_lure_disclaimer")
    }
}
```

#### New Controller Endpoints
- `GET /api/v1/chat/rooms/unread`
- `POST /api/v1/chat/rooms/{id}/booking-request`
