---
title: API flows
updated: 2026-04-28
source_of_truth: true
code_pointers:
  - backend/internal/controller/server.go
---

# API Flows

Sequence-диаграммы ключевых сценариев. Источник: `backend/internal/controller/server.go`.

---

## 1. Аутентификация по номеру телефона

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Backend API
    participant DB as PostgreSQL

    FE->>API: POST /api/auth/otp/request {phone}
    API->>DB: INSERT otp_codes (phone, code, expires_at)
    API-->>FE: 200 OK

    Note over FE: Пользователь вводит код из SMS

    FE->>API: POST /api/auth/otp/verify {phone, code}
    API->>DB: SELECT otp_codes WHERE phone AND code AND NOT used
    DB-->>API: otp record
    API->>DB: UPDATE otp_codes SET used=true
    API->>DB: UPSERT users (phone_e164)
    API->>DB: UPDATE salon_member_invites SET user_id\nWHERE pending AND phone_e164 matches
    API->>DB: INSERT refresh_tokens
    API-->>FE: {access_token, refresh_token, user}

    Note over FE: После verify фронт делает GET /api/v1/me,\nчтобы получить актуальные effectiveRoles/salonMemberships

    Note over FE: Хранит токены в памяти/localStorage

    FE->>API: POST /api/auth/refresh {refresh_token}
    API->>DB: SELECT refresh_tokens WHERE token_hash AND NOT revoked
    API-->>FE: {access_token, refresh_token}
```

---

## 2. Гостевое бронирование (мультисервис)

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Backend API
    participant DB as PostgreSQL

    FE->>API: GET /api/v1/salons/{id}
    API-->>FE: salon info + services + masters

    FE->>API: GET /api/v1/salons/{id}/booking-slots?date=&master_id=&service_ids=
    API->>DB: SELECT working_hours, salon_master_hours, appointments
    API-->>FE: [{slot_time, available: bool}]

    Note over FE: Пользователь выбирает слот и заполняет форму

    FE->>API: POST /api/v1/salons/{id}/appointments\n{guest_name, phone, slot, service_ids, master_id}
    API->>DB: BEGIN TRANSACTION
    API->>DB: SELECT appointments FOR UPDATE (lock slots)
    API->>DB: INSERT appointments
    API->>DB: INSERT appointment_line_items (per service)
    API->>DB: COMMIT
    API-->>FE: {appointment_id, starts_at, ends_at, status: pending}
```

---

## 3. Поиск салонов / мест

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Backend API
    participant DB as PostgreSQL
    participant GIS as 2GIS API

    FE->>API: GET /api/v1/search?q=&lat=&lng=&category=
    API->>DB: SELECT salons WHERE online_booking_enabled
    API->>GIS: GET /catalog/search (fallback / enrich)
    GIS-->>API: place results
    API-->>FE: [{salon | place, score, distance}]

    Note over FE: Отображает на карте и в списке

    FE->>API: GET /api/v1/geo/region?lat=&lng=
    API->>GIS: reverse geocode
    GIS-->>API: city / region
    API-->>FE: {city, region}
