# Спек: Редактируемая сумма визита (`total_cents`) в Appointment

> Промпт-план для ИИ-агента. Монорепо `beauty-marketplace`.  
> После реализации: `go test ./...`, `npm run lint`, `npm run build`.

---

## 1. Цель продукта

Сумма визита (поле «Итого») — **свободное для ручного ввода**, но **предзаполняемое** из суммы каталожных цен выбранных услуг. Это покрывает сценарии, когда фактическая оплата отличается от прайс-листа: сложное окрашивание дороже базовой цены, скидка постоянному клиенту, допродажа на месте, округление.

Существующие `appointment_line_items` с `price_cents` (snapshot каталога) **не меняются** — они остаются аудит-логом «что было в каталоге на момент записи». Новое поле `total_cents` на уровне `appointments` — это «сколько фактически стоит визит».

---

## 2. Схема БД

### 2.1 Новые колонки в `appointments`

```sql
ALTER TABLE appointments
  ADD COLUMN total_cents       INT          NULL,
  ADD COLUMN total_source      VARCHAR(20)  NOT NULL DEFAULT 'calculated';
-- total_source: 'calculated' | 'manual'
```

- `total_cents` — итоговая сумма визита в копейках. NULL для старых записей (backward-compatible).
- `total_source` — источник значения: `'calculated'` = автоматически из SUM(line_items), `'manual'` = мастер/владелец ввёл вручную.

### 2.2 Миграция

Определи следующий номер миграции в `backend/migrations/` (посмотри последний файл). Создай пару `up.sql` / `down.sql`. `down.sql` — `ALTER TABLE appointments DROP COLUMN total_cents, DROP COLUMN total_source;`.

### 2.3 Бэкфилл (в той же up-миграции)

```sql
UPDATE appointments a
SET total_cents = sub.total
FROM (
  SELECT appointment_id, SUM(price_cents) AS total
  FROM appointment_line_items
  GROUP BY appointment_id
) sub
WHERE a.id = sub.appointment_id
  AND a.total_cents IS NULL;
```

Для записей без line_items (старые, одноуслуговые) — отдельный UPDATE с JOIN на `services.price_cents` или `salon_master_services.price_override_cents` через `appointments.service_id`. Если ни того ни другого нет — оставить NULL.

### 2.4 GORM-модель

Добавь в `Appointment` struct (`backend/internal/infrastructure/persistence/model/models.go`):

```go
TotalCents  *int   `gorm:"column:total_cents"  json:"totalCents,omitempty"`
TotalSource string `gorm:"column:total_source;default:calculated" json:"totalSource"`
```

---

## 3. Backend: бизнес-логика

### 3.1 При создании записи (гостевой и из дашборда)

Найди место, где создаётся `appointments` и `appointment_line_items` (файлы: `booking.go` для гостевого, `dashboard_appointment.go` для дашборда).

**Логика:**
1. Посчитай `SUM(price_cents)` по всем line items (snapshot-цены, уже вычисленные).
2. Запиши результат в `total_cents`.
3. Установи `total_source = 'calculated'`.

### 3.2 При ручном обновлении суммы (из дашборда)

В `PUT /api/v1/dashboard/appointments/{id}` (файл: `dashboard_appointment.go`):

- Если в теле запроса передан `totalCents` (число) — записать его и установить `total_source = 'manual'`.
- Если `totalCents` не передан — не трогать (оставить предыдущее значение).
- **Валидация:** `totalCents >= 0`. Нулевая сумма допустима (бесплатный визит). Отрицательная — ошибка 400.

### 3.3 При редактировании набора услуг (если изменился состав line_items)

Если при PUT-обновлении записи меняется набор услуг — пересчитать `total_cents` из новых line_items **только если** `total_source == 'calculated'`. Если `total_source == 'manual'` — **не пересчитывать** (мастер явно установил свою цену).

### 3.4 DTO ответа

Во все DTO записи (dashboard, master-dashboard, публичный) добавь поля:
- `totalCents *int` — итого визита
- `totalSource string` — `"calculated"` или `"manual"`
- `calculatedTotalCents int` — для UI: всегда = SUM(line_items), даже если total_source == manual. Нужно для отображения «расхождение с каталогом».

---

