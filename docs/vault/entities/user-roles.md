---
title: Роли пользователей
updated: 2026-04-24
source_of_truth: true
---

# Роли пользователей

Документ фиксирует текущую ролевую модель проекта и правила гейтинга API/UI.

## 1) Два уровня ролей

- **Глобальная роль (`users.global_role`)** — что пользователь видит на платформе.
- **Роль в салоне (`salon_members.role`)** — что пользователь может делать в конкретном салоне.

### `users.global_role`

Поддерживаемые значения:

- `client`
- `salon_owner`
- `master`
- `advertiser`
- `admin`

Правила:

- `admin` назначается вручную и **не** пересчитывается автотриггером.
- Остальные значения пересчитываются функцией `recalc_user_global_role(...)` по данным `salon_members` и `master_profiles`.

### `salon_members.role`

Поддерживаемые значения:

- `owner`
- `admin`

Смысл:

- `owner`: владелец салона (данные салона, подписка, операционные действия).
- `admin`: администратор салона (записи, услуги, мастера, календарь), но без управления владением/подпиской.

## 2) EffectiveRoles (источник для гейтов)

Для UI/бизнес-гейтов используется runtime-структура:

```go
type EffectiveRoles struct {
    IsClient        bool
    IsMaster        bool
    IsPlatformAdmin bool
    OwnerOfSalons   []SalonRef
    AdminOfSalons   []SalonRef
}
```

Почему так:

- JWT-клейм `role` может быть устаревшим до обновления access-токена.
- `EffectiveRoles` всегда вычисляется по актуальному состоянию БД.

## 3) Автопересчет `global_role`

Реализовано через SQL-функцию и триггеры:

- триггер на `salon_members` (`INSERT/UPDATE/DELETE`)
- триггер на `master_profiles` (`INSERT/UPDATE/DELETE`)
- backfill для существующих пользователей (не soft-deleted) при миграции.

Приоритет ролей в пересчете:

1. `admin` (не меняется автоматически)
2. `salon_owner` (если есть `salon_members.role='owner'`)
3. `master` (если есть `master_profiles.user_id = user.id`)
4. `client` (иначе)

## 4) Текущие гейты UI/API

- `/dashboard` доступен, если `ownerOfSalons.length + adminOfSalons.length > 0`.
- `/master-dashboard` доступен, если `isMaster = true`.
- `UserMenu` показывает пункты кабинетов по `effectiveRoles`.

## 5) Вне текущего скоупа

Отложено в backlog:

- расширение `salon_members.role` (например, `receptionist`, `accountant`);
- отдельный UI/потоки для platform super-admin;
- кеширование `EffectiveRoles`.