```

---

## 4. Дашборд салона (авторизованный)

Все запросы к **`/api/v1/dashboard/*`** (кроме явных исключений в коде) требуют:

- заголовок **`Authorization: Bearer <access>`**;
- заголовок **`X-Salon-Id: <uuid>`** — салон, в котором проверяется членство (`salon_members`) и роль (`owner` | `admin` | `receptionist`) для RBAC.

> Важно: `salonId` в браузерном маршруте и `salonId` в API передаются по-разному.  
> Пользователь видит URL вида `/dashboard/:salonId/...`, но запросы идут на `/api/v1/dashboard/...` (без `salonId` в path), а выбранный салон передаётся в заголовке `X-Salon-Id`.

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Backend API
    participant DB as PostgreSQL

    Note over FE: JWT + X-Salon-Id (из activeSalon / выбранного салона)

    FE->>API: GET /api/v1/dashboard/overview\nAuthorization + X-Salon-Id
    API->>DB: resolve membership + SELECT stats WHERE salon_id
    API-->>FE: {today_appointments, revenue, staff_load}

    FE->>API: GET /api/v1/dashboard/appointments?date=
    API-->>FE: [{appointment + client + master + services}]

    FE->>API: PATCH /api/v1/dashboard/appointments/{id}\n{status: confirmed}
    API->>DB: UPDATE appointments SET status=confirmed
    API-->>FE: updated appointment
```

### 4.1 Дебаг: route URL vs API URL

Пример нормального поведения:

- браузерный URL: `/dashboard/abc-123/appointments`
- запрос в Network: `GET /api/v1/dashboard/appointments`
- обязательный заголовок: `X-Salon-Id: abc-123`

Если в DevTools кажется, что запрос «без салона», проверь вкладку **Request Headers**: для dashboard-эндпоинтов салон должен быть именно в `X-Salon-Id`.

---

## 5. Персонал салона и инвайты членов

Инвайты в **`salon_member_invites`** (миграция **`000024_staff_management`**). После **`POST /api/auth/otp/verify`** pending-строки с тем же `phone_e164` получают **`user_id`** (пользователь всё равно принимает приглашение явно).

```mermaid
sequenceDiagram
    participant Owner as Owner UI
    participant API as Dashboard API
    participant DB as PostgreSQL

    Owner->>API: POST /api/v1/dashboard/staff-invites\n{phoneE164, role}\n(owner + X-Salon-Id)
    API->>DB: INSERT salon_member_invites pending
    API-->>Owner: 201 invite

    participant User as Invitee UI
    User->>API: GET /api/v1/me/salon-invites
    API-->>User: {items: pending rows}

    User->>API: POST /api/v1/me/salon-invites/{id}/accept
    API->>DB: INSERT salon_members + UPDATE invite accepted
    API-->>User: 204

    Owner->>API: GET /api/v1/dashboard/salon-members
    API-->>Owner: {items: members with phone, role}
```

---

## 6. Dev/e2e bootstrap (локальная среда)

Роуты доступны только при `DEV_ENDPOINTS=1` и предназначены для локального e2e setup.

```mermaid
sequenceDiagram
    participant E2E as Playwright ApiHelpers
    participant API as Backend API
    participant DB as PostgreSQL

    E2E->>API: POST /api/dev/e2e/seed-salon\n{phone, source, externalId, snapshotName}
    API->>DB: UPSERT user by phone
    API->>DB: Ensure salon by external id (claim/bootstrap)
    API->>DB: Ensure owner membership (salon_members)
    API->>DB: Issue token pair
    API-->>E2E: {salonId, dashboardUrl, tokenPair}

    Note over E2E: Дальше тесты используют dashboard URL\nи auth-токены как precondition
```

---

## Маршруты API (сводка)

| Группа | Путь | Auth |
|--------|------|------|
| Health | `GET /health` | — |
| Auth | `POST /api/auth/otp/request` | — |
| Auth | `POST /api/auth/otp/verify` | — |
| Auth | `POST /api/auth/refresh` | — |
| Auth | `GET /api/auth/me` | JWT |
| Salons | `GET /api/v1/salons` | — |
| Salons | `/api/v1/salons/{id}/*` | — |
| Masters | `/api/v1/masters/{id}/*` | — |
| Search | `GET /api/v1/search` | — |
| Geo | `GET /api/v1/geo/region\|cities\|reverse` | — |
| Places | `GET /api/v1/places/search` | — |
| Dashboard | `/api/v1/dashboard/*` | JWT + **X-Salon-Id** |
| Me | `/api/v1/me`, `/api/v1/me/sessions/*`, **`/api/v1/me/salon-invites`** (GET; `.../accept` / `.../decline` POST) | JWT |
| Master Dashboard | `/api/v1/master-dashboard/*` | JWT |
| Dev (локально) | `/api/dev/claim/by-external`, `/api/dev/e2e/seed-salon` | Только при `DEV_ENDPOINTS=1` |

## Связанные заметки

- [[overview]] ([overview.md](overview.md)) — архитектура системы
- [[db-schema]] ([db-schema.md](db-schema.md)) — схема БД
- [[frontend]] ([frontend.md](frontend.md)) — React-компоненты
