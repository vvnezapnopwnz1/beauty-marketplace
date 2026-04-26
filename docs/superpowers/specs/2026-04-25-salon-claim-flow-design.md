---
title: Salon Claim Flow — Design Spec
date: 2026-04-25
status: approved
author: brainstorming session
---

# Salon Claim Flow — Design Spec

Владелец салона находит свой бизнес в поиске платформы (2GIS-витрина) и заявляет права на него. После ручной модерации получает доступ к дашборду и проходит онбординг.

> **Обогащение данных через Apify** — отдельный процесс, не пересекается с этим flow.

---

## Контекст и предпосылки

### Что уже работает

- `SearchPage` показывает смешанную выдачу: наши салоны (`enriched`) и 2GIS-витрины (`place`).
- `SearchResultCard` маршрутизирует: `enriched` → `/salon/:id`, не-enriched → `/place/:extId`.
- `/place/:extId` показывает данные из 2GIS, кнопку «Позвонить», но **без CTA для владельца**.
- Если место уже привязано через `salon_external_ids` — происходит auto-redirect на `/salon/:id`.
- `salon_members` + триггер `recalc_user_global_role` уже существуют (migration 000019): добавление row в `salon_members(role=owner)` автоматически переключает `users.global_role = salon_owner`.
- Auth: OTP + JWT, Telegram-канал доставки — реализованы.

### Что отсутствует

- Таблица `salon_claims`.
- Endpoint `POST /api/v1/salons/claim`.
- Admin-страница `/admin/claims`.
- Chip «Это ваш бизнес?» на странице `/place/:extId`.
- Страница `/join` и маршрут `/claim-salon`.
- Онбординг-визард `/dashboard/onboarding`.

---

## Бизнес-сценарии

### Сценарий A — Discovery (основной)
Владелец сам ищет что-то → видит свой салон в выдаче → замечает chip «Это ваш бизнес?» → проходит claim flow.

### Сценарий B — Referral
Клиент прислал ссылку на `/place/:extId` → владелец открывает → замечает chip → клеймит.

### Сценарий C — Direct Intent
Владелец слышит о платформе → открывает `/join` → ищет свой салон → клеймит.

### Сценарий D — Конфликт (пограничный)
Место уже заклеймлено другим пользователем. Система возвращает 409 `already_claimed` с `salonId`. Владелец видит «Этот салон уже зарегистрирован» и контакт поддержки.

---

## Ментальная карта

```
root: Claim Salon Flow
├── Точки входа
│   ├── /place/:extId — ClaimChip в hero footer
│   ├── SearchResultCard — hover tooltip (десктоп)
│   └── /join — standalone лендинг + поиск по 2GIS
├── Аутентификация
│   ├── Не авторизован → /login?returnUrl=/claim-salon?extId=...
│   └── Авторизован → продолжить немедленно
├── Claim форма /claim-salon
│   ├── Предзаполнено из 2GIS (название, адрес, телефон, фото)
│   ├── Поля: relationType (owner/manager/representative), comment
│   └── Submit → POST /api/v1/salons/claim
├── Бэкенд
│   ├── Проверка salon_external_ids → 409 already_claimed
│   ├── Проверка salon_claims active → 409 claim_already_submitted
│   └── INSERT salon_claims status=pending + снапшот 2GIS
├── Модерация /admin/claims
│   ├── Одобрить → транзакция создания салона
│   └── Отклонить → статус + причина
├── После одобрения
│   ├── salons + salon_external_ids + salon_members(owner) + salon_subscriptions(free/trial)
│   ├── Триггер: users.global_role = salon_owner
│   └── /place/:extId → redirect /salon/:id
└── Онбординг /dashboard/onboarding
    ├── Шаг 1: Профиль (название, фото, категория)
    ├── Шаг 2: Услуги (ввод или пропустить)
    ├── Шаг 3: Расписание (часы, слот)
    └── → /dashboard
```

---

## User / Job Stories

### User Stories

