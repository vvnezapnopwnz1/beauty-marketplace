---
title: Чат — дорожная карта
updated: 2026-05-07
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

### Phase 1 follow-up (надо сделать перед мерджем в master)

**1. Тесты (целая отдельная сессия).** Для бэкенда: unit на `MaskContacts`, `chatService.SendMessage` (RBAC + lock rule + masking + readonly), `chatService.ListMessages`, `chatArchiver.RunOnce`, controller-тест `ChatController.PostMessage` (auth-user vs accessToken). Для фронта: RTL на `ChatWindow` (lock state + readonly + own/other разметка), MSW для RTK. Для мобайла: unit на `useChatStream` (polling-логика), компонент-тест `ChatScreen`.

**2. Code review pass.** Линтер уже подсветил замечания в `chat_service.go` (slices.Contains, unused param `room` в `broadcast`). Пройтись по всему чат-коду на YAGNI, нейминг, error handling, dedup payload-формирования, тип-хелперы.

**3. Подключение `AppointmentChatHook` в существующие callsites.** Сейчас хук создан, но не вызывается. Нужно вставить вызовы в:
   - `backend/internal/service/booking.go` — после `notifier.NotifySalonMembers(... "appointment.created" ...)` добавить `chatHook.OnAppointmentCreated(ctx, appt.ID)`
   - `backend/internal/service/dashboard_appointment.go` — рядом с `appointment.status_changed` событиями вызывать `OnAppointmentStatusChanged`/`OnAppointmentRescheduled` соответственно
   - Прокинуть `*AppointmentChatHook` через Fx в зависимые сервисы (Booking, DashboardAppointment, MasterDashboard).

**4. Frontend integration gaps.**
   - `/me` (`MePage`): встроить `ChatTrigger`+`ChatWindow` в карточку `UserAppointment` (зарегистрированный гость). Не сделано в Phase 1.
   - `currentUserId` в `AppointmentDrawer` дашборда: пробросить из auth-стора, чтобы Bubble различал own/other (сейчас все сообщения отображаются как «не свои»).
   - i18n: ru/en ключи `chat.*` (placeholder, lockHint, readonly, title) — сейчас строки захардкожены.
   - Unread counter в `ChatTrigger` — добавить query/derive из `listMessages` + `markRoomRead` баланса.

**5. Mobile integration gaps.**
   - Открытие `ChatScreen` из `AppointmentQuickActionsSheet` (или из карточки записи) — добавить кнопку «Чат» с навигацией.
   - Обработка push с `data.type === 'chat.message'` в `mobile/app/_layout.tsx` или в notification handler — глубокий линк на конкретную комнату.
   - Заменить polling-хук на нативный `EventSource` (например `react-native-sse`) при первой возможности.

**6. SSE-аутентификация для standalone guest-страницы.** Сейчас `useChatStream` подключается к `/api/v1/notifications/stream`, который требует JWT. Анонимный гость не получает live-обновления — только при ре-fetch через polling/refetch. Решение: либо отдельный SSE-эндпоинт `/api/v1/chat/rooms/:roomId/stream?accessToken=...`, либо короткоживущий guest-JWT при `getRoomByToken`.

**7. Conflated commit.** Коммит `c2c7460` (mobile chat) случайно включил pre-existing user changes в `mobile/src/api/endpoints.ts` (~41 удалений в diff'е). При желании — переделать через `git rebase -i` + разделить хунки. Не блокер.

**8. Smoke-тесты вручную.** Прогнать сценарии из секции Final verification плана: гость через access_token, мастер через дашборд, маскировка, переход в readonly через 24ч.

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

## Зависимости Phase 2 от Phase 1

- Таблица `chat_rooms` уже поддерживает `type` (`external`|`internal`|`inquiry`) и `appointment_id`/`salon_id` nullable — миграция в Phase 1 закладывает схему под все три кейса
- SSE event `chat.message` универсален — переиспользуется без изменений
- Маскировка контактов и RBAC-резолвер участников переиспользуются
