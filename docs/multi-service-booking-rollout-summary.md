# Сводка: мульти-услуга в гостевой записи, `appointment_line_items`, дашборд

> Единый документ по сделанной работе (ветка функционала: гостевая запись с несколькими услугами, снимки в БД, отображение и фильтры в кабинете салона и у мастера).  
> Связанные планы: [`docs/plans/multi-service-guest-booking.md`](plans/multi-service-guest-booking.md), [`.cursor/plans/multi-service_guest_booking_b1bf7af7.plan.md`](../.cursor/plans/multi-service_guest_booking_b1bf7af7.plan.md), [`.cursor/plans/dashboard_multi-service_labels_a275cf04.plan.md`](../.cursor/plans/dashboard_multi-service_labels_a275cf04.plan.md).

---

## 1. Зачем и что изменилось для пользователя

- **Гость на странице салона** может выбрать **несколько услуг**, затем мастера, который оказывает **все** выбранные услуги в этом салоне (данные из `GET /api/v1/salons/:id/masters` и связей `salon_master_services`), затем **один** слот длительностью **суммы** услуг с учётом оверрайдов мастера по длительности.
- **Цены** на шаге выбора услуг не акцентируются; **итог по услугам и сумма** показываются на последнем шаге **над** полями имени, телефона и комментария (см. `GuestBookingDialog`).
- **Владелец / мастер в кабинете** видит в списках записей **одну строку** на визит; подпись услуги может быть вида «Услуга A, Услуга B» (снимок имён из БД).

---

## 2. База данных

| Артефакт | Назначение |
|----------|------------|
| Миграция **`000014_appointment_line_items`** | Таблица строк визита: `appointment_id`, `service_id`, `service_name`, `duration_minutes`, `price_cents`, `sort_order`, `created_at` — **снимок** на момент записи. |
| Таблица **`appointments`** | По-прежнему одна строка на визит; поле **`service_id`** — **первая** (основная) услуга для обратной совместимости и простых отчётов. |

**Операции:** на каждом окружении нужно применить миграцию `000014` до использования гостевого мульти-бронирования; иначе вставка записи с line items завершится ошибкой.

---

## 3. Публичный API (салон)

| Метод / путь | Поведение |
|--------------|-----------|
| `GET /api/v1/salons/:id/slots` | Параметры **`serviceId`** или **`serviceIds`** (UUID через запятую, лимит на количество). При нескольких услугах длительность окна = сумма по мастеру; в выборку мастеров попадают только те, у кого есть **все** услуги (`ListSalonMastersCoveringServices`). |
| `POST /api/v1/salons/:id/bookings` | Тело: **`serviceId`** (первая услуга) и при мульти — **`serviceIds`**. Проверка покрытия услуг мастером, длина слота при явных `startsAt`/`endsAt`, создание **`appointments`** + **`appointment_line_items`** в транзакции (`CreateWithLineItems`). |

**Ценообразование на сервере:** та же логика, что и для витрины мастера в салоне — `services.price_cents` + опционально `salon_master_services.price_override_cents` (см. `booking.go` и план в `multi-service-guest-booking.md`).

---

## 4. Бэкенд (основные файлы)

- **`backend/internal/service/booking.go`** — `SlotParams.ServiceIDs`, суммарная длительность по мастеру, фильтрация мастеров по покрытию услуг; `GuestBookingInput` / `CreateGuestBooking` с line items; валидации.
- **`backend/internal/controller/salon_controller.go`** — разбор `serviceIds` в query и в JSON тела бронирования.
- **`backend/internal/repository/booking_slots.go`** + **`booking_slots_repository.go`** — `GetMasterServiceOverrides`, `ListSalonMastersCoveringServices`.
- **`backend/internal/repository/appointment.go`** + **`appointment_repository.go`** — `CreateWithLineItems`.
- **`backend/internal/infrastructure/persistence/model/models.go`** — модель `AppointmentLineItem`.
- **`backend/internal/service/booking_test.go`** — в т.ч. сценарий мульти-услуги и фильтра мастеров.

---

## 5. Фронтенд (салон)

- **`frontend/src/features/guest-booking/ui/GuestBookingDialog.tsx`** — мультивыбор услуг, шаг мастера, слоты, сводка над контактами, отправка `serviceIds` при нескольких услугах.
- **`frontend/src/features/guest-booking/ui/PublicSlotPicker.tsx`** — передача `serviceIds` в `fetchPublicSlots`.
- **`frontend/src/shared/api/salonApi.ts`** — `fetchPublicSlots` / `submitGuestBooking` с поддержкой нескольких услуг.

