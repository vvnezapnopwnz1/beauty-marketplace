---
title: Профиль пользователя (/me) — дизайн-спека
updated: 2026-04-24
status: draft
source_of_truth: true
links:
  - docs/vault/product/backlog.md
  - docs/vault/product/status.md
  - docs/vault/entities/user-roles.md (будет создан)
---

# Профиль пользователя (/me) — дизайн-спека

## 1. Цель и ограничения

Страница `/me` с CRUD базовых полей пользователя (имя, username, демография, локаль, тема), секцией «Безопасность» (список активных сессий, logout everywhere), удалением аккаунта (soft delete), и меню-хабом в NavBar. Ролевая модель **документируется и автопересчитывается**, но без расширения новых уровней.

**В скоупе:**
- Расширение таблицы `users` новыми полями.
- Новые эндпоинты `/api/v1/me/*` (GET/PUT профиль, sessions, DELETE).
- Роут `/me` на фронте, форма редактирования, `UserMenu` в NavBar.
- Триггер пересчёта `users.global_role` по `salon_members` и `master_profiles`.
- Документ `docs/vault/entities/user-roles.md`.

**Не в скоупе (отложено в `docs/vault/product/backlog.md`):**
- Смена телефона через OTP.
- Загрузка аватара (S3-совместимое хранилище). Сейчас `avatarUrl` — простое поле-строка.
- Расширенные роли (`receptionist`, `accountant`), super-admin UI.
- Onboarding-модалка для новых пользователей.
- Кеш `EffectiveRoles`.
- Рефакторинг существующих гейтов `DashboardService`/`MasterDashboardService` на общий хелпер.

## 2. Ролевая модель

Фиксируем существующую двухуровневую модель:

- **`users.global_role`** (`client` / `salon_owner` / `master` / `advertiser` / `admin`) — что юзер видит на платформе (какие кабинеты в меню). Пересчитывается автоматически триггером по `salon_members` и `master_profiles`. Исключение: `admin` не пересчитывается автоматически — выставляется руками.
- **`salon_members.role`** (`owner` / `admin`) — что юзер может в конкретном салоне. `owner` правит данные салона и подписку; `admin` правит записи/услуги/мастеров/календарь, но не данные салона.

Гейтинг UI и API строится на `EffectiveRoles`, который вычисляется из БД по запросу:

```go
type EffectiveRoles struct {
    IsClient        bool
    IsMaster        bool
    IsPlatformAdmin bool
    OwnerOfSalons   []SalonRef
    AdminOfSalons   []SalonRef
}
```

JWT-клейм `role` остаётся, но для бизнес-гейтинга не используется (чтобы избежать 15-минутной «задержки» после смены роли до экспирации access-токена).

## 3. Модель данных

### Миграция `000018_user_profile.up.sql`

```sql
ALTER TABLE users
  ADD COLUMN username     varchar(32),
  ADD COLUMN first_name   varchar(64),
  ADD COLUMN last_name    varchar(64),
  ADD COLUMN birth_date   date,
  ADD COLUMN gender       varchar(16),
  ADD COLUMN city         varchar(64),
  ADD COLUMN bio          text,
  ADD COLUMN locale       varchar(8)  NOT NULL DEFAULT 'ru',
  ADD COLUMN theme_pref   varchar(8)  NOT NULL DEFAULT 'system',
  ADD COLUMN avatar_url   text,
  ADD COLUMN updated_at   timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN deleted_at   timestamptz;

CREATE UNIQUE INDEX users_username_ci_unique
  ON users (LOWER(username))
  WHERE username IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE users ADD CONSTRAINT users_username_format
  CHECK (username IS NULL OR username ~ '^[A-Za-z0-9_]{3,32}$');
ALTER TABLE users ADD CONSTRAINT users_gender_check
  CHECK (gender IS NULL OR gender IN ('male','female','other','prefer_not_to_say'));
ALTER TABLE users ADD CONSTRAINT users_theme_pref_check
  CHECK (theme_pref IN ('light','dark','system'));
ALTER TABLE users ADD CONSTRAINT users_locale_check
  CHECK (locale IN ('ru','en'));

-- заменяем простой UNIQUE на частичный (soft-delete-safe)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_e164_key;
CREATE UNIQUE INDEX users_phone_active_unique
  ON users (phone_e164)
  WHERE deleted_at IS NULL;

-- auto-touch updated_at
CREATE OR REPLACE FUNCTION trg_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER users_touch_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();
```