## 4. Backend: влияние на финансовый трекер мастера

Файл: `backend/internal/repository/master_finances_repository.go`, функция `computeIncomeCents`.

**Текущее поведение:** доход считается через JOIN на `services.price_cents` / `salon_master_services.price_override_cents` — каталожные цены, не snapshot.

**Новое поведение:** для записей с `total_cents IS NOT NULL` использовать `appointments.total_cents`. Для старых записей (NULL) — fallback на текущую логику.

```sql
-- Упрощённо:
SELECT COALESCE(SUM(
  COALESCE(a.total_cents, COALESCE(sms.price_override_cents, s.price_cents))
), 0)
FROM appointments a ...
```

Аналогично для `GetIncomeTrend` и `GetTopServicesByRevenue` (если используют аналогичные JOIN-ы).

**Для dashboard stats** (`dashboard_stats.go`): если там считается выручка — тоже перейти на `total_cents`.

---

## 5. Frontend: дашборд салона

### 5.1 Drawer/форма записи (`CreateAppointmentDrawer.tsx`, `AppointmentDrawer.tsx`)

**При создании:**
- После выбора услуг показать поле «Итого» — `TextField type="number"`, предзаполненное суммой выбранных услуг.
- Пользователь может изменить значение.
- Если значение отличается от рассчитанного — при POST передать `totalCents` с `totalSource: 'manual'`.

**При просмотре/редактировании:**
- Показать текущее `totalCents` в редактируемом поле.
- Если `totalSource === 'manual'` — показать мелкий индикатор (например, иконку ✏️ или подпись «изменено вручную»).
- Опционально: под полем мелким шрифтом «По прайсу: X ₽» (`calculatedTotalCents`), если отличается.

### 5.2 Таблица записей (`DashboardAppointments`)

- Колонка «Итого» — показывать `totalCents` (форматировать в рубли).
- Если `totalSource === 'manual'` — мелкая иконка рядом с числом.

### 5.3 Календарь

- В блоке записи на календаре (`AppointmentBlock`) — если там уже отображается цена, заменить на `totalCents`.

### 5.4 RTK Query / API slice

Добавить `totalCents`, `totalSource`, `calculatedTotalCents` в типы `DashboardAppointment` (или аналогичный интерфейс).

---

## 6. Frontend: кабинет мастера

Аналогично дашборду салона: в списке записей мастера показывать `totalCents`. В финансовом трекере доход уже будет корректным (через бэкенд).

---

## 7. Что НЕ входит

- ❌ Отдельное поле «Скидка» или «Чаевые» — отложено
- ❌ Автоматический перерасчёт `total_cents` при изменении каталожных цен — не нужно, snapshot фиксирует цену на момент записи
- ❌ Изменение `total_cents` из гостевого флоу — только из дашборда
- ❌ История изменений `total_cents` (audit log) — отложено

---

## 8. Порядок работ

1. Миграция БД (up + down + бэкфилл)
2. GORM-модель — добавить поля
3. Бэкенд: booking.go — заполнять total_cents при создании гостевой записи
4. Бэкенд: dashboard_appointment.go — заполнять при создании из дашборда; принимать при PUT
5. Бэкенд: DTO ответов — добавить три поля
6. Бэкенд: computeIncomeCents — использовать total_cents
7. Фронт: drawer создания/редактирования — поле «Итого»
8. Фронт: таблица записей и календарь — отображение
9. Обновить `db-schema.md`, `status.md`

---

## 9. Проверки

```bash
cd backend && go build ./... && go test ./... -v -count=1
cd frontend && npm run lint && npm run build
```

QA-чеклист:
1. Создать гостевую запись на 2 услуги → `total_cents` = сумма line_items, `total_source` = `'calculated'`
2. Открыть запись в дашборде → поле «Итого» предзаполнено
3. Изменить сумму вручную на бо́льшую → сохранить → `total_source` = `'manual'`
4. Добавить услугу к записи → `total_cents` **не пересчитался** (manual)
5. Создать новую запись из дашборда, не менять сумму → `total_source` = `'calculated'`
6. Проверить финансовый трекер мастера: доход = `total_cents` из completed-записей
7. Старые записи (без total_cents) — доход считается по fallback-логике, не ломается
