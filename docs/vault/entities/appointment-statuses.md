---
title: appointment statuses
updated: 2026-05-05
source_of_truth: mirror
code_pointers: []
---

# Статусы записей (Appointment Statuses)

## Значения статусов

| Статус                | Отображение       | Описание                                                                                                 |
| --------------------- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| `pending`             | Ожидает           | Запись создана (вручную владельцем или клиентом онлайн), ожидает подтверждения салона                    |
| `confirmed`           | Подтверждена      | Владелец/администратор салона подтвердил запись                                                          |
| `cancelled_by_salon`  | Отмена            | Запись отменена со стороны салона                                                                        |
| `cancelled_by_client` | Отменена клиентом | Запись отменена клиентом _(зарезервировано — переход не реализован до появления клиентского интерфейса)_ |
| `completed`           | Завершена         | Визит состоялся                                                                                          |
| `no_show`             | Не пришёл         | Клиент не явился на подтверждённую запись                                                                |

---

## Машина состояний

```
                    ┌─────────────────────────────────┐
                    │            pending               │◄──────────────┐
                    └────────────────┬────────────────┘               │
                                     │                                 │ (авто-сброс при
                         ┌───────────┼───────────────┐                │  редактировании)
                         ▼           ▼               ▼                │
                     confirmed  cancelled_by_salon  [cancelled_by_client]*
                         │
              ┌──────────┼──────────────────┐
              ▼          ▼                  ▼
          completed    no_show     cancelled_by_salon

  * зарезервировано, переход не реализован
```

### Допустимые переходы (бэкенд, `allowedStatusTransition`)

| Из          | В                     | Кем                                      |
| ----------- | --------------------- | ---------------------------------------- |
| `pending`   | `confirmed`           | Салон                                    |
| `pending`   | `cancelled_by_salon`  | Салон                                    |
| `pending`   | `cancelled_by_client` | _(зарезервировано)_                      |
| `confirmed` | `completed`           | Салон                                    |
| `confirmed` | `no_show`             | Салон                                    |
| `confirmed` | `cancelled_by_salon`  | Салон                                    |
| `confirmed` | `cancelled_by_client` | _(зарезервировано)_                      |
| `confirmed` | `pending`             | Автоматически при редактировании деталей |

`completed`, `cancelled_by_salon`, `cancelled_by_client`, `no_show` — **терминальные**: переходов из них нет.

---

## Правила редактирования деталей записи

Детали записи — услуга, мастер, время начала, заметка клиента, имя и телефон гостя.

| Статус                | Можно редактировать? | Поведение при сохранении                                                             |
| --------------------- | -------------------- | ------------------------------------------------------------------------------------ |
| `pending`             | Да                   | Статус остаётся `pending`                                                            |
| `confirmed`           | Да                   | **Статус автоматически сбрасывается в `pending`** (требует повторного подтверждения) |
| `completed`           | Нет                  | Ошибка на бэкенде                                                                    |
| `cancelled_by_salon`  | Нет                  | Ошибка на бэкенде                                                                    |
| `cancelled_by_client` | Нет                  | Ошибка на бэкенде                                                                    |
| `no_show`             | Нет                  | Ошибка на бэкенде                                                                    |

**Обоснование сброса `confirmed` → `pending`:** редактирование ключевых параметров (время, услуга, мастер) меняет суть записи, которую салон подтверждал. Повторное подтверждение гарантирует, что владелец видит актуальные данные.

---

## Кто управляет статусами

- **Владелец / администратор салона** — все переходы через дашборд (`PATCH /api/v1/dashboard/appointments/:id/status`)
- **Мастер (личная запись)** — смена статуса только для визитов без салона (`salon_id IS NULL`), владелец `master_profile_id` совпадает с профилем пользователя: `PATCH /api/v1/master-dashboard/appointments/:id/status`
- **Клиент** — `cancelled_by_client` зарезервирован для будущей клиентской части (не реализовано)
- **Система** — автоматический сброс `confirmed` → `pending` при редактировании деталей (салон и личная запись в кабинете мастера)

---

## Реализация

### Бэкенд

| Файл                                                  | Что делает                                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `backend/internal/model/enums.go`                     | Enum `AppointmentStatus` со всеми значениями                                                         |
| `backend/internal/service/appointmentstatus/transition.go` | Общая функция `AllowedTransition` — допустимые переходы (дашборд салона и кабинет мастера)     |
| `backend/internal/service/dashboard_appointment.go`   | `UpdateAppointment` — guard по статусу + авто-сброс; создание/обновление записи — `master_profile_id` по `salon_masters.master_id` при назначенном мастере |
| `backend/internal/service/master_dashboard.go`        | `PatchPersonalAppointmentStatus`, `UpdatePersonalAppointment` — личные записи                        |
| `backend/internal/controller/dashboard_controller.go` | `PATCH .../appointments/:id/status` и `PUT .../appointments/:id`                                     |
| `backend/internal/controller/master_dashboard_controller.go` | `PATCH .../master-dashboard/appointments/:id/status`                                        |

**Требования к `UpdateAppointment`:**

1. Если `status ∉ {pending, confirmed}` → вернуть ошибку (`appointment cannot be edited in current status`)
2. Если `status == confirmed` → после применения изменений сбросить `status = pending` перед сохранением

### Фронтенд

| Файл                                                            | Что делает                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `frontend/src/pages/dashboard/ui/drawers/AppointmentDrawer.tsx` | `showEditForm` — форма редактирования только для `pending` и `confirmed` |
| `frontend/src/pages/dashboard/ui/drawers/AppointmentDrawer.tsx` | Кнопки действий по статусу                                               |
| `frontend/src/pages/master-dashboard/ui/drawers/MasterPersonalAppointmentDrawer.tsx` | Статусы и кнопки только для **личных** записей; салонные — read-only |

**Кнопки действий по статусу:**

| Статус                                  | Кнопки                                                         |
| --------------------------------------- | -------------------------------------------------------------- |
| `pending`                               | «Подтвердить» → `confirmed`, «Отменить» → `cancelled_by_salon` |
| `confirmed`                             | «Завершить» → `completed`, «Не пришёл» → `no_show`, «Отменить» → `cancelled_by_salon` |
| `completed` / `cancelled_*` / `no_show` | «Закрыть» (read-only)                                          |

---

## UI-представление статусов

Определено в `AppointmentDrawer.tsx` (`statusBadgeCfg`):

| Статус               | Метка        | Цвет      |
| -------------------- | ------------ | --------- |
| `pending`            | Ожидает      | Жёлтый    |
| `confirmed`          | Подтверждена | Зелёный   |
| `completed`          | Завершена    | Бирюзовый |
| `cancelled_by_salon` | Отмена       | Красный   |
| `no_show`            | Не пришёл    | Серый     |