### Триггер recalc `global_role`

```sql
CREATE OR REPLACE FUNCTION recalc_user_global_role(target_user_id uuid) RETURNS void AS $$
DECLARE
  is_admin       boolean;
  is_salon_owner boolean;
  is_master      boolean;
  new_role       text;
BEGIN
  SELECT global_role = 'admin' INTO is_admin FROM users WHERE id = target_user_id;
  IF is_admin THEN RETURN; END IF;

  SELECT EXISTS(SELECT 1 FROM salon_members WHERE user_id = target_user_id AND role = 'owner')
    INTO is_salon_owner;
  SELECT EXISTS(SELECT 1 FROM master_profiles WHERE user_id = target_user_id)
    INTO is_master;

  new_role := CASE
    WHEN is_salon_owner THEN 'salon_owner'
    WHEN is_master      THEN 'master'
    ELSE 'client'
  END;

  UPDATE users SET global_role = new_role
  WHERE id = target_user_id AND global_role <> new_role;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_recalc_global_role_from_sm() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN PERFORM recalc_user_global_role(OLD.user_id); RETURN OLD; END IF;
  PERFORM recalc_user_global_role(NEW.user_id); RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER salon_members_recalc_role
AFTER INSERT OR UPDATE OR DELETE ON salon_members
FOR EACH ROW EXECUTE FUNCTION trg_recalc_global_role_from_sm();

-- Аналогичный триггер на master_profiles (по NEW.user_id / OLD.user_id).

-- Backfill существующих юзеров:
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM users WHERE deleted_at IS NULL LOOP
    PERFORM recalc_user_global_role(r.id);
  END LOOP;
END $$;
```

### GORM-модель `model.User`

Добавить поля: `Username *string`, `FirstName *string`, `LastName *string`, `BirthDate *time.Time`, `Gender *string`, `City *string`, `Bio *string`, `Locale string`, `ThemePref string`, `AvatarURL *string`, `UpdatedAt time.Time`, `DeletedAt gorm.DeletedAt`.

**Критично:** `AuthService.findOrCreateUser` и все места чтения юзера по телефону должны учитывать soft-delete. При попытке логина в soft-deleted аккаунт — возвращать ошибку «аккаунт удалён», не создавать новый.

### Down-миграция

Дроп индексов, триггеров, функций, колонок. Восстановление простого `UNIQUE(phone_e164)`.

## 4. API-контракты

Все новые эндпоинты под `/api/v1/me/*`, JWT-защищены. Старый `/api/auth/me` остаётся как есть для бэк-совместимости до переезда фронта (depreciation — в backlog).

### `GET /api/v1/me`

```json
{
  "id": "uuid",
  "phone": "+79991234567",
  "username": "manas",
  "displayName": "Манас",
  "firstName": "Манас",
  "lastName": null,
  "birthDate": "1995-03-14",
  "gender": "prefer_not_to_say",
  "city": "Москва",
  "bio": "React разработчик",
  "locale": "ru",
  "themePref": "system",
  "avatarUrl": null,
  "createdAt": "2026-03-01T10:00:00Z",
  "updatedAt": "2026-04-20T12:00:00Z",
  "globalRole": "client",
  "effectiveRoles": {
    "isClient": true,
    "isMaster": false,
    "isPlatformAdmin": false,
    "ownerOfSalons": [],
    "adminOfSalons": []
  },
  "masterProfileId": null
}
```

### `PUT /api/v1/me`

Принимаемые поля: `username`, `displayName`, `firstName`, `lastName`, `birthDate`, `gender`, `city`, `bio`, `locale`, `themePref`, `avatarUrl`. Любые другие поля в body игнорируются (в том числе `phone`, `globalRole`, `id`, `masterProfileId`, `createdAt`).

**Валидация на бэке — источник правды:**

