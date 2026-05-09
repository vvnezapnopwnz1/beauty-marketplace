# Implementation Plan - Salon Inquiry Chat (Phase 2A/2B Completion)

This plan covers the remaining tasks for salon inquiry chat: guest-side "Ask a Question" interface on Web and the mobile staff dashboard integration.

## 1. Frontend Web (Guest Side)
Add the entry point for guests to start inquiry chats.

- [ ] **Create `InquiryChatDialog` component**: A modal containing the `ChatWindow` for guest use.
- [ ] **Update `SalonPage.tsx`**:
    - [ ] Handle "Задать вопрос" button click.
    - [ ] If logged in, use user data. If not, use anonymous session.
    - [ ] Call `createInquiryRoom` API.
    - [ ] Open the chat dialog with the returned `accessToken`.
- [ ] **Update `MasterPage.tsx`**: Similar implementation for individual master inquiries.

## 2. Mobile App (Staff Side)
Enable staff to manage inquiries from the mobile app.

- [ ] **Update `mobile/src/api/chat.ts`**:
    - [ ] Add `getRoom(roomId)` endpoint.
    - [ ] Add `listInquiryRooms(salonId)` endpoint.
    - [ ] Add `getUnreadCounts(roomIds)` endpoint.
    - [ ] Add `requestAppointment(roomId)` endpoint.
    - [ ] Update types `ChatMessage` and `ChatRoom` with new fields (`type`, `data`, `masterProfileId`).
- [ ] **Create `InquiriesScreen.tsx`**:
    - [ ] List all active inquiries for the salon.
    - [ ] Show unread badges.
    - [ ] Navigate to `ChatScreen` on click.
- [ ] **Update `ChatScreen.tsx`**:
    - [ ] Support loading by `roomId` (for inquiries).
    - [ ] Add "Request Appointment" button in the header for staff when in an inquiry room.
    - [ ] Handle `appointment_request` message type in `ChatBubble.tsx` (show "Suggested Appointment" card).
- [ ] **Update `MoreScreen.tsx`**:
    - [ ] Add "Запросы" (Inquiries) Bento card with unread count badge.
- [ ] **Routing**:
    - [ ] Add `mobile/app/inquiries/index.tsx` route.
    - [ ] Update `mobile/app/chat/[id].tsx` to handle both appointment and inquiry rooms.

## 3. Backend (Cleanup)
- [ ] Verify `MaskContacts` utility covers all sensitive patterns in chat messages.
- [ ] Ensure `PostSystemMessage` correctly triggers SSE for all participants.

## Verification Plan
- [ ] **Web Guest**: Verify "Ask a Question" creates a room and opens chat.
- [ ] **Web Staff**: Verify inquiry appears in Dashboard -> Inquiries.
- [ ] **Mobile Staff**: Verify inquiry appears in "More" -> "Inquiries".
- [ ] **Flow**: Verify staff can "Request Appointment" and guest sees the CTA button.