| ID | Роль | Хочу | Чтобы |
|----|------|------|-------|
| US-01 | Владелец | Видеть ненавязчивый CTA на /place, не мешающий клиентам | Заявить права прямо со страницы |
| US-02 | Владелец | Форму, предзаполненную данными 2GIS | Не вводить название/адрес/телефон вручную |
| US-03 | Владелец | Ясный экран подтверждения после submit | Знать, что заявка принята и ждать ответа |
| US-04 | Владелец | Уведомление об одобрении или отклонении | Не опрашивать статус вручную |
| US-05 | Владелец | Онбординг-визард после одобрения | Заполнить профиль шаг за шагом |
| US-06 | Клиент | Не видеть CTA, предназначенный не мне | Нормальный опыт просмотра страницы |
| US-07 | Admin | Список pending-заявок с данными заявителя и 2GIS | Принять решение за 30 секунд |
| US-08 | Admin | Одна кнопка «Одобрить» создаёт всё в БД | Не делать ручные INSERT |
| US-09 | Admin | Указать причину отклонения | Владелец мог исправить и переподать |

### Job Stories (JTBD)

```
[Нашёл свой салон в поиске]
→ хочу быстро застолбить профиль без лишних шагов
→ заявка отправлена, дашборд получен через 1–3 дня

[Отправил заявку и жду]
→ хочу понимать статус своей заявки
→ GET /api/v1/salons/claim/my-status показывает pending/approved/rejected

[Пришла новая заявка на модерацию]
→ хочу верифицировать за минуту, не открывая БД
→ /admin/claims показывает всё на одном экране

[Заявка одобрена, первый вход]
→ хочу быстро выглядеть достойно для клиентов
→ wizard проводит через минимальный обязательный онбординг
```

---

## UML Sequence Diagram

```
Owner          Frontend         Backend API       PostgreSQL       Admin
  │                │                 │                 │              │
  ├─ /place/:extId─►               │                 │              │
  │            ├─────────────────────────────────────►│              │
  │            │  ClaimChip рендерится (mode=place)   │              │
  │            │                 │                 │              │
  ├─ клик chip─►                 │                 │              │
  │            ├─ auth guard ───►│                 │              │
  │            │   (не авторизован → /login)       │              │
  │            │                 │                 │              │
  │            ├─ GET /places/item/{extId} ────────►│              │
  │            ◄─ PlaceDetail (name,addr,phone) ───┤              │
  │            │                 │                 │              │
  ├─ submit ───►                 │                 │              │
  │            ├─ POST /api/v1/salons/claim ───────►│              │
  │            │                 ├─ SELECT salon_external_ids ────►│
  │            │                 │◄──────────────────────────────┤│
  │            │                 │  [если exists → 409]          ││
  │            │                 ├─ SELECT salon_claims active ──►│
  │            │                 │◄──────────────────────────────┤│
  │            │                 │  [если exists → 409]          ││
  │            │                 ├─ INSERT salon_claims(pending) ►│
  │            ◄─ 201 {claimId} ─┤                 │              │
  ├─ SuccessScreen               │                 │              │
  │                              │                 │              │
  │              ═══ Асинхронно ════════════════════════════════ ►│
  │                              │                 │   ├─ GET /admin/claims
  │                              │                 │   ├─ просматривает
  │                              │                 │   ├─ PUT .../approve
  │                              │         BEGIN ──►│              │
  │                              │   INSERT salons ►│              │
  │                              │   INSERT salon_external_ids ───►│
  │                              │   INSERT salon_members(owner) ─►│
  │                              │   INSERT salon_subscriptions ──►│
  │                              │   UPDATE salon_claims=approved ►│
  │                              │         COMMIT ─►│              │
  │                              │   trigger: recalc_user_global_role
  │                              │                 │              │
  ├─ GET /dashboard ─────────────►                 │              │
  │            ├─ effectiveRoles: salon_owner       │              │
  │            ├─ redirect /dashboard/onboarding    │              │
  ├─ онбординг 3 шага            │                 │              │
  ├─ /dashboard                  │                 │              │
```

---

## BPMN Flow