| Поле | Правила |
|------|---------|
| `username` | `^[A-Za-z0-9_]{3,32}$`, unique ci. 409 `username_taken` если занят. |
| `displayName` | 0–64 символа, trim, опционально (null допустим). Если прислан непустым — 1–64. |
| `firstName`, `lastName` | 0–64, trim, опционально. |
| `birthDate` | `YYYY-MM-DD`, не в будущем, не раньше 1900. |
| `gender` | один из enum или null. |
| `city` | 0–64, свободный текст. |
| `bio` | 0–500 символов. |
| `locale` | `ru` \| `en`. |
| `themePref` | `light` \| `dark` \| `system`. |
| `avatarUrl` | валидный `https://` URL или null. |

Ответ — обновлённый объект (как в `GET`). Ошибки: `400 validation_failed` с `field`, `409 username_taken`.

### `GET /api/v1/me/sessions`

```json
[
  {
    "id": "uuid",
    "createdAt": "2026-04-10T09:30:00Z",
    "expiresAt": "2026-05-10T09:30:00Z",
    "isCurrent": true
  }
]
```

`isCurrent` мэтчится по `sessionId`, который фронт кладёт в localStorage при логине (расширенный `VerifyOTP` response содержит `user.sessionId` = `refresh_tokens.id`).

### `DELETE /api/v1/me/sessions/:id`

Отзывает конкретную сессию (`revoked_at = now()`). Попытка отозвать текущую → `400 cannot_revoke_current` с подсказкой использовать `/api/auth/logout`.

### `POST /api/v1/me/sessions/revoke-all`

Отзывает все сессии кроме текущей. Ответ: `{"revoked": N}`.

### `DELETE /api/v1/me`

Soft-delete: `users.deleted_at = now()`, отозвать все refresh-токены, вернуть 204.

**Блокирующее условие:** если юзер — активный `salon_members.owner` хотя бы одного салона, вернуть `409 {"error": "has_owned_salons", "salonIds": [...]}`. Юзер должен сначала передать владение или удалить салоны.

### Формат ошибок

```json
{"error": "<machine_code>", "message": "<optional>", "field": "<optional>"}
```

Ожидаемые коды: `unauthorized`, `username_taken`, `username_invalid`, `validation_failed`, `user_not_found`, `has_owned_salons`, `cannot_revoke_current`.

### Изменения в auth-флоу

- `VerifyOTP` response получает поле `user.sessionId` (= `refresh_tokens.id`).
- Фронт при логине кладёт в localStorage `beauty_session_id`.
- Ни JWT claims, ни refresh-токен не меняют формат.

## 5. Backend-структура

```
backend/internal/
├── controller/user_controller.go           # GET/PUT /me, sessions, DELETE
├── service/user_profile_service.go         # валидация, apply updates, soft delete
├── service/user_roles_service.go           # EffectiveRoles.Resolve
├── repository/user_profile.go              # интерфейс
├── repository/user_roles.go                # интерфейс
└── infrastructure/persistence/
    ├── user_profile_repository.go          # GORM impl
    └── user_roles_repository.go            # SELECT + JOIN salons
```

Регистрация в `app.go` через Fx — по паттерну других контроллеров.

## 6. Frontend-структура

```
frontend/src/
├── pages/me/
│   ├── ui/
│   │   ├── MePage.tsx
│   │   ├── layout/MeLayout.tsx            # sidebar-nav + контент
│   │   └── sections/
│   │       ├── GeneralSection.tsx
│   │       ├── SecuritySection.tsx
│   │       └── DangerSection.tsx
│   └── index.ts
├── features/edit-profile/
│   ├── model/profileSlice.ts              # {profile, status, error, fieldErrors}
│   ├── model/profileSchema.ts             # yup
│   └── ui/ProfileForm.tsx                 # rhf + yup
├── features/manage-sessions/
│   ├── model/sessionsSlice.ts
│   └── ui/
│       ├── SessionsList.tsx
│       └── RevokeConfirmDialog.tsx
├── features/user-menu/ui/UserMenu.tsx     # NavBar menu
├── features/delete-account/ui/DeleteAccountDialog.tsx
├── shared/api/meApi.ts
└── entities/user/                          # расширение UserInfo типа
```

### Роутинг

В `App.tsx`:
```tsx
<Route path="/me" element={<RequireAuth><MePage/></RequireAuth>} />
```

