---
title: track2 booking slots
updated: 2026-04-24
source_of_truth: mirror
code_pointers: []
---

# Трек 2 — Реальная логика слотов

> Монорепо `beauty-marketplace`. Go + net/http + Fx + GORM (бэкенд), React + TS + MUI (фронт).
> После задач: `go test ./...` + `npm run lint` + `npm run build` — 0 ошибок.

---

## Контекст: что сейчас сломано

**`backend/internal/service/booking.go`** — функция `nextGuestSlot`:
```go
// TODO: реальная логика слотов
// Сейчас: возвращает "завтра 10:00" как заглушку
```

Из-за этого гостевая запись с `SalonPage` всегда создаётся на «завтра 10:00» вне зависимости от расписания и загрузки мастера. Для дашборда время задаётся вручную через форму — там заглушки нет, но при создании новой записи нет пикера свободных слотов (просто `<input type="time">`).

---

## Архитектура решения

Единый endpoint `GET /api/v1/salons/:salonId/slots` (без JWT — публичный, для гостевого букинга) и его JWT-аналог `GET /api/v1/dashboard/slots` (для дашборда). Оба используют одну и ту же бизнес-логику в `service/booking.go`.

---

## Задача 2.1 — Backend: генерация реальных слотов

### Новый метод в `service/booking.go`

```go
type SlotParams struct {
    SalonID         uuid.UUID
    Date            time.Time  // только дата, время = 0
    ServiceID       *uuid.UUID // необязательно; если задан — длительность из services + оверрайд мастера
    SalonMasterID   *uuid.UUID // необязательно; если не задан — агрегировать по всем активным мастерам
}

type AvailableSlot struct {
    StartsAt      time.Time  `json:"startsAt"`
    EndsAt        time.Time  `json:"endsAt"`
    SalonMasterID uuid.UUID  `json:"salonMasterId"`
    MasterName    string     `json:"masterName"`
}

func (s *BookingService) GetAvailableSlots(ctx context.Context, p SlotParams) ([]AvailableSlot, error)
```

### Алгоритм `GetAvailableSlots`

1. **Получить `slot_duration_minutes`** салона из `salons.slot_duration_minutes` (default 30).
   - Если `serviceID` задан: взять `services.duration_minutes` или оверрайд мастера (`salon_master_services.duration_override_minutes`). Использовать как длительность вместо `slot_duration_minutes`.

2. **Получить мастеров**: если `salonMasterID` задан — один мастер; иначе — все `salon_masters` с `status = 'active'`.

3. **Для каждого мастера:**
   a. Найти `staff_working_hours` по `(salon_master_id, day_of_week = date.Weekday())`.
      - Если запись отсутствует или `is_day_off = true` → мастер недоступен в этот день, пропустить.
   b. Распарсить `opens_at`, `closes_at`, `break_starts_at`, `break_ends_at` (формат `"HH:MM"`) → `time.Time` в таймзоне салона.
   c. Сгенерировать все теоретические слоты: от `opensAt` до `closesAt - duration`, шаг = `slot_duration_minutes`.
   d. Исключить слоты, которые **пересекаются с перерывом**: если `slotStart < breakEnd AND slotEnd > breakStart`.
   e. Получить существующие записи на этот день: `SELECT * FROM appointments WHERE salon_master_id = ? AND DATE(starts_at) = ? AND status NOT IN ('cancelled_by_client','cancelled_by_salon','no_show')`.
   f. Для каждого теоретического слота проверить, нет ли пересечения с существующими записями:
      ```
      конфликт = EXISTS apt: apt.starts_at < slotEnd AND apt.ends_at > slotStart
      ```
   g. Свободные слоты → добавить в результат с `salonMasterId` и `masterName`.

4. **Отсортировать** по `startsAt`, затем по `masterName`.

5. **Если дата = сегодня**: отфильтровать слоты, которые уже прошли (slotStart < now + 30min).

### Таймзона
Все вычисления делать в таймзоне `salons.timezone` (default `"Europe/Moscow"`). Использовать `time.LoadLocation(salon.Timezone)`.

### Новые методы в `dashboard_repository.go` / `appointment_repository.go`

```go
// AppointmentRepository
GetAppointmentsByMasterAndDate(ctx, salonMasterID uuid.UUID, date time.Time) ([]Appointment, error)

// SalonRepository  
GetWorkingHoursByMaster(ctx, salonMasterID uuid.UUID, dayOfWeek int) (*WorkingHour, error)
GetSlotDuration(ctx, salonID uuid.UUID) (int, error)  // возвращает slot_duration_minutes
```

---

## Задача 2.2 — Backend: новые эндпоинты

### Публичный (без JWT)

```
GET /api/v1/salons/:salonId/slots?date=2025-10-15&serviceId=<uuid>&masterProfileId=<uuid>
```

- Доступен без авторизации.
- `masterProfileId` (опциональный) → resolve через `salon_masters.master_profile_id`.
- Возвращает:
```json
{
  "date": "2025-10-15",
  "slotDurationMinutes": 30,
  "slots": [
    {
      "startsAt": "2025-10-15T10:00:00+03:00",
      "endsAt":   "2025-10-15T10:30:00+03:00",
      "salonMasterId": "<uuid>",
      "masterName": "Анна"
    }
  ]
}
```

**Зарегистрировать в `server.go`** под `SalonController.SalonRoutes`.

### Dashboard (с JWT)

```
GET /api/v1/dashboard/slots?date=2025-10-15&serviceId=<uuid>&salonMasterId=<uuid>
```

