# Статусы записей (Appointment Statuses)

## Значения статусов

| Статус | Отображение | Описание |
|--------|-------------|----------|
| `pending` | Ожидает | Запись создана (вручную владельцем или клиентом онлайн), ожидает подтверждения салона |
| `confirmed` | Подтверждена | Владелец/администратор салона подтвердил запись |
| `cancelled_by_salon` | Отмена | Запись отменена со стороны салона |
| `cancelled_by_client` | Отменена клиентом | Запись отменена клиентом *(зарезервировано — переход не реализован до появления клиентского интерфейса)* |
| `completed` | Завершена | Визит состоялся |
| `no_show` | Не пришёл | Клиент не явился на подтверждённую запись |

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

| Из | В | Кем |
|----|---|-----|
| `pending` | `confirmed` | Салон |
| `pending` | `cancelled_by_salon` | Салон |
| `pending` | `cancelled_by_client` | *(зарезервировано)* |
| `confirmed` | `completed` | Салон |
| `confirmed` | `no_show` | Салон |
| `confirmed` | `cancelled_by_salon` | Салон |
| `confirmed` | `cancelled_by_client` | *(зарезервировано)* |
| `confirmed` | `pending` | Автоматически при редактировании деталей |

`completed`, `cancelled_by_salon`, `cancelled_by_client`, `no_show` — **терминальные**: переходов из них нет.

---

## Правила редактирования деталей записи

Детали записи — услуга, мастер, время начала, заметка клиента, имя и телефон гостя.

| Статус | Можно редактировать? | Поведение при сохранении |
|--------|----------------------|--------------------------|
| `pending` | Да | Статус остаётся `pending` |
| `confirmed` | Да | **Статус автоматически сбрасывается в `pending`** (требует повторного подтверждения) |
| `completed` | Нет | Ошибка на бэкенде |
| `cancelled_by_salon` | Нет | Ошибка на бэкенде |
| `cancelled_by_client` | Нет | Ошибка на бэкенде |
| `no_show` | Нет | Ошибка на бэкенде |

**Обоснование сброса `confirmed` → `pending`:** редактирование ключевых параметров (время, услуга, мастер) меняет суть записи, которую салон подтверждал. Повторное подтверждение гарантирует, что владелец видит актуальные данные.

---

## Кто управляет статусами

- **Владелец / администратор салона** — все переходы через дашборд (`PATCH /api/v1/dashboard/appointments/:id/status`)
- **Клиент** — `cancelled_by_client` зарезервирован для будущей клиентской части (не реализовано)
- **Система** — автоматический сброс `confirmed` → `pending` при редактировании деталей

---

## Реализация

### Бэкенд

| Файл | Что делает |
|------|------------|
| `backend/internal/model/enums.go` | Enum `AppointmentStatus` со всеми значениями |
| `backend/internal/service/dashboard_appointment.go` | `allowedStatusTransition` — валидация переходов; `UpdateAppointment` — guard по статусу + авто-сброс |
| `backend/internal/controller/dashboard_controller.go` | `PATCH .../appointments/:id/status` и `PUT .../appointments/:id` |

**Требования к `UpdateAppointment`:**
1. Если `status ∉ {pending, confirmed}` → вернуть ошибку (`appointment cannot be edited in current status`)
2. Если `status == confirmed` → после применения изменений сбросить `status = pending` перед сохранением

### Фронтенд

| Файл | Что делает |
|------|------------|
| `frontend/src/pages/dashboard/ui/drawers/AppointmentDrawer.tsx:164` | `showEditForm` — форма редактирования только для `pending` и `confirmed` |
| `frontend/src/pages/dashboard/ui/drawers/AppointmentDrawer.tsx:413–457` | Кнопки действий по статусу |

**Кнопки действий по статусу:**

| Статус | Кнопки |
|--------|--------|
| `pending` | «Подтвердить» → `confirmed`, «Отменить» → `cancelled_by_salon` |
| `confirmed` | «Завершить» → `completed`, «Отменить» → `cancelled_by_salon` |
| `completed` / `cancelled_*` / `no_show` | «Закрыть» (read-only) |

---

## UI-представление статусов

Определено в `AppointmentDrawer.tsx` (`statusBadgeCfg`):

| Статус | Метка | Цвет |
|--------|-------|------|
| `pending` | Ожидает | Жёлтый |
| `confirmed` | Подтверждена | Зелёный |
| `completed` | Завершена | Бирюзовый |
| `cancelled_by_salon` | Отмена | Красный |
| `no_show` | Не пришёл | Серый |