`RequireAuth` — wrapper-компонент на `authSlice.token`; нет токена → `navigate('/login?returnTo=/me')`. Если уже есть похожий гард — используем его; если нет — создаём в `app/RequireAuth.tsx`. `LoginPage` должен поддержать `?returnTo=` (проверить; если не поддерживает — мелкая доработка).

Секция внутри `MePage` выбирается через `?tab=general|security|danger`, default `general`.

### `MePage` — layout

- Desktop: двухколоночный. Слева (240px) — меню секций. Справа — контент, max-width 640px.
- Mobile (<768px) — меню секций превращается в tabs-полосу сверху.

### `GeneralSection` — форма (сверху вниз)

1. Блок аватара: круглый превью + текстовое поле «URL аватара». Fallback — инициалы на фоне из хеша `id`.
2. `displayName` (опциональное; если пусто — в UI показываем как «Без имени», но сохранение пустого значения разрешено).
3. `username` с префиксом `@`; живая валидация формата; проверка занятости — только на submit (серверный 409 → подсветка).
4. `firstName` / `lastName` в один ряд.
5. `birthDate` — MUI DatePicker, ru-locale, max = сегодня.
6. `gender` — MUI Select.
7. `city` — текст (автокомплит из `geoApi` — опциональный extra в плане).
8. `bio` — multiline, счётчик `N / 500`.
9. `locale` — сегментированный control ru/en.
10. `themePref` — сегментированный control; при смене сразу применяется к теме приложения (оптимистично), persist — по кнопке «Сохранить».

Одна кнопка «Сохранить». Без автосохранения на blur.

### `SecuritySection`

- Телефон readonly + подпись «Чтобы сменить телефон, напишите в поддержку» (i18n-ключ).
- Список активных сессий: дата создания, срок действия, бейдж «текущая», кнопка «Отозвать» (кроме текущей). Подтверждение через `RevokeConfirmDialog`.
- Кнопка «Выйти везде, кроме этого устройства» → `POST /api/v1/me/sessions/revoke-all` → toast.

### `DangerSection`

- Блок с описанием последствий soft-delete (записи останутся у салонов, логин недоступен, восстановление — через поддержку).
- Кнопка «Удалить аккаунт» → `DeleteAccountDialog` с подтверждением вводом своего телефона. Submit → `DELETE /api/v1/me` → чистим localStorage → `navigate('/')`.
- Серверный `409 has_owned_salons` → показать список салонов с подсказкой «Сначала передайте права».

### `UserMenu` в NavBar

Текущие ссылки «Кабинет салона» / «Кабинет мастера» в NavBar переносятся **внутрь меню**. Триггер — `IconButton` с аватаром/инициалами. Пункты:

- «Профиль» → `/me` (всегда)
- «Кабинет салона» → `/dashboard` — только если `ownerOfSalons.length + adminOfSalons.length > 0`
- «Кабинет мастера» → `/master-dashboard` — только если `isMaster`
- «Выйти»

### Защита `/dashboard` и `/master-dashboard`

Перевести проверки с `global_role`/`masterProfileId` на `effectiveRoles`. `/dashboard` требует `ownerOfSalons.length + adminOfSalons.length > 0`, `/master-dashboard` — `isMaster`. Иначе redirect на `/me`.

### Redux `profileSlice`

```ts
interface State {
  profile: UserProfile | null
  status: 'idle' | 'loading' | 'saving' | 'error'
  error: string | null
  fieldErrors: Record<string, string>
}
```

Thunks: `loadProfile`, `saveProfile`, `deleteAccount`. Профиль **не хранится в `authSlice`** (там остаётся усечённая `UserInfo`).

## 7. Тесты

### Backend

| Файл | Что проверяем |
|------|---------------|
| `service/user_profile_service_test.go` | валидация (username format/unique, gender enum, birthDate range, bio length, locale, themePref); PUT игнорирует `phone`/`globalRole`; `username_taken` ошибка. |
| `service/user_roles_service_test.go` | `Resolve` для сценариев: клиент, master-only, owner-only, owner+admin разных салонов, platform admin. |
| `infrastructure/persistence/user_profile_repository_test.go` | testcontainers: soft-delete через `deleted_at`, case-insensitive unique username, триггер `updated_at`, триггер recalc `global_role` при insert/delete в `salon_members` и `master_profiles`. |
| `controller/user_controller_test.go` | httptest: 401 без токена, 200 PUT валидного, 409 username_taken, 409 has_owned_salons при DELETE, 400 cannot_revoke_current. |

