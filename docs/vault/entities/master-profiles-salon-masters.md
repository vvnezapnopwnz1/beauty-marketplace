---
title: master profiles salon masters
updated: 2026-04-24
source_of_truth: mirror
code_pointers: []
---

# Мастера: `master_profiles` и `salon_masters`

Концептуальная модель и соответствие коду. Публичная витрина `/master/:id` и кабинет мастера — отдельные этапы (см. таблицу в конце).

---

## 1. Две сущности

### 1.1. `master_profiles`

Публичный, **независимый** профиль мастера: не принадлежит салону.

- Связь с аккаунтом: `user_id` → `users` (**nullable**). Если `user_id IS NULL` — «теневой» профиль (создан салоном до регистрации мастера).
- Витрина: имя, фото, bio, специализации, телефон (`phone_e164`), рейтинг (кэш), портфолио (позже).
- Целевая публичная страница: `/master/:id` (Этап 3).

### 1.2. `salon_masters`

**Членство** мастера в конкретном салоне. Создаётся из дашборда владельца (или из инвайта).

- Поля уровня салона: отображаемое имя в расписании, **цвет** в календаре, доступ к дашборду, уведомления, `is_active`, **`status`** (`active` | `pending` | `inactive`), даты (`joined_at`, `left_at` и т.д.).
- Связь с профилем: `master_id` → `master_profiles` (**nullable**). Салон может завести строку без публичного профиля (теоретически `master_id` NULL; в текущем флоу создания из дашборда создаётся и профиль, и связь).

### 1.3. Связь опциональна — состояния

| Условие | Смысл |
|--------|--------|
| `salon_masters.master_id IS NULL` | Только салон, без привязки к общему профилю (редкий/legacy кейс). |
| `salon_masters.master_id` задан | Привязка к `master_profiles`. |
| `master_profiles.user_id IS NULL` | Теневой профиль; салон может править bio / специализации и т.д. (пока мастер не «заклеймил» профиль). |
| `master_profiles.user_id` задан | Мастер владеет профилем; **салон не меняет** поля профиля через дашборд (см. §2). |

---

## 2. Кто что редактирует

### 2.1. Владелец салона (дашборд)

Редактирует **`salon_masters`** и пересечение с услугами салона:

- имя в расписании этого салона, цвет, активность, статус (где применимо);
- **`salon_master_services`**: какие услуги салона выполняет мастер, **`price_override_cents`**, **`duration_override_minutes`**;
- расписание мастера в салоне (`salon_master_hours`), перерывы и т.д.

Редактирует **`master_profiles`**, только если профиль **теневой** (`user_id IS NULL`): bio, специализации, стаж, телефон и т.д. После регистрации мастера (`user_id` заполнен) эти поля **не обновляются** с бэкенда при `PUT` мастера (логика Этапа 2; кабинет мастера — Этап 4).

### 2.2. Мастер (кабинет, Этап 4)

- Полный контент **`master_profiles`** через API `/api/v1/master-dashboard/profile` (имя, bio, специализации, стаж, `avatar_url`; телефон только чтение).
- Просмотр **`salon_masters`**: активные салоны и входящие приглашения (`pending`), принятие / отклонение без push-уведомлений.
- Просмотр записей по всем салонам (`GET .../appointments`).

---

## 3. Жизненный цикл: три пути

### Путь 1 — Салон создаёт нового мастера

В дашборде: «Добавить мастера» → создаются **`master_profiles`** (`user_id NULL`, данные профиля) и **`salon_masters`** (`master_id`, `status=active`, `is_active` по форме).

Дальше мастер может зарегистрироваться; при совпадении **`phone_e164`** с теневым профилем выполняется **claiming** при OTP-верификации (`service/auth.go` + `MasterDashboardRepository`).

### Путь 2 — Салон приглашает уже известного мастера по телефону

1. **`GET /api/v1/dashboard/masters/lookup?phone=+7…`** — поиск **`master_profiles.phone_e164`**.
2. **`POST /api/v1/dashboard/master-invites`** с `{ "masterProfileId": "…" }` — создаётся **`salon_masters`**: `status=pending`, `is_active=false`, `joined_at` NULL.

Уведомления (Telegram и т.д.) — **не** в текущем объёме; принятие инвайта мастером (`pending` → `active`) — в кабинете мастера (`POST .../master-dashboard/invites/:id/accept`).

### Путь 3 — Мастер инициирует заявку в салон

Мастер с **`master_profiles`** подаёт заявку → **`salon_masters`** со `status=pending` (поле **инициатора** в БД может появиться позже; в промпте фигурирует `initiator='master'` как продуктовая идея).

Владелец в дашборде подтверждает — отдельный UX/API позже.

---

## 4. Важные детали в БД