---

## 6. Дашборд салона и кабинет мастера

- **`dashboard_repository.go` — `ListAppointments`:**  
  - поле **`serviceName`** в выдаче: `COALESCE(string_agg(appointment_line_items.service_name ORDER BY sort_order), services.name)`;  
  - фильтр **`service_id`**: основная услуга записи **или** `EXISTS` по **`appointment_line_items`** с тем же `service_id`.
- **`master_dashboard_repository.go` — `ListMasterAppointments`:** та же логика **`serviceName`** из line items (фильтра по услуге в этом API нет).

- **`frontend/src/shared/api/dashboardApi.ts`** — комментарий к параметру `serviceId` в `fetchDashboardAppointments` (соответствие бэкенду).

Календарь и списки записей **не меняли разметку** под мульти — используют уже существующее поле `serviceName` (строка может содержать запятые).

---

## 7. Документация в репозитории (обновлено в рамках темы)

- [`docs/architecture.md`](architecture.md) — HTTP-роуты, §7 кабинет салона, таблица `appointment_line_items`, `salonApi`.
- [`docs/status.md`](status.md) — блок «Мульти-услуга — гость и дашборд (итог)».
- [`docs/context.md`](context.md) — продуктовое описание онлайн-записи и дашборда, чеклист.
- [`docs/plans/multi-service-guest-booking.md`](plans/multi-service-guest-booking.md) — §12 (дашборд), §11 (риски), правки по мере реализации.

---

## 8. Проверки (рекомендуемые команды)

```bash
cd backend && go test ./...
cd frontend && npm run lint && npm run build
```

---

## 9. Что улучшить, оптимизировать или добавить (в контексте сделанного)

### Продукт и UX

- **Редактирование мульти-визита в дашборде:** сейчас `PUT` записи и drawer могут опираться на одну «основную» услугу; явный UX «добавить / убрать услугу из визита» с пересчётом времени и line items.
- **Календарь:** при желании отдельный бейдж «+N услуг» или разворачиваемая подсказка вместо длинной строки `serviceName`.
- **Запись с публичного профиля мастера** (`MasterPage`): тот же мульти-флоу или отдельный канал цен — по [`multi-service-guest-booking.md`](plans/multi-service-guest-booking.md) (сценарий 1).

### Данные и API

- **Создание записи из дашборда:** при необходимости тоже писать **`appointment_line_items`** (сейчас гарантированно заполняются при гостевом мульти-`POST /bookings`), чтобы аналитика и отображение были единообразны.
- **Детальный `GET` записи:** при необходимости возвращать массив **`lineItems`** в JSON для drawer/редактора без парсинга `serviceName`.
- **Идемпотентность / защита от дублей** гостевого `POST` (повторный клик, двойной submit) — ключ идемпотентности или короткое окно дедупликации по телефону + слоту.

### Производительность и надёжность

- **Индексы:** при росте объёма — индекс **`appointment_line_items(service_id)`** или композитный под типичный фильтр дашборда (`appointment_id` уже индексируется).
- **Запрос `ListAppointments`:** подзапросы `string_agg` / `EXISTS` на больших таблицах — при необходимости профилирование и **материализованная подпись** в `appointments` (денормализация `service_names_display`) только если метрики покажут узкое место.
- **Строгость длительности слота** при гостевом `POST`: сейчас сравнение целых минут; учесть граничные случаи таймзоны/DST при появлении жалоб.

### Бизнес-логика и цены

- **Отдельные цены «только с профиля мастера»** (сценарий 1 в плане) — отдельная схема или явный MVP «как в салоне».
- **`SumStaffRevenueCents` и аналогичные агрегаты** — сейчас могут суммировать только **`services.price_cents`** по основной услуге; для выручки по мульти-визиту логично опираться на **снимки** из `appointment_line_items` или на статус «оплачено» позже.

### Качество и тесты

- **Интеграционные тесты** с PostgreSQL на `ListAppointments` + фильтр `service_id` + `string_agg`.
- **E2E / ручной чек-лист** для салона с 2+ услугами на один визит (см. также [`docs/salon_master_verification_guide.md`](salon_master_verification_guide.md) при обновлении).

### Документация

- Держать этот файл в актуальном виде при следующих изменениях мульти-визита или ссылаться на него из [`docs/status.md`](status.md) одной строкой, чтобы не дублировать длинные описания.

---

*Документ можно приложить к описанию PR или к релиз-нотам как краткий обзор изменений.*