```
[START: /place/:extId]
    │
    ▼
[ClaimChip виден в hero]
    │
    ◆ Клик?
    ├─ Нет ─► [END: клиент продолжает просмотр]
    └─ Да
        │
        ◆ Авторизован?
        ├─ Нет ─► [/login + returnUrl] ─► [OTP] ─┐
        └─ Да ────────────────────────────────────┘
                │
                ▼
        [/claim-salon?extId=...&source=2gis]
        [Форма: предзаполнена 2GIS, relationType, comment]
                │
                ▼
        [POST /api/v1/salons/claim]
                │
                ◆ Дубль?
                ├─ salon_external_ids exists ─► [409 already_claimed] ─► [END: "уже зарегистрирован"]
                ├─ salon_claims active exists ─► [409 duplicate] ─► [END: "заявка уже подана"]
                └─ Чисто
                        │
                        ▼
                [INSERT salon_claims status=pending]
                        │
                        ▼
                [ClaimSuccessScreen "Ожидайте 1–3 дня"]

═══ Модерация (Admin, /admin/claims) ═══════════════════════════

        [Список pending-заявок]
                │
                ◆ Решение?
                ├─ Одобрить
                │       │
                │       ▼
                │  [Транзакция BEGIN]
                │  [INSERT salons ← snapshot]
                │  [INSERT salon_external_ids]
                │  [INSERT salon_members role=owner]
                │  [INSERT salon_subscriptions free/trial]
                │  [UPDATE salon_claims approved]
                │  [COMMIT]
                │       │
                │       ▼
                │  [Триггер: global_role = salon_owner]
                │       │
                │       ▼
                │  [/dashboard/onboarding]
                │  [Шаг 1: Профиль] → [Шаг 2: Услуги] → [Шаг 3: Расписание]
                │       │
                │       ▼
                │  [END: /dashboard — кабинет готов]
                │
                └─ Отклонить
                        │
                        ▼
                [UPDATE salon_claims rejected + reason]
                        │
                        ▼
                [END: уведомление владельцу с причиной]
```

---

## Схема БД

### Новая таблица `salon_claims` (migration `000020_salon_claims`)

```sql
CREATE TYPE claim_status   AS ENUM ('pending', 'approved', 'rejected', 'duplicate');
CREATE TYPE claim_relation AS ENUM ('owner', 'manager', 'representative');

CREATE TABLE salon_claims (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Заявитель
    user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relation_type    claim_relation NOT NULL DEFAULT 'owner',
    comment          TEXT,

    -- Внешний объект
    source           VARCHAR(50)  NOT NULL,       -- '2gis'
    external_id      VARCHAR(255) NOT NULL,

    -- Снапшот 2GIS данных на момент подачи (не зависим от живого API)
    snapshot_name    TEXT         NOT NULL,
    snapshot_address TEXT,
    snapshot_phone   VARCHAR(50),
    snapshot_photo   TEXT,

    -- Модерация
    status           claim_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by      UUID         REFERENCES users(id),
    reviewed_at      TIMESTAMPTZ,

    -- Результат (заполняется при approve)
    salon_id         UUID         REFERENCES salons(id),

    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Один активный claim на заявителя × место
CREATE UNIQUE INDEX ux_salon_claims_active
    ON salon_claims(user_id, source, external_id)
    WHERE status IN ('pending', 'approved');

-- Быстрый поиск по статусу для admin-страницы
CREATE INDEX idx_salon_claims_status ON salon_claims(status, created_at DESC);
```

### Дополнительная колонка в `salons` (в той же миграции `000020`)

```sql
ALTER TABLE salons ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;
```

Устанавливается в `true` при финальном шаге визарда (`PUT /api/v1/dashboard/profile` с флагом). Существующие салоны (созданные до этого PR) остаются `false` — они никогда не попадут в визард, потому что `/dashboard/onboarding` проверяет роут только при `effectiveRoles.includes('salon_owner')` И только при редиректе из `DashboardPage`.

> **Альтернатива:** поле в `salon_subscriptions` — решено НЕ использовать, оно про биллинг, а не онбординг.

### ER-дополнение

```
users ──1:N── salon_claims ──N:1── salons (nullable, после approve)
                   │                    │
                   │                    └── onboarding_completed: bool
                   └── (source, external_id) → 2GIS place
```

---

## API Spec

### Endpoints