- Требует JWT + членства в салоне.
- `salonMasterId` (опциональный, UUID) — прямой ID из `salon_masters`.
- Ответ — тот же формат.

**Зарегистрировать в `dashboard_controller.go`** под `DashboardController.DashboardRoutes`.

### Обновить `nextGuestSlot` в `booking.go`

Заменить заглушку «завтра 10:00» на вызов `GetAvailableSlots`:
```go
// Взять первый доступный слот на завтра
// Если завтра нет слотов — перебирать следующие 7 дней
// Если за 7 дней нет слотов — вернуть ошибку BookingUnavailable
```

---

## Задача 2.3 — Frontend: пикер слотов в форме создания записи (дашборд)

### Где менять

**`frontend/src/shared/api/dashboardApi.ts`** — добавить:
```ts
fetchAvailableSlots(salonId: string, params: {
  date: string;           // "YYYY-MM-DD"
  serviceId?: string;
  salonMasterId?: string;
}): Promise<SlotsResponse>

interface AvailableSlot {
  startsAt: string;
  endsAt: string;
  salonMasterId: string;
  masterName: string;
}

interface SlotsResponse {
  date: string;
  slotDurationMinutes: number;
  slots: AvailableSlot[];
}
```

**Форма создания записи в дашборде** (найти в `DashboardAppointments.tsx` или модалке) — заменить `<input type="time">` для времени начала на компонент `SlotPicker`:

**Новый компонент `frontend/src/pages/dashboard/ui/components/SlotPicker.tsx`:**

```tsx
interface SlotPickerProps {
  date: string;
  serviceId?: string;
  salonMasterId?: string;
  value?: string;          // выбранный startsAt ISO
  onChange: (slot: AvailableSlot) => void;
}
```

Визуально: горизонтальный скролл чипов (MUI `Chip` variant=outlined / filled для выбранного). Время в формате «10:00», при hover — показывать `masterName` в `Tooltip` если мастер не выбран заранее.

Состояния:
- Загрузка → скелетоны-чипы (3–5 штук).
- Нет слотов → «В этот день нет свободного времени. Выберите другую дату.»
- Ошибка → «Не удалось загрузить расписание.»

**Логика:**
- При смене `date` или `serviceId` → автоматически перезапрашивать слоты.
- При выборе слота → `onChange(slot)` → заполнить `startsAt` и `endsAt` в форме + `salonMasterId` (если слот привязан к конкретному мастеру).

---

## Задача 2.4 — Frontend: пикер слотов в гостевом букинге (SalonPage)

### Где менять

**`frontend/src/pages/salon/ui/SalonPage.tsx`** — диалог гостевой записи.

Сейчас: форма принимает имя/телефон/комментарий, время не выбирается (заглушка на бэкенде).

**Нужно добавить:**

1. Шаг «Выберите время» — отображать до полей имени/телефона.
2. Компонент `PublicSlotPicker` (использует `GET /api/v1/salons/:salonId/slots`):
   - Сначала выбор даты: горизонтальный ряд ближайших 7 дней (кнопки с числом и коротким названием дня).
   - После выбора даты → загрузить и показать слоты для выбранной услуги (если есть) и/или мастера (если выбран).
   - Слоты: чипы с временем `10:00`, под слотом — имя мастера если он не выбран заранее.
3. Выбранный слот → `startsAt` + `endsAt` + `salonMasterId` → передать в тело `POST /api/v1/salons/:id/bookings`.

**`salonApi.ts`** — добавить:
```ts
fetchPublicSlots(salonId: string, params: {
  date: string;
  serviceId?: string;
  masterProfileId?: string;
}): Promise<SlotsResponse>
```

### UI дизайн (Warm Mocha, согласованно с SalonPage)

Ряд дат: кнопки 48×56px, `border-radius: 12px`, выбранный день — акцентный фон. Слоты: `Chip` с кастомными цветами из palettе. Группировать слоты по мастеру если мастер не выбран.

---

## Задача 2.5 — Тест покрытие

**`backend/internal/service/booking_test.go`** — написать unit-тесты для `GetAvailableSlots`:

```go
TestGetAvailableSlots_BasicDay         // обычный день, 2 занятых слота → остальные свободны
TestGetAvailableSlots_DayOff           // выходной → пустой результат
TestGetAvailableSlots_BreakExclusion   // слоты пересекающиеся с перерывом → исключаются
TestGetAvailableSlots_FullyBooked      // все слоты заняты → пустой результат
TestGetAvailableSlots_TodayPast        // прошедшие слоты сегодня → не возвращаются
```

Использовать моки через интерфейсы репозитория — не базу данных.

---

## Порядок выполнения

1. **2.1** — написать `GetAvailableSlots` + юнит-тесты.
2. **2.2** — зарегистрировать эндпоинты, обновить `nextGuestSlot`.
3. **2.3** — `SlotPicker` в дашборде.
4. **2.4** — `PublicSlotPicker` на SalonPage.

Задачи 2.1 и 2.2 — бэкенд-only, не трогают фронт. Задачи 2.3 и 2.4 — фронт-only.

---

## Стоп-лист

- Не менять сигнатуру `POST /api/v1/salons/:id/bookings` — только добавить `startsAt`/`endsAt`/`salonMasterId` как опциональные поля.
- Не хранить данные расписания 2GIS — слоты генерируются только из наших `staff_working_hours`.
- `slot_duration_minutes` — единица шага слота; длительность услуги при наличии берётся из `services.duration_minutes`.
- Если `serviceId` не передан — использовать `slot_duration_minutes` как длительность.