### Frontend

| Файл | Что проверяем |
|------|---------------|
| `features/edit-profile/ui/ProfileForm.test.tsx` | yup-схема блокирует submit; successful submit зовёт `updateMe`; `username_taken` подсвечивает поле. |
| `features/user-menu/ui/UserMenu.test.tsx` | «Кабинет салона» виден по effectiveRoles; «Кабинет мастера» — по `isMaster`. |
| `features/delete-account/ui/DeleteAccountDialog.test.tsx` | кнопка активна только после ввода правильного телефона. |

### Рукопашная проверка перед «готово»

- `cd backend && go test ./...`
- `cd frontend && npm run lint && npm run build`
- `docker compose up -d && cd backend && go run ./cmd/api`
- Golden-path: войти → `/me` → изменить displayName → сохранить → перезагрузить → поле осталось. Удалить аккаунт → повторный логин невозможен.

## 8. Очерёдность работ

Каждый шаг оставляет репо в рабочем состоянии (можно мёржить отдельно):

1. **Миграция `000018_user_profile` + GORM-модель**. Soft-delete-safe обновления в `AuthService.findOrCreateUser`.
2. **Триггеры recalc `global_role` + backfill**. Integration-тест. Отдельный коммит.
3. **Backend: `UserRolesService` + `UserProfileService` + `/api/v1/me` (GET/PUT)**. `/api/auth/me` не трогаем.
4. **Backend: sessions endpoints** (`GET`, `DELETE /:id`, `revoke-all`). `sessionId` в `VerifyOTP` response.
5. **Backend: `DELETE /api/v1/me`** (soft delete + `has_owned_salons` гард).
6. **Frontend: `meApi.ts` + `profileSlice` + `MePage` layout + `GeneralSection` + `UserMenu`**. Роут `/me`, guard. Без этого шага до `/me` физически не дойти.
7. **Frontend: `SecuritySection`** (сессии, revoke, revoke-all).
8. **Frontend: `DangerSection` + `DeleteAccountDialog`**.
9. **Frontend: переезд `authSlice.user` на `/api/v1/me`** для полей в NavBar; `/api/auth/me` остаётся для бэк-совместимости (depreciation — backlog).
10. **Doc**: `docs/vault/entities/user-roles.md`, обновление `docs/vault/product/status.md` секция «Последние изменения», линк из `docs/vault/README.md`.

### Риски шагов

- Шаг 1: замена `UNIQUE(phone_e164)` на частичный индекс — убедиться, что все строки покрыты `deleted_at IS NULL` при backfill.
- Шаг 2: триггер и backfill на больших объёмах — батчами по 500 строк; на локальной БД проекта — ок в один присест.
- Шаг 9: `grep` по проекту на использование `authSlice.user.masterProfileId`, `authSlice.user.role` — аккуратный перевод на `effectiveRoles`.

## 9. Что не делаем (явно, чтобы не всплыло в PR-review)

- OTP-флоу не трогаем.
- Onboarding-модалка не добавляется.
- JWT claims не меняются.
- Загрузка аватара, смена телефона, расширенные роли — `backlog.md`.
- Рефакторинг существующих гейтов `DashboardService`/`MasterDashboardService` — не делаем, это отдельная задача вне скоупа.
- Rate limit на `/api/v1/me` PUT — не добавляем (общий security hardening — отдельная тема).

## 10. Пост-релиз

В `docs/vault/product/status.md` → секция «Последние изменения (2026-04-24)» добавить:

> **Профиль пользователя (`/me`)**: CRUD базовых полей (имя, username, демография, локаль, тема), soft-delete аккаунта, список активных сессий + logout everywhere, меню в NavBar (`UserMenu`), триггер пересчёта `users.global_role` при insert/delete в `salon_members` и `master_profiles`. Новые эндпоинты `/api/v1/me/*`. Спека: `docs/superpowers/specs/2026-04-24-user-profile-design.md`.
