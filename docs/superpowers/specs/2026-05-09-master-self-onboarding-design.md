---
title: Master Self-Onboarding — Design
date: 2026-05-09
status: draft
owners: [vvnezapnopwnz1]
related:
  - docs/vault/entities/master-profiles-salon-masters.md
  - docs/vault/entities/user-roles.md
  - docs/superpowers/specs/2026-04-25-salon-claim-flow-design.md
---

# Master Self-Onboarding — Design

## 1. Контекст и проблема

В текущей системе `master_profiles` создаётся **двумя путями**:

1. **Салон создаёт теневой профиль** (`user_id IS NULL`) при добавлении мастера в свой штат. Создание уже требует `phoneVerificationProof` (см. `service/dashboard_staff.go`, миграция `000028`), то есть владелец салона должен ввести OTP-код, пришедший на телефон мастера. Это гарантирует, что номер реален и мастер дал согласие участвовать в салоне.
2. **Auto-claim при OTP-логине**: когда пользователь логинится по номеру, который совпадает с `phone_e164` теневого профиля, `tryClaimShadowMasterProfile` (`service/auth.go`) автоматически связывает `user_id` с теневым профилем.

Чего **нет** сейчас:

- Нет пути для обычного клиента (или независимого мастера, который не работает в зарегистрированном салоне) самостоятельно создать `master_profiles` и получить кабинет мастера.
- На лендинге `/for-masters` (`pages/for-masters/`) кнопка `Стать мастером` ведёт на `/login` без последующего флоу.
- Существует тонкая дыра приватности: страница `/master/:id` показывает теневые профили без явного согласия мастера на индивидуальную публичную витрину (мастер согласился работать в салоне, но не выставлять личное портфолио на маркетплейс).

## 2. Цели и не-цели

**Цели:**

- Пользователь может на `/for-masters` нажать «Стать мастером», пройти 5-шаговый wizard и опубликовать собственный публичный профиль.
- Мгновенная регистрация без админ-модерации.
- Закрытие дыры приватности: теневой профиль не виден на `/master/:id`, пока сам мастер не нажмёт «Опубликовать».
- Совместимость с существующими процессами: salon-claim, salon→master-creation, auto-claim при OTP, кабинет мастера.

**Не-цели (явно out of scope):**

- Админ-модерация профилей мастеров.
- E-mail / push уведомления при создании теневого профиля.
- Кнопка «Снять с публикации» (un-publish) — добавим позже как отдельную задачу при необходимости.
- Поиск мастеров в unified-search — мастера сейчас не индексируются, и эта фича не требует индексации.
- Размещение CTA вне `/for-masters` (в `MePage`, `UserMenu`, footer) — может быть добавлено позже как отдельная задача.

## 3. User flow

```
[/for-masters]
    │ click "Стать мастером" → href="/master-onboarding/start"
    ▼
RequireAuth?
    │ no  → redirect /login?redirect=/master-onboarding/start
    │ yes → загружается /master-onboarding/start
    ▼
POST /api/v1/me/master-onboarding/start
    │
    ├─ A2 (already isMaster)  → redirect /master-dashboard
    ├─ A1 (shadow by phone)   → claim → redirect /master-onboarding
    └─ A0 (no profile)        → INSERT → redirect /master-onboarding
    ▼
[/master-onboarding] — wizard, 5 шагов
    1. Профиль (display_name, avatar, bio)
    2. Специализации (категории услуг)
    3. Личный каталог услуг (можно пропустить)
    4. Расписание (можно пропустить)
    5. Публикация (review + кнопка «Опубликовать» → POST /publish)
    ▼
[/master-dashboard] (effectiveRoles.isMaster = true, published_at != NULL)
```

## 4. Архитектурные решения

### 4.1. Регистрация — мгновенная, с флагом публикации

- Серверный handler сразу создаёт `master_profiles` с `published_at = NULL`.
- Кабинет `/master-dashboard` доступен по факту наличия записи (его существующий гейт — `MyProfile() != nil`).
- Прямая выдача `/master/:id` гейтится `published_at IS NOT NULL`.
- Страница салона `/api/v1/salons/:id/masters` **не** гейтится `published_at` — теневые мастера продолжают отображаться через `salon_masters`. Это два разных контекста публикации: «салон публикует список своих мастеров» и «мастер публикует индивидуальную витрину».

### 4.2. Идемпотентный `start`

