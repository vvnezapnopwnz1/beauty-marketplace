---
title: track4 dashboard features
updated: 2026-04-24
source_of_truth: mirror
code_pointers: []
---

# Трек 4 — Дашборд: следующие фичи

> Монорепо `beauty-marketplace`. React + TS + Vite + MUI + Redux Toolkit (фронт), Go + net/http + Fx + GORM + PostgreSQL (бэкенд).
> Тема дашборда: `frontend/src/shared/theme/dashboardPalette.ts` + `useDashboardPalette()`.
> Все цвета берутся оттуда же, не из мокапа напрямую.
> После каждой задачи: `go test ./...` + `npm run lint` + `npm run build` — 0 ошибок.

---

## Контекст: что уже есть в календаре

- Таймлайн День/Неделя: события абсолютно позиционируются по `startsAt`/`endsAt`.
- `CALENDAR_HOUR_HEIGHT_PX = 48`, `CALENDAR_PX_PER_MINUTE = 0.8` — в `calendarGridUtils.ts`.
- `layoutTimelineEventsForDay` — жадный алгоритм для пересечений в колонке.
- NowLine, штриховка нерабочего времени, перерывы мастеров, аватарки, 3-строчные блоки, индикаторы загруженности в месяце, расширенная модалка деталей — всё реализовано.
- API записей: `GET /api/v1/dashboard/appointments`, `POST`, `PUT /:id`, `PATCH /:id/status`.
- Клик по пустому месту → модалка создания с предзаполненным временем и мастером.
- `AppointmentDrawer.tsx` — правый drawer для деталей записи (из списка и карточки мастера).

---

## Задача 4.1 — Drag-drop перенос записей в календаре

### Что нужно
В режимах «День» и «Неделя» пользователь должен мочь перетащить блок записи:
- на другой временной слот у того же мастера,
- на того же слота к другому мастеру (только в режиме «День»).

После drop — вызов `PUT /api/v1/dashboard/appointments/:id` с новыми `startsAt`, `endsAt`, `salonMasterId`.

