---
title: Чат — дорожная карта
updated: 2026-05-07-followup
source_of_truth: true
---

# Чат — дорожная карта

## Phase 1 — External chat (готова первая итерация)

Чат «Гость ↔ Мастер + Управленцы», привязанный к `appointment_id`.
План: [`docs/superpowers/plans/2026-05-07-chat-phase1-external.md`](../../superpowers/plans/2026-05-07-chat-phase1-external.md).
Ветка: `feat/chat-phase1-external` (3 коммита: backend / frontend / mobile).

### Закрыто в Phase 1
- БД: `chat_rooms`, `chat_messages`, `chat_message_reads` (миграция `000034`).
- Backend: ChatService с RBAC от участников записи, правило «первого шага», маскировка контактов на storage-level, архиватор 24ч после `completed`, системные сообщения через `AppointmentChatHook` (готов к подключению из callsites). SSE-доставка через `NotificationService.PublishEvent` + событие `chat.message`.
- Frontend: `entities/chat` (RTK Query + `useChatStream`), `features/chat-window` (Bubble/Composer/Window/Trigger), стандалон-страница `/chat/:accessToken`, embed-аккордеон в `AppointmentDrawer` дашборда салона.
- Mobile: `src/api/chat.ts`, polling-хук `src/lib/chat/useChatStream.ts`, `ChatScreen` + `ChatBubble`.

### Phase 1 follow-up (закрыто 2026-05-07)

Ветка: `chore/chat-phase1-followup` поверх master. План:
[`docs/superpowers/plans/2026-05-07-chat-phase1-followup.md`](../../superpowers/plans/2026-05-07-chat-phase1-followup.md).

#### Что закрыто

- **Спасены in-progress фиксы из рабочей копии** (4 коммита):
  - `chat_service.go` — `EnsureRoomForAppointment` теперь явно ставит `ID` и `AccessToken` через `uuid.New()`. Без этого GORM вставлял nil UUID (DB-defaults через `RETURNING` не подхватывались).
  - `chat_repository.go` — убран бутафорский фильтр `salon_members.status = 'active'` (такой колонки нет, см. `migrations/000001`); добавлена роль `admin` к списку (enum: `owner`, `admin`, `receptionist`). Без этого фикса участники-управленцы никогда не получали SSE-уведомления.
  - Эндпоинт переименован `/chat/rooms/by-token/{token}` → `/chat/external/rooms/{token}` синхронно в backend, frontend и mobile.
  - `AppointmentDrawer` показывает чат и в режиме редактирования.
  - Frontend `useChatStream` переключён с native `EventSource` (не шлёт Bearer) на fetch+ReadableStream через `authFetch`.
- **#3 — `AppointmentChatHook` подключён в callsites:** `BookingService.CreateGuestBooking` → `OnAppointmentCreated`; `DashboardService.UpdateAppointmentStatus` → `OnAppointmentStatusChanged`; `DashboardService.UpdateAppointment` (когда `StartsAt` действительно меняется) → новый event `appointment.rescheduled` + `OnAppointmentRescheduled`. Хук инжектится через Fx в обе службы.
- **#6 — SSE для гостя:** добавлен endpoint `GET /api/v1/chat/external/rooms/{token}/stream` с per-room subscriber registry в `ChatBroadcaster` (BroadcastToRoom + SubscribeRoom). `chat_service.broadcast` шлёт payload и в существующий per-user `notifications/stream`, и в новый per-room канал. Frontend `useChatStream` для гостя ходит на новый URL plain `fetch`'ом без auth-фетча. Решение: токен комнаты как credential (не короткоживущий JWT).
- **#4 — Frontend integration:**
  - i18n-ключи `chat.*` добавлены в `ru.json`/`en.json`; `ChatWindow`, `ChatTrigger`, `AppointmentChatSection`, `GuestChatPage` подключены к `useTranslation`.
  - `AppointmentDrawer` пробрасывает `currentUserId` из auth-слайса в `AppointmentChatSection` → `ChatWindow` → `ChatBubble`. Own/other теперь различается.
  - **MePage:** в `entities/user-appointment/AppointmentCard` встроен collapsible-чат (Accordion) для записей в статусах pending/confirmed/completed. Кэнсельнутые/no-show — без чата.