### 4.1. Записи (`appointments`)

Всегда через **`salon_masters`**:

`appointments.salon_master_id` → `salon_masters.id`.

В JSON API дашборда поле мастера: **`salonMasterId`** (UUID строки `salon_masters`).

При уходе мастера из салона: `is_active=false`, `left_at`, строка **`salon_masters`** не удаляется — история записей сохраняется.

### 4.2. Отзывы и рейтинг (концепция)

Цепочка: `reviews` → запись → `salon_masters` → `master_profiles` → агрегаты рейтинга на профиле. Реализация агрегации на **`master_profiles.cached_rating`** — после полноценных отзывов по записям.

### 4.3. Три слоя услуг

| Слой | Таблица / смысл |
|------|------------------|
| Личный каталог мастера | `master_services` — «что умею» (резюме, не обязательно для записи клиента). |
| Каталог салона | `services` (услуги салона, цена/длительность по умолчанию). |
| Мастер в этом салоне | `salon_master_services` — пересечение + **`price_override_cents`**, **`duration_override_minutes`**. |

Клиент в маркетплейсе записывается на услугу салона; конкретный исполнитель — через назначение мастера (слой `salon_master_services` / запись на `salon_master_id`).

---

## 5. API дашборда (реализовано, Этап 2)

Префикс: **`/api/v1/dashboard`**, JWT и членство в салоне.

| Назначение | Метод и путь |
|------------|----------------|
| Список мастеров с `masterProfile` и `services` (оверрайды) | `GET /salon-masters` |
| Создать мастера (профиль + членство) | `POST /salon-masters` |
| Карточка / обновление | `GET`, `PUT /salon-masters/:id` |
| Заменить услуги и оверрайды | `PUT /salon-masters/:id/services` |
| Расписание / метрики (как раньше) | `GET|PUT …/salon-masters/:id/schedule`, `GET …/metrics` |
| Поиск профиля по телефону | `GET /masters/lookup?phone=+7…` |
| Инвайт по `masterProfileId` | `POST /master-invites` |

**Deprecated (те же хендлеры):** `GET|POST /staff`, `GET|PUT|DELETE /staff/:id`, вложенные пути под `/staff/:id/...`.

Подробная постановка: [`agent-prompt-stage2-master-dashboard.md`](agent-prompt-stage2-master-dashboard.md).

---

## 6. Состояние реализации (чеклист)

| Что | Статус |
|-----|--------|
| `master_profiles`, `master_services` в БД | ✅ Этап 1 |
| `salon_masters.master_id` → `master_profiles` | ✅ Этап 1 |
| `salon_masters.status` (`active` / `pending` / `inactive`), миграция `000013` | ✅ |
| `GET` мастеров с вложенным `masterProfile` и списком услуг с оверрайдами | ✅ Этап 2 |
| `PUT` мастера + обновление теневого профиля; пропуск полей профиля при `user_id IS NOT NULL` | ✅ Этап 2 |
| Invite: lookup + `POST master-invites` | ✅ Этап 2 (без уведомлений) |
| Публичная страница `/master/:id` | ✅ Этап 3 (`GET /api/v1/masters/:id`, `GET /api/v1/salons/:id/masters`, `MasterPage`, мастера на `SalonPage`) |
| Кабинет мастера, claiming, принятие инвайта | ✅ Этап 4 (`/api/v1/master-dashboard`, `/master-dashboard`) |
| Агрегация рейтинга на `master_profiles` из отзывов | ⏳ После отзывов |

---

## 7. Напоминание для разработки

При любом UI и API дашборда, затрагивающем поля **`master_profiles`**, нужно учитывать флаг владения: если **`master_profiles.user_id IS NOT NULL`**, владелец салона **не** должен менять bio / специализации / стаж / телефон профиля с сервера (и желательно не предлагать это в форме). Для списков и форм бэкенд отдаёт, например, **`ownedByUser`** во вложенном `masterProfile`, чтобы фронт мог скрыть или задизейблить секцию.

**Верификация телефона мастера:** при создании или обновлении `salon_masters`, если передаётся телефон (`phone_e164`), бэкенд требует `phoneVerificationProof` — UUID из таблицы `staff_phone_verifications` (миграция `000028`). Proof генерируется через OTP-флоу: `POST /api/v1/dashboard/phone-otp/request` → `POST .../verify` → proof UUID. В dev-режиме (`DEV_OTP_BYPASS=true`) принимается магический код «1234». Proof одноразовый — потребляется при сохранении. В edit-режиме, если телефон не изменился, proof не требуется.

Концепция и схема согласованы; расхождения с кодом закрывать через миграции и обновление этого файла + [`status.md`](status.md) / [`architecture.md`](architecture.md).
