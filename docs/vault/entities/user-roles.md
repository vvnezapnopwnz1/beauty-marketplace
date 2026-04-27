---
title: Роли пользователей
updated: 2026-04-27
source_of_truth: true
---

# Роли пользователей

Документ фиксирует текущую ролевую модель проекта и правила гейтинга API/UI. Детальный продуктовый контракт: [[product/staff-management-spec]] ([staff-management-spec.md](../product/staff-management-spec.md)).

## 1) Два уровня ролей

- **Глобальная роль (`users.global_role`)** — что пользователь видит на платформе (агрегат по данным БД).
- **Роль в салоне (`salon_members.role`)** — что пользователь может делать в конкретном салоне.

### `users.global_role`

Поддерживаемые значения (enum `global_role`):

- `client`
- `salon_owner`
- `master`
- `advertiser`
- `admin`

Правила:

- `admin` назначается вручную и **не** пересчитывается автотриггером.
- Остальные значения пересчитываются функцией `recalc_user_global_role(...)` по данным `salon_members` и `master_profiles`.

### `salon_members.role`

Поддерживаемые значения (enum `salon_member_role`; значение `receptionist` — migration **`000024_staff_management`**):

- `owner` — владелец салона (данные салона, подписка, персонал/инвайты в UI).
- `admin` — администратор салона (операционные разделы дашборда).
- `receptionist` — ограниченный доступ (в UI: обзор, календарь, записи, клиенты; без услуг, мастеров, расписания, профиля салона, персонала).

## 2) EffectiveRoles (источник для гейтов)

Для UI/бизнес-гейтов в ответах **`/api/auth/me`**, **`/api/v1/me`** и в JWT-пейлоаде после логина используется runtime-структура (см. `backend/internal/repository/user_roles.go`):

```go
type EffectiveRoles struct {
    IsClient         bool                 `json:"isClient"`
    IsMaster         bool                 `json:"isMaster"`
    IsPlatformAdmin  bool                 `json:"isPlatformAdmin"`
    SalonMemberships []SalonMembershipRef `json:"salonMemberships"` // salonId, salonName, role
    PendingInvites   int                  `json:"pendingInvites"`   // счётчик pending salon_member_invites
}
```

Почему так:

- JWT-клейм `role` (глобальная роль) может отставать до обновления access-токена.
- `EffectiveRoles` вычисляется по актуальному состоянию БД (`user_roles_service.Resolve`).

## 3) Автопересчет `global_role`

Реализовано через SQL-функцию и триггеры:

- триггер на `salon_members` (`INSERT/UPDATE/DELETE`)
- триггер на `master_profiles` (`INSERT/UPDATE/DELETE`)
- backfill для существующих пользователей при миграции.

Приоритет ролей в пересчете:

1. `admin` (не меняется автоматически)
2. `salon_owner` (если есть `salon_members.role='owner'`)
3. `master` (если есть `master_profiles.user_id = user.id`)
4. `client` (иначе)

## 4) Текущие гейты UI/API

- **Дашборд салона** — маршрут **`/dashboard/:salonId`** (и вложенные экраны). Требуется членство: `salonId` должен присутствовать в `effectiveRoles.salonMemberships`; иначе редирект на первый доступный салон или на **`/me`**.
- **Заголовок `X-Salon-Id`** на запросах **`/api/v1/dashboard/*`** — салон для проверки членства и RBAC на бэкенде (см. [[architecture/api-flows]]).
- **Раздел «Персонал»** в дашборде — только для **`role === 'owner'`** в выбранном салоне; API `staff-invites` / `salon-members` — owner-only.
- **`/master-dashboard`** — если `isMaster === true` (и соответствующие маршруты в приложении).
- **`UserMenu` / навбар** — ссылки на кабинеты строятся по `effectiveRoles` (`salonMemberships`, `isMaster`).
- **Приглашения в салон** — список и accept/decline: **`GET|POST /api/v1/me/salon-invites`**; счётчик **`pendingInvites`** для бейджа на вкладке «Мой профиль».

## 5) Вне текущего скоупа / backlog

- Полная RBAC-матрица на всех подмаршрутах дашборда (сейчас часть проверок — по роли в handlers + сужение навигации на фронте).
- Отдельный UI/потоки для platform super-admin (кроме уже существующих admin-экранов).
- Кеширование `EffectiveRoles` (с инвалидацией при смене членств/инвайтов).

## Связанные заметки

- [[architecture/db-schema]] ([db-schema.md](../architecture/db-schema.md)) — таблицы `salon_members`, `salon_member_invites`
- [[architecture/api-flows]] ([api-flows.md](../architecture/api-flows.md)) — сценарии дашборда и инвайтов