- **#5 — Mobile integration:** новый route `mobile/app/chat/[appointmentId].tsx` мountит `ChatScreen`; `AppointmentQuickActionsSheet` получил кнопку «Чат» с навигацией; `_layout.tsx` регистрирует `Notifications.addNotificationResponseReceivedListener` для deep-link на push с `data.type === 'chat.message'`. Backend payload chat-сообщения теперь включает `type` и `appointmentId`, чтобы push-tap имел контекст.

#### Что отложено сознательно

- **#1 (тесты).** Не делали в этой сессии — frontend и mobile не имеют тестового рантайма (vitest/jest/RTL/MSW), это отдельный сетап. Backend chat-тесты тоже не написаны. Тесты — отдельная сессия после стабилизации Phase 2.
- **#2 (lint polish).** `slices.Contains` в `assertCanRead`/`collectParticipants`, dedup payload-marshal, и неиспользуемый `room` в `broadcast` — отмечены инструментами, но не реализованы. (Сейчас `room` используется для enrichment payload — больше не unused.)
- **Unread counter в `ChatTrigger`.** `ChatTrigger` пока нигде не смонтирован (dead code) — счётчик не имеет видимого эффекта. Нужен либо backend extension `unreadCount` в `getRoomForAppointment`, либо клиентская approxima­ция. Перенесено в Phase 2C.
- **`react-native-sse` для нативного EventSource.** Mobile продолжает использовать polling fallback. Замена → Phase 2C.

#### Notes

- **#7 (conflated commit `c2c7460`)** — ложная тревога. Diff показал, что 41 «удаление» — это refactor `mobile/src/api/endpoints.ts` от хардкода `localhost:8080` к LAN-host detection через Expo Metro (`resolveApiOrigin`, `replaceLoopbackWithMetroHost`). Фикс корректный, переписывать историю не надо.
- **#8 (smoke-тесты)** — отложено до интеграционного прохода. Сценарии остаются в плане 2026-05-07-chat-phase1-followup, секция Phase 10.4.

## Phase 2 — отложено (НЕ ЗАБЫТЬ)

### 2A. «Задать вопрос» (pre-booking inquiry)

Чат без привязки к записи, инициируется со страницы профиля мастера/салона кнопкой «Задать вопрос» рядом с «Записаться».
Особенности:
- Сообщение сначала падает администратору (Owner/Receptionist), затем мастеру по эскалации
- Фото-чат: возможность приложить фото при первом сообщении
- Quick replies: шаблоны ответов мастера/салона
- «Сформировать запись» — кнопка трансформации диалога в `appointment` (системное сообщение клиенту с подтверждением)
- Анти-увод: дисклеймер про оплату через платформу + флаг подозрительной активности (3+ сообщения без записи)

### 2B. Internal chat (Мастер ↔ Управленцы)

Чат внутри салона, привязан к `salon_id`:
- Общий канал салона (объявления)
- Личные диалоги owner/receptionist ↔ мастер
- Триггерные системные сообщения (например, перенос записи через DnD)

### 2C. Дополнительные функции к Phase 1

- Авто-ответы мастера (быстрый шаблон при занятости)
- Эскалация на админа, если мастер не ответил за N минут
- Owner-only режим супервизии (выделенный экран чтения всех чатов салона)
- **Unread counter в `ChatTrigger`.** Перенесено из Phase 1 follow-up — нужен backend `unreadCount` (left-join `chat_message_reads` minus own messages) либо клиентская approxima­ция через localStorage last-seen-id. Сам `ChatTrigger` пока не смонтирован.
- **`react-native-sse`** — заменить mobile polling-хук на нативный `EventSource`.
- **Тестовая инфраструктура.** Vitest+RTL+MSW для frontend и jest-expo+RNTL для mobile. Без этого нельзя писать chat-tests (а заодно и любые другие).
- **Backend chat-тесты:** `MaskContacts`, `chatService.SendMessage` (RBAC + lock + masking + readonly), `ListMessages`, `chatArchiver.RunOnce`, `ChatController.PostMessage` + `StreamGuest`.
- **Lint polish для `chat_service.go`:** `slices.Contains` в трёх местах, dedup payload-marshalling.

## Зависимости Phase 2 от Phase 1

- Таблица `chat_rooms` уже поддерживает `type` (`external`|`internal`|`inquiry`) и `appointment_id`/`salon_id` nullable — миграция в Phase 1 закладывает схему под все три кейса
- SSE event `chat.message` универсален — переиспользуется без изменений
- Маскировка контактов и RBAC-резолвер участников переиспользуются