| Method | Path | Auth | Описание |
|--------|------|------|---------|
| POST | `/api/v1/salons/claim` | JWT (любая роль) | Подать заявку |
| GET | `/api/v1/salons/claim/my-status` | JWT | Статус своей заявки |
| GET | `/api/v1/admin/claims` | JWT, admin | Список заявок |
| PUT | `/api/v1/admin/claims/:id/approve` | JWT, admin | Одобрить |
| PUT | `/api/v1/admin/claims/:id/reject` | JWT, admin | Отклонить |

---

### POST `/api/v1/salons/claim`

**Request**
```json
{
  "source": "2gis",
  "externalId": "141373143068690",
  "relationType": "owner",
  "comment": "Веду этот салон 5 лет"
}
```

**Responses**
```json
// 201 Created
{
  "claimId": "uuid",
  "status": "pending",
  "estimatedReviewDays": 3
}

// 409 — место уже в платформе
{
  "error": "already_claimed",
  "salonId": "uuid"
}

// 409 — заявка уже подана этим пользователем
{
  "error": "claim_already_submitted",
  "claimId": "uuid",
  "status": "pending"
}
```

---

### GET `/api/v1/salons/claim/my-status`

**Query params:** `?source=2gis&externalId=141373143068690` (обязательны)

```json
// 200
{
  "claimId": "uuid",
  "status": "pending",           // pending | approved | rejected | duplicate
  "rejectionReason": null,       // строка если rejected/duplicate
  "salonId": null,               // uuid если approved
  "createdAt": "2026-04-25T10:00:00Z"
}

// 404 — нет заявки на это место от этого пользователя
{ "error": "no_active_claim" }
```

---

### GET `/api/v1/admin/claims`

**Query params:** `?status=pending&page=1&page_size=20`

```json
// 200
{
  "items": [
    {
      "id": "uuid",
      "status": "pending",
      "relationType": "owner",
      "comment": "Веду 5 лет",
      "createdAt": "2026-04-25T10:00:00Z",
      "user": {
        "id": "uuid",
        "phone": "+79001234567",
        "displayName": "Анна М."
      },
      "place": {
        "name": "Салон Красоты LUXE",
        "address": "Москва, ул. Пушкина 10",
        "phone": "+74951234567",
        "photoUrl": "https://..."
      }
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 20
}
```

---

### PUT `/api/v1/admin/claims/:id/approve`

Атомарная транзакция:
1. `INSERT salons` — из snapshot_name / snapshot_address (name_override, address)
2. `INSERT salon_external_ids` — (salon_id, source, external_id)
3. `INSERT salon_members` — (salon_id, user_id, role=owner)
4. `INSERT salon_subscriptions` — (salon_id, plan=free, status=trial)
5. `UPDATE salon_claims SET status=approved, salon_id=?, reviewed_by=?, reviewed_at=now()` — только одобряемая запись
6. `UPDATE salon_claims SET status='duplicate', rejection_reason='Другая заявка одобрена' WHERE source=? AND external_id=? AND status='pending' AND id <> ?` — конкурирующие pending-заявки других пользователей на то же место
7. Триггер `salon_members_recalc_role` → `recalc_user_global_role` → `users.global_role = salon_owner`

```json
// 200
{ "salonId": "uuid" }

// 409 — уже одобрена ранее
{ "error": "claim_already_approved" }
```

---

### PUT `/api/v1/admin/claims/:id/reject`

```json
// Request
{ "reason": "Не удалось верифицировать право собственности" }

// 200
{ "status": "rejected" }
```

---

## UX — ClaimChip на /place/:extId

```
Hero section (place mode only):
┌─────────────────────────────────────────────────┐
│  [Фото / градиент]                              │
│                                                 │
│  Название Салона                                │
│  ★★★★☆ 4.2  (18 отзывов)  📍 Москва, Пушкина 1│
│                                                 │
│  [2GIS карточка]  [Это ваш бизнес? →]          │
│                    ^                            │
│                    │  outlined chip             │
│                    │  border: 1px dashed        │
│                    │  color: inkSoft (#7A6F66)  │
│                    │  fontSize: 12px            │
│                    │  no fill background        │
└─────────────────────────────────────────────────┘
```

**Почему не мешает клиентам:** в `place` mode кнопки «Записаться» нет — нечем конкурировать. Chip воспринимается как мета-информация, не CTA. На мобайле: второй пункт в sticky bottom bar после «Позвонить», маленький ghost-button.