### Библиотека
Целевой слой интеграции — **`@dnd-kit/react`** ([React Quickstart](https://dndkit.com/react/quickstart/)): `DragDropProvider`, хуки `useDraggable` / `useDroppable`, при необходимости `DragOverlay`. Официальный пример: в `onDragEnd` проверять `event.canceled`, затем читать `event.operation.source` / `event.operation.target` (в т.ч. `target?.id`) и `event.operation.transform` для смещения по вертикали.

В репозитории уже объявлены `@dnd-kit/react`, `@dnd-kit/core` и `@dnd-kit/modifiers` в `frontend/package.json`. Для календаря опираться на **`@dnd-kit/react`**; `@dnd-kit/core` / `@dnd-kit/modifiers` подключать только если нужны модификаторы (например ограничение оси) и это подтверждено типами установленной версии — не смешивать старый паттерн `DndContext` + компоненты `Draggable`/`Droppable` из core v6 с новым провайдером.

**Не использовать** `react-beautiful-dnd` (не подходит под абсолютное позиционирование таймлайна).

### Backend — изменений нет
`PUT /api/v1/dashboard/appointments/:id` уже принимает `startsAt`, `endsAt`, `salonMasterId`. Агенту нужно только убедиться, что поля `startsAt`/`endsAt` правильно обновляются при передаче.

### Frontend

**Файл:** [`frontend/src/pages/dashboard/lib/dndCalendarUtils.ts`](frontend/src/pages/dashboard/lib/dndCalendarUtils.ts) — чистая математика и строковые id **без** привязки к DnD-пакету:
```ts
// pixelDeltaToMinutes, roundToSlot, clamp в окне сетки / рабочих часов
// префиксы id: draggable дня `appt:<uuid>`, недели (уникально на ячейку) `appt:<uuid>:cell:<YYYY-MM-DD>`, droppable недели `week:<YYYY-MM-DD>`, колонки дня `staff:<columnId>:<YYYY-MM-DD>`
```

**`CalendarDayStaffGrid.tsx`:**
- Обернуть область сетки (там, где и колонки, и блоки) в `<DragDropProvider onDragEnd={…} onDragOver={…}>` из `@dnd-kit/react`.
- Каждый переносимый `TimelineEventBlock` — обёртка с `useDraggable({ id: 'appt:…', data: { columnId, … } })`, колбэк-**`ref`** на корневой DOM (см. [quickstart](https://dndkit.com/react/quickstart/)); `handleRef` при необходимости для отдельной зоны захвата.
- Каждая колонка мастера — `useDroppable({ id: 'staff:<columnId>:<ymd>' })`, **`ref`** на контейнер колонки (тот же `Box`, что ловит клик по пустому месту).
- Подсветка колонки при наведении: по `onDragOver` / сброс в `onDragEnd` (полупрозрачный фон акцентного цвета).
- В `onDragEnd`: если `event.canceled` — выйти; иначе из `event.operation` взять `source`/`target`/`transform`, пересчитать `startsAt`/`endsAt`/`salonMasterId` (или `clearSalonMasterId` для «Без мастера») → `updateDashboardAppointment` / обёртка из родителя.
- Превью: либо снижение opacity у источника / пунктир, либо `DragOverlay` с рендером блока (предпочтительно, если дефолтный feedback ломает вёрстку колонок).
- Ошибка API: данные уже на сервере — повторная загрузка списка; пользователю — сообщение об ошибке (например существующий `Alert` / текст, без обязательного `toast`).

**`CalendarWeekGrid.tsx`:**
- Тот же `DragDropProvider` + `useDraggable` / `useDroppable`.
- Droppable id: `week:<YYYY-MM-DD>` на колонку дня; в `data` у draggable передавать день колонки, чтобы при переносе на другой день пересчитать дату старта.
- Смены мастера нет — в `PUT` уходят только новые `startsAt`/`endsAt` (длительность сохраняется).

**Ограничения:**
- Нельзя перетаскивать записи со статусом `completed` или `cancelled_*`.
- Нельзя перетаскивать за пределы рабочего окна мастера (кламп по расписанию колонки / сетке).
- Минимальный шаг и кратность переноса по времени — `slot_duration_minutes` салона (плюс кламп по видимой сетке 08:00–22:00).

### Карта «старый план (core v6) → `@dnd-kit/react`»

| Раньше в плане | Сейчас |
|----------------|--------|
| `DndContext` | `DragDropProvider` |
| Обёртки `Draggable` / `Droppable` из `@dnd-kit/core` | `useDraggable` / `useDroppable` + `ref` на свой `Box` |
| `onDragEnd` с `active` / `over` / `delta` | `onDragEnd`: `event.canceled`, `event.operation.source` / `target` / `transform` ([quickstart](https://dndkit.com/react/quickstart/)) |

### Визуал drag-ghost
```ts
// При активном drag: полупрозрачный блок той же высоты и ширины
// border: 2px dashed <accentColor>
// background: alpha(<masterColor>, 0.3)
// pointer-events: none
// z-index: 1000
// Либо вынести в <DragOverlay>{(source) => …}</DragOverlay>
```

---

## Задача 4.2 — Resize длительности записи

### Что нужно
В нижней части каждого блока события (последние 8px) — drag-handle. Пользователь тянет вниз → длительность увеличивается, вверх → уменьшается. При отпускании → `PUT /appointments/:id` с новым `endsAt`.

### Frontend

**`calendarGridUtils.ts`** — добавить:
```ts
// function snapEndsAt(newEndsAt: Date, slotDurationMinutes: number): Date
// снаппинг к ближайшему кратному слоту
```

**`CalendarDayStaffGrid.tsx`** — в `TimelineEventBlock`:
- Добавить внизу блока `<Box sx={{ position: 'absolute', bottom: 0, height: 8, cursor: 'ns-resize', width: '100%' }}>`
- `onMouseDown` → начать `resizeState = { aptId, originalEndsAt }`.
- `onMouseMove` (на window) → вычислять delta Y → новый `endsAt` со снаппингом → обновлять высоту блока inline (без API, только visual preview).
- `onMouseUp` → если `endsAt` изменился → `PUT /appointments/:id` с новым `endsAt`. Если ошибка → откат.

**Ограничения:**
- Минимальная длительность = `slot_duration_minutes`.
- Нельзя resize записей `completed` / `cancelled_*`.

---

## Задача 4.3 — Конфликты слотов

### Что нужно
Детектить и визуально выделять **задвоенные** записи у одного мастера (два события, которые пересекаются по времени). Это ≠ overlap layout (тот уже есть) — это именно предупреждение о конфликте.

### Backend

**`dashboard_repository.go`** — при `CreateAppointment` и `UpdateAppointment`:
```go
// SELECT COUNT(*) FROM appointments
// WHERE salon_master_id = ?
// AND id != ?  (исключить текущую)
// AND status NOT IN ('cancelled_by_client','cancelled_by_salon','no_show')
// AND starts_at < ? AND ends_at > ?  (пересечение)
```
Если > 0 — не блокировать (салон сам решает), но добавить в ответ поле `"conflict": true`.

**Ответ `PUT/POST /appointments`:**
```json
{
  "appointment": { ... },
  "conflict": true,
  "conflictWith": [{ "id": "...", "startsAt": "...", "clientLabel": "..." }]
}
```

### Frontend

**`DashboardCalendar.tsx`** — при `PUT/POST` если `conflict: true` → показать `Snackbar` с предупреждением: «⚠ Запись пересекается с [Имя клиента] в [09:00–10:00]. Сохранено».

**`CalendarDayStaffGrid.tsx`** — если у события есть флаг `hasConflict: true` (добавить в `DashboardAppointment`):
```ts
// border-left: 3px solid mocha.red
// В левом верхнем углу блока: иконка ⚠ (16px, цвет mocha.red)
```

**`dashboardApi.ts`** — после `updateAppointment`/`createAppointment`: если `data.conflict` → диспатчить action `setConflicts(data.conflictWith)`.

---

## Задача 4.4 — Zoom / масштаб таймлайна

### Что нужно
Слайдер или три кнопки в тулбаре календаря: **Компактно / Стандарт / Детально** — меняют вертикальный масштаб таймлайна.

### Frontend

**`calendarGridUtils.ts`** — вынести `CALENDAR_HOUR_HEIGHT_PX` и `CALENDAR_PX_PER_MINUTE` из константы в CSS-переменную или передавать через context:
```ts
export type CalendarZoom = 'compact' | 'normal' | 'detailed'
export const ZOOM_CONFIG: Record<CalendarZoom, { hourHeightPx: number; pxPerMinute: number }> = {
  compact:  { hourHeightPx: 32, pxPerMinute: 32/60 },
  normal:   { hourHeightPx: 48, pxPerMinute: 0.8 },
  detailed: { hourHeightPx: 72, pxPerMinute: 72/60 },
}
```

**`DashboardCalendar.tsx`** — добавить `zoom` в локальный state (default `'normal'`). Передавать `zoomConfig` во все три грида. Кнопки переключения рядом с переключателем День/Неделя/Месяц — иконки `ViewCompact`, `ViewAgenda`, `ViewStream`.

**`CalendarDayStaffGrid.tsx`, `CalendarWeekGrid.tsx`** — принимать `hourHeightPx` и `pxPerMinute` как props вместо константы.

**Persist:** сохранять выбранный zoom в `localStorage` под ключом `dashboard_calendar_zoom`.

---

## Задача 4.5 — Кастомные категории услуг на салон

### Что нужно
Сейчас `service_categories` содержит 72 системные строки (`salon_id IS NULL`). Нужно дать возможность салону создавать свои дополнительные категории (`salon_id IS NOT NULL`).

### Backend

**`dashboard_controller.go`** — добавить:
```
POST   /api/v1/dashboard/service-categories        → создать кастомную категорию
DELETE /api/v1/dashboard/service-categories/:slug  → удалить (только если salon_id = текущий)
```

Тело POST:
```json
{ "slug": "my-custom-slug", "name_ru": "Мой тип", "parent_slug": "hair" }
```

Валидация: `slug` должен быть уникальным среди `(salon_id = текущий OR salon_id IS NULL)`. `parent_slug` должен существовать в системных категориях.

**`dashboard_repository.go`:**
```go
// CreateServiceCategory(salonID uuid.UUID, slug, nameRu, parentSlug string) error
// DeleteServiceCategory(salonID uuid.UUID, slug string) error
```

**`GET /api/v1/dashboard/service-categories`** (уже есть) — расширить: возвращать и системные, и кастомные текущего салона. Кастомные помечать полем `"custom": true`.

### Frontend

**`ServiceFormModal.tsx`** — в выпадающем списке категорий:
- В конце списка добавить пункт **«+ Создать категорию»**.
- При клике → инлайн input или мини-диалог: поле «Название» + выбор родительской группы.
- После создания → перезапросить список категорий → автоматически выбрать новую.

**`ServicesView.tsx`** — при отображении услуги с кастомной категорией показывать бейдж «Своя».

---

## Задача 4.6 — Telegram-уведомления о записях

### Что нужно
При изменении статуса записи (`confirmed`, `cancelled_*`) отправлять уведомление:
- Владельцу/администратору салона — при новой записи от клиента.
- Клиенту (если авторизован и привязан Telegram) — при подтверждении и отмене.

### Backend

Таблица `user_telegram_identities` уже есть в схеме (`user_id`, `telegram_user_id`, `telegram_username`, `chat_id`). Нужно:

1. **`infrastructure/telegram/bot.go`** — новый файл:
```go
type TelegramNotifier interface {
    SendMessage(chatID int64, text string) error
}
type telegramBot struct { token string; httpClient *http.Client }
// POST https://api.telegram.org/bot<token>/sendMessage
```

2. **`service/notification.go`** — новый файл:
```go
type NotificationService interface {
    NotifyNewAppointment(ctx, apt Appointment) error
    NotifyStatusChange(ctx, apt Appointment, oldStatus, newStatus string) error
}
```

3. **`service/dashboard.go`** — в `UpdateAppointmentStatus`:
- Если `newStatus = confirmed` → `NotifyStatusChange` (клиенту: «Ваша запись подтверждена»).
- Если `newStatus = cancelled_by_salon` → уведомить клиента.

4. **`service/appointment.go`** — при `CreateAppointment` → `NotifyNewAppointment` (владельцу салона).

5. **Env:** добавить `TELEGRAM_BOT_TOKEN` в `config.go`.

6. **Текст уведомлений** (на русском):
```
Новая запись: [Имя клиента], [Услуга], [Дата и время]
Запись подтверждена: [Услуга] в [Название салона] — [Дата и время]
Ваша запись отменена: [Услуга] в [Название салона] — [Дата и время]
```

7. **Graceful failure:** ошибка отправки уведомления не должна откатывать транзакцию записи. Логировать через `logger.Warn`.

### Frontend — MVP

Добавить в страницу настроек профиля (`/dashboard?section=profile`) блок «Telegram-уведомления»:
- Кнопка «Подключить Telegram» → ссылка вида `https://t.me/<BotUsername>?start=<token>`.
- После подключения: статус «✓ Уведомления активны», кнопка «Отключить».
- API: `POST /api/v1/user/telegram/connect` (принимает `{ token }` — одноразовый токен от бота), `DELETE /api/v1/user/telegram/disconnect`.

---

## Приоритет и порядок выполнения

| # | Задача | Сложность | Ценность | Идти первым |
|---|--------|-----------|----------|-------------|
| 4.4 | Zoom таймлайна | Низкая | Средняя | ✅ Начать — быстрая победа |
| 4.3 | Конфликты слотов | Средняя | Высокая | ✅ Второй |
| 4.5 | Кастомные категории | Средняя | Средняя | Третий |
| 4.1 | Drag-drop | Высокая | Очень высокая | Четвёртый |
| 4.2 | Resize длительности | Средняя | Средняя | Пятый |
| 4.6 | Telegram уведомления | Средняя | Высокая | Шестой (зависит от продакшн-деплоя) |

**Задачи 4.1 и 4.2 делать последовательно** — обе затрагивают взаимодействие с блоком в таймлайне: resize (4.2) остаётся на нативный `mousedown`/`mousemove` по нижнему handle; при реализации 4.2 у handle вызывать `stopPropagation()` (и при необходимости `preventDefault()`), чтобы не запускать перенос `@dnd-kit/react`.

---

## Стоп-лист (трогать нельзя)

- Алгоритм `layoutTimelineEventsForDay` — работает, не ломать.
- `CALENDAR_HOUR_START = 8`, `CALENDAR_HOUR_END = 22` — не менять без явной задачи.
- Существующий `AppointmentDrawer` и `AppointmentDetailModal` — не дублировать, только расширять.
- Существующие экспорты из `calendarGridUtils.ts` — только добавлять, не переименовывать.
- `PUT /api/v1/dashboard/appointments/:id` — не менять сигнатуру, только расширять тело ответа.