Endpoint обрабатывает все три состояния (A0/A1/A2) и возвращает корректный `redirect`. Повторный вызов безопасен — не создаёт дубликат, не сбрасывает прогресс.

### 4.3. State машина wizard-а — на `master_profiles.onboarding_step`

Поле `onboarding_step master_onboarding_step` (enum) хранит, на каком шаге wizard'а сейчас находится мастер. При повторном открытии wizard читает поле и открывает соответствующий шаг. Монотонное продвижение — endpoint `POST /master-dashboard/onboarding/step` не откатывает назад.

### 4.4. Подход «переиспользовать master-dashboard endpoints»

Wizard сохраняет данные через **существующие** endpoints:

- `PUT /api/v1/master-dashboard/profile` для шагов 1–2.
- `master-dashboard/services` и `master-dashboard/schedule` для шагов 3–4 (если уже существуют — переиспользуем; если нет — добавляем как часть этой фичи; финальная проверка существования и точные пути будут в плане).

Wizard добавляет два специальных endpoint-а сверху: `start` и `publish`.

## 5. БД-миграции

### 5.1. `000042_master_profiles_publishing`

```sql
-- up
ALTER TABLE master_profiles
    ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;

-- Backfill: только claimed (user_id IS NOT NULL) считаем согласными на публикацию.
-- Теневые user_id IS NULL остаются скрытыми из прямой выдачи /master/:id;
-- они продолжают отображаться через salon_masters на странице салона.
UPDATE master_profiles
   SET published_at = created_at
 WHERE user_id IS NOT NULL;

CREATE INDEX idx_master_profiles_published
    ON master_profiles(published_at)
    WHERE published_at IS NOT NULL;
```

```sql
-- down
DROP INDEX IF EXISTS idx_master_profiles_published;
ALTER TABLE master_profiles DROP COLUMN IF EXISTS published_at;
```

### 5.2. `000043_master_profiles_onboarding_step`

```sql
-- up
DO $$ BEGIN
  CREATE TYPE master_onboarding_step AS ENUM (
    'profile', 'specializations', 'services', 'schedule', 'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE master_profiles
    ADD COLUMN onboarding_step master_onboarding_step;

-- Backfill: профили, которые уже claimed и published, считаем 'completed'.
UPDATE master_profiles mp
   SET onboarding_step = 'completed'
 WHERE mp.published_at IS NOT NULL
   AND mp.user_id IS NOT NULL;
```

```sql
-- down
ALTER TABLE master_profiles DROP COLUMN IF EXISTS onboarding_step;
DROP TYPE IF EXISTS master_onboarding_step;
```

### 5.3. Что специально не трогаем

- Триггер `recalc_user_global_role` уже корректно реагирует на INSERT/UPDATE в `master_profiles` — его не модифицируем.
- Поле `is_active` остаётся независимым флагом.
- Не вводим constraint между `published_at` и `onboarding_step` — гибкость нужна для будущих сценариев.
- Не добавляем `claimed_at` — `user_id IS NOT NULL` уже служит маркером.

## 6. API контракт

### 6.1. Новые endpoints

#### `POST /api/v1/me/master-onboarding/start`

- **Auth:** RequireAuth (JWT).
- **Body:** пусто.
- **Behavior:** идемпотентный switch по состоянию.

| Состояние | Действие | Response |
|---|---|---|
| A2: профиль существует | nothing | `200 { masterProfileId, status: "existing", onboardingStep, redirect: "/master-dashboard" }` |
| A1: shadow по phone | UPDATE `master_profiles SET user_id = me.id WHERE id = shadow.id AND user_id IS NULL`; если `onboarding_step IS NULL` → set `'profile'` | `200 { masterProfileId, status: "claimed", onboardingStep: "profile", redirect: "/master-onboarding" }` |
| A0: ничего нет | INSERT `master_profiles { user_id, display_name = COALESCE(user.display_name, ''), phone_e164 = user.phone, is_active = true, published_at = NULL, onboarding_step = 'profile' }` | `200 { masterProfileId, status: "created", onboardingStep: "profile", redirect: "/master-onboarding" }` |