---

## Карта frontend-компонентов

### Новые файлы (FSD)

```
features/claim-salon/
  ui/
    ClaimChip.tsx          ← chip на SalonPage (только mode=place)
    ClaimSalonPage.tsx     ← /claim-salon?extId=...&source=...
    ClaimStatusPage.tsx    ← /claim-salon/status
    ClaimSuccessScreen.tsx ← inline после успешного submit
  api/
    claimApi.ts            ← POST /salons/claim, GET /salons/claim/my-status

pages/join/
  ui/JoinPage.tsx          ← /join лендинг + 2GIS поиск своего салона

pages/admin/
  ui/AdminClaimsPage.tsx   ← /admin/claims, список + approve/reject

pages/dashboard/ui/
  OnboardingWizard.tsx     ← /dashboard/onboarding, 3 шага
```

### Изменения в существующих файлах

| Файл | Изменение |
|------|-----------|
| `pages/salon/ui/SalonPage.tsx` | Добавить `<ClaimChip>` если `view.mode === 'place'` |
| `entities/search/ui/SearchResultCard.tsx` | Hover tooltip «Владелец?» на не-enriched картах |
| `app/App.tsx` | Добавить роуты: `/claim-salon`, `/claim-salon/status`, `/join`, `/admin/claims`, `/dashboard/onboarding` |
| `shared/ui/NavBar.tsx` | Ссылка `/admin/claims` если `global_role === 'admin'` |
| `pages/dashboard/ui/DashboardPage.tsx` | Redirect на `/dashboard/onboarding` если `onboarding_completed = false`; флаг устанавливается после шага 3 визарда |

---

## Backend — новые файлы (Go)

```
internal/
  model/
    salon_claim.go                  ← SalonClaim struct, ClaimStatus enum
  repository/
    salon_claim.go                  ← interface SalonClaimRepository
  infrastructure/persistence/
    salon_claim_repository.go       ← GORM impl
  service/
    salon_claim_service.go          ← бизнес-логика: Submit, Approve, Reject
  controller/
    salon_claim_controller.go       ← HTTP handlers
    admin_controller.go             ← /admin/* endpoints
```

---

## Онбординг-визард `/dashboard/onboarding`

### Шаг 1 — Профиль салона
- Поля: `name_override`, `photo_url`, `category_id`, `business_type`
- Предзаполнено из snapshot (name, photo из 2GIS)
- Обязателен: хотя бы `name_override`

### Шаг 2 — Услуги *(можно пропустить)*
- Ручное добавление через существующий `ServiceFormModal`
- Кнопка «Пропустить» ведёт на шаг 3

### Шаг 3 — Расписание *(можно пропустить)*
- Часы работы по дням недели → `working_hours`
- `slot_duration_minutes` (15/30/60)
- После сохранения — `onlineBookingEnabled = true` автоматически

### Финал
`PUT /api/v1/dashboard/profile` → `onlineBookingEnabled = true` → redirect `/dashboard`

---

## Ограничения и риски

| Риск | Уровень | Митигация |
|------|---------|-----------|
| Фрод-клейм (чужой салон) | 🔴 Высокий | Ручная модерация (Вариант Б) — каждая заявка проверяется |
| Дублирующиеся заявки | 🟡 Средний | `UNIQUE INDEX` на `(user_id, source, external_id) WHERE active` |
| 2GIS данные устарели в snapshot | 🟡 Средний | Admin может видеть актуальные данные 2GIS в /admin/claims; snapshot только для истории |
| Задержка модерации → потеря владельца | 🟡 Средний | Ясная коммуникация сроков (1–3 дня); статус-страница |
| Место отсутствует в 2GIS | 🟠 Низкий | `/join` позволяет создать салон вручную без 2GIS-привязки (фаза 2) |

---

## Out of Scope (не входит в этот spec)

- SMS/email уведомления о статусе заявки (фаза 2)
- Верификация через документы (фаза 2)
- Создание салона вручную без 2GIS-привязки (фаза 2)
- Yandex Maps и Google Maps как источники (фаза 2)
- Обогащение через Apify — отдельный spec
