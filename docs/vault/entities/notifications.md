---
title: Notifications (in-app) — seen/read
updated: 2026-04-30
source_of_truth: true
code_pointers:
  - backend/internal/controller/notification_controller.go
  - backend/internal/service/notification_service.go
  - backend/internal/infrastructure/persistence/notification_repository.go
  - frontend/src/entities/notification/model/notificationApi.ts
  - frontend/src/app/NotificationsProvider.tsx
  - frontend/src/widgets/NotificationsPopover/lib/handleIncomingNotification.tsx
---

# Notifications (in-app)

## Семантика состояний

- `unseen`: `seen_at IS NULL` — уведомление еще не было отмечено как показанное в интерфейсе.
- `seen_unread`: `seen_at IS NOT NULL AND is_read = FALSE` — пользователь уже видел уведомление, но не обработал его явно.
- `read`: `is_read = TRUE` (+ `read_at`) — уведомление обработано.

Инвариант: при переводе в `read` бэкенд заполняет `seen_at`, если оно было пустым.

## Триггеры статусов

- `POST /api/v1/notifications/{id}/seen` — точечно отметить `seen`.
- `POST /api/v1/notifications/seen-all` — массово отметить `seen`.
- `POST /api/v1/notifications/{id}/read` — отметить `read` (и неявно `seen`).
- `POST /api/v1/notifications/read-all` — массово отметить `read` (и неявно `seen`).

## Клиентская логика (MVP)

- Глобальный `NotificationsProvider` (`frontend/src/app/NotificationsProvider.tsx`) подписывает приложение на SSE и отвечает за snackbar входящих уведомлений на уровне всего SPA.
- Бейдж колокольчика использует `unseen`.
- `NotificationMenuPopover` отвечает за список/бейдж и seen/read-действия внутри popover, но не запускает snackbar-обработчик входящих событий.
- При получении SSE и показе snackbar клиент отправляет `markSeen`.
- При успешном доменном CTA из уведомления (например, подтверждение записи) клиент отправляет `markRead`.
- Простое закрытие snackbar без доменного действия не переводит уведомление в `read`.

## Счетчики

`GET /api/v1/notifications/unread-count` возвращает:

- `unread`: количество `is_read = FALSE`
- `unseen`: количество `seen_at IS NULL`