- **Errors:**
  - `409 phone_conflict` — race на claim shadow (между SELECT и UPDATE его уже claim'нул другой user). Защита: `WHERE user_id IS NULL` в UPDATE.
  - `500` — общая ошибка БД.

#### `POST /api/v1/master-dashboard/onboarding/step`

- **Auth:** RequireAuth + master profile required.
- **Body:** `{ step: "profile" | "specializations" | "services" | "schedule" }`.
- **Behavior:** монотонно продвигает `onboarding_step`. Не регрессирует.
- **Response:** `200 { onboardingStep }`.

#### `POST /api/v1/master-dashboard/publish`

- **Auth:** RequireAuth + master profile required.
- **Body:** пусто.
- **Validation:** жёсткая. Должно выполняться:
  - `display_name != ''`
  - `len(specializations) >= 1`

  Услуги и расписание **не** обязательны.
- **Behavior:** `UPDATE master_profiles SET published_at = COALESCE(published_at, now()), onboarding_step = 'completed' WHERE id = my.id`. Использование `COALESCE` обеспечивает идемпотентность — повторная публикация не перезаписывает дату первой.
- **Response:** `200 { masterProfileId, publishedAt, onboardingStep: "completed" }`.
- **Errors:**
  - `422 missing_required` с `{ fields: ["displayName" | "specializations"] }`. Фронт переключает на соответствующий шаг.

### 6.2. Изменения в существующих endpoints

| Endpoint | Изменение |
|---|---|
| `GET /api/v1/master-dashboard/profile` | DTO `MasterProfileCabinetDTO`: +поля `publishedAt: string\|null`, `onboardingStep: string\|null`. |
| `PUT /api/v1/master-dashboard/profile` | Без изменений логики. |
| `GET /api/v1/masters/:id` | В `MasterPublicService.GetMasterProfilePublic` SQL-фильтр `AND published_at IS NOT NULL`. Не нашли → controller отдаёт `404`. |
| `GET /api/v1/salons/:id/masters` | DTO `MasterProfilePublicNested`: +`isPublished: boolean` (вычисляется как `published_at IS NOT NULL`). SQL не меняется. |
| `GET /api/v1/auth/me`, `/api/v1/me` | Без изменений. `effectiveRoles.isMaster` пересчитывается триггером. |

### 6.3. Личный каталог услуг и расписание (для шагов 3–4)

В стадии writing-plans проверяется существование endpoints:

- `GET / POST / PUT / DELETE /api/v1/master-dashboard/services` (CRUD над `master_services`).
- `GET / PUT /api/v1/master-dashboard/schedule` (`master_working_hours`).

Если они уже есть — переиспользуем. Если нет — добавляем тонкие CRUD-обёртки. Эти endpoints всё равно нужны для полноценного кабинета мастера, инвестиция оправдана независимо от wizard-а.

### 6.4. Контракт идемпотентности

- Повторный `POST /me/master-onboarding/start` для уже-master-а → existing профиль, никаких side-effects.
- Повторный `POST /master-dashboard/publish` → no-op (через `COALESCE`).
- `POST /onboarding/step` идемпотентен и не регрессирует.

## 7. Frontend

### 7.1. Новые роуты

| Path | Component | Guard |
|---|---|---|
| `/master-onboarding/start` | `MasterOnboardingStartBridge` (тонкий redirect-компонент) | `RequireAuth` |
| `/master-onboarding` | `MasterOnboardingWizard` | `RequireAuth` |

`MasterOnboardingStartBridge`:

1. Дёргает `POST /api/v1/me/master-onboarding/start`.
2. По полю `redirect` → `navigate(redirect)`.
3. Показывает скелетон, пока запрос идёт.

### 7.2. Структура wizard-а

```
pages/master-onboarding/
  ui/
    MasterOnboardingWizard.tsx       — корневой компонент, MobileStepper, навигация
    MasterOnboardingStartBridge.tsx  — redirect-bridge для /master-onboarding/start
    StepProfile.tsx                  — display_name, avatar (загрузка), bio
    StepSpecializations.tsx          — multi-select из service categories
    StepServices.tsx                 — список master_services (можно пропустить)
    StepSchedule.tsx                 — недельные часы master_working_hours (можно пропустить)
    StepPublish.tsx                  — review + кнопка «Опубликовать»
  index.ts
```

State management — компонент-локальный `useState` + RTK Query hooks из `entities/master-onboarding/api/masterOnboardingApi.ts` (новый slice). При наличии существующих `entities/master/...` — переиспользуем оттуда то, что есть.

**Сохранение по шагам:** клик «Далее» на каждом шаге wizard-а делает **два последовательных вызова**:

1. Сохранение payload текущего шага (`PUT /master-dashboard/profile` для шагов 1–2; `services` / `schedule` endpoints для шагов 3–4).
2. `POST /master-dashboard/onboarding/step` с новым `step` (продвижение state-машины).

Шаг 5 (Публикация) вместо этого вызывает `POST /master-dashboard/publish`.

**Открытие на правильном шаге:** при загрузке wizard читаем `profile.onboardingStep` и устанавливаем `step` индекс. Если `'completed'` → wizard сам редиректит в `/master-dashboard`.

**Кнопка «Опубликовать» disabled на фронте**, если `displayName.trim() === ''` или `specializations.length === 0`. Дублирует серверную валидацию для UX.

### 7.3. Изменения в существующих компонентах

#### `pages/for-masters/ui/HeroSection.tsx`

```diff
- href={ROUTES.LOGIN}
+ href="/master-onboarding/start"
```

#### `pages/for-masters/ui/CtaFooterSection.tsx`

Аналогично.

#### `pages/salon/ui/SalonPage.tsx:444`

```diff
- {m.masterProfile?.id && (
+ {m.masterProfile?.id && m.masterProfile?.isPublished && (
    <Button onClick={() => navigate(masterPath(m.masterProfile!.id))}>
      Профиль мастера
    </Button>
  )}
```

#### `entities/master/...` (или соответствующий слой)

Добавить `isPublished: boolean` в TS-тип `MasterProfilePublicNested`.

### 7.4. Поддержка `?redirect=` в `/login` (явный пункт)

`LoginPage` должна:

1. Читать `?redirect=...` query-param при монтировании.
2. После успешного OTP-логина — `navigate(redirect)` если он валиден, иначе fallback на default.
3. **Валидация redirect** (защита от open-redirect):
   - Принимать только same-origin относительные пути, начинающиеся с `/`.
   - Отклонять схемы (`http://`, `//`, `javascript:` и т.п.).
   - При невалидном — игнорировать и идти на default.

`RequireAuth` при отсутствии auth должен редиректить на `/login?redirect=<encoded current path>`.

Если эти возможности уже есть в коде — задача в плане сводится к проверке. Если нет — реализовать.

### 7.5. i18n

Добавить ключи в `frontend/src/shared/i18n/locales/{en,ru}.json`:

- `masterOnboarding.title`
- `masterOnboarding.steps.{profile,specializations,services,schedule,publish}.{title,description}`
- `masterOnboarding.actions.{next,back,skip,publish}`
- `masterOnboarding.errors.{missingDisplayName,missingSpecializations}`

### 7.6. Что не трогаем

- Существующий `OnboardingWizard` для салонов (отдельный компонент).
- `MasterPage.tsx` — серверный 404 покажет «not found», без специальных редиректов.
- Mobile-приложение — публичная витрина `/master/:id` там не используется.

## 8. Edge cases

| # | Сценарий | Ожидаемое поведение |
|---|---|---|
| 1 | A0 → start | INSERT профиля, role recalc, `published_at = NULL`, redirect в wizard. |
| 2 | A1 → start | Claim shadow (`user_id = me.id`); `published_at` остаётся NULL — публикация только через wizard. `onboarding_step = 'profile'`. |
| 3 | A2 → start | No-op. Redirect в `/master-dashboard`. |
| 4 | A1 race (одновременный claim) | `WHERE user_id IS NULL` защищает. Второй вызов получает `409 phone_conflict`. Фронт показывает «уже зарегистрирован». |
| 5 | Salon_owner → start | Создаётся master_profile, role становится комбинированной. |
| 6 | Receptionist/admin салона → start | Тот же флоу, без ограничений. |
| 7 | Прерванный wizard на шаге 3 | Возврат → `onboardingStep = 'specializations'` → открывается шаг 3. Сохранённые данные восстановлены. |
| 8 | Закрыл wizard, пошёл в `/master-dashboard` | Кабинет доступен; `published_at = NULL` → `MasterPage` 404 для других. В кабинете баннер «Опубликуйте профиль» со ссылкой в wizard. |
| 9 | Незалогинен → /master-onboarding/start | `RequireAuth` → `/login?redirect=...`. После OTP — обратно. |
| 10 | Publish без display_name | `422 missing_required { fields: ['displayName'] }` → шаг 1. |
| 11 | Publish без specializations | `422 missing_required { fields: ['specializations'] }` → шаг 2. |
| 12 | Повторный publish | No-op (`COALESCE` сохраняет первую дату). |
| 13 | Shadow с `is_active = false` | `start` игнорирует (фильтр `is_active = true`). Создаёт A0. Безопасно. |
| 14 | `/master/:id` для теневого | `404` (фильтр `published_at IS NOT NULL`). На `SalonPage` кнопка скрыта. |
| 15 | Salon-owner отвязывает мастера | `master_profiles` живёт независимо. `published_at` остаётся. |
| 16 | Удаление профиля мастером | Out of scope для этой фичи. |

## 9. Тестирование

### 9.1. Backend (Go)

**Unit:**

- `Start_NoProfile_CreatesNew`
- `Start_ShadowExists_ClaimsAndReturnsExisting`
- `Start_AlreadyMaster_ReturnsExisting`
- `Start_ShadowRaceCondition_Returns409`
- `Publish_MissingDisplayName_Returns422`
- `Publish_MissingSpecializations_Returns422`
- `Publish_AlreadyPublished_NoOp`
- `AdvanceStep_Monotonic_DoesNotRegress`

**Repository (на реальной БД):**

- Backfill миграции: фикстуры (claimed + shadow) → миграция → `published_at` selectively по `user_id IS NOT NULL`.
- `GetMasterProfilePublic` для shadow → `nil` (404).
- `ListSalonMastersPublic` для shadow → `isPublished = false`.

**Integration controller:**

- Happy path: `start → PUT /profile → publish → GET /api/v1/masters/:id` (200 для гостя).
- Negative: тот же сценарий без publish → `GET /api/v1/masters/:id` (404).

**Команда:** `cd backend && go test ./...`.

### 9.2. Frontend (TS)

- `npm run lint` (per AGENTS.md §4).
- Component tests, если test setup доступен:
  - Wizard открывается на шаге, соответствующем `onboardingStep`.
  - Кнопка «Опубликовать» disabled при пустых required-полях.
- E2E flow-runner scenario `master-self-onboarding`:
  1. Гост-логин по новому номеру → `/for-masters` → клик «Стать мастером».
  2. Wizard: шаги 1–2 заполнены, 3–4 пропущены, публикация.
  3. Гостевой `GET /master/:id` → 200, видны имя/специализации.

### 9.3. Регрессионная проверка

- [ ] Salon-claim продолжает работать (`/claim-salon` → admin approve).
- [ ] Auto-claim через OTP при логине мастера работает (теневой → `user_id`).
- [ ] `/master-dashboard` доступен для пре-существующих claimed профилей (благодаря backfill).
- [ ] `MasterPage` для пре-существующего published мастера → 200 (backfill сработал).
- [ ] `SalonPage` корректно отображает кнопку «Профиль мастера» для published, скрывает для shadow.
- [ ] `effectiveRoles.isMaster` становится true сразу после `start` (триггер ролей).

## 10. Документы для обновления

| Файл | Что добавить |
|---|---|
| `docs/vault/architecture/code-map.md` | Строка про master self-onboarding (новые endpoints, страница) |
| `docs/vault/architecture/db-schema.md` | Поля `published_at`, `onboarding_step` на `master_profiles` |
| `docs/vault/entities/master-profiles-salon-masters.md` | Раздел «Путь 4 — мастер регистрируется самостоятельно» |
| `docs/vault/entities/user-roles.md` | Уточнение: `isMaster` достижим через self-onboarding |
| `docs/vault/product/status.md` | Запись в «Последние изменения» |

## 11. Риски и mitigation

| Риск | Mitigation |
|---|---|
| Регрессия видимости теневых профилей на `/master/:id` | Это **намеренное** изменение (закрытие дыры приватности). Аудит показал одну точку во фронте: `SalonPage.tsx:444` — кнопка скрывается через `isPublished`. Mobile не использует прямую ссылку. |
| Race condition при одновременном claim shadow | `WHERE user_id IS NULL` в UPDATE; второй вызов получает понятную ошибку 409. |
| Спам фейк-профилями (без модерации) | Вне scope этого MVP. Если понадобится — позже добавим rate-limit на `start` или admin queue. |
| Backfill `onboarding_step = 'completed'` для существующих мастеров не учитывает их фактический прогресс | Не критично — `onboarding_step` влияет только на восстановление wizard-а. Existing мастера не открывают wizard, они идут в `/master-dashboard`. |
| `LoginPage` уже имеет `?redirect=` или нет | Явный пункт 7.4 — проверить и добавить, если нет. |
