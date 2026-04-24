---
title: agent prompt stage4 master cabinet
updated: 2026-04-24
source_of_truth: mirror
code_pointers: []
---

# Задача: Этап 4 — Кабинет мастера

## Контекст

Монорепо `beauty-marketplace`. После Этапов 1–3:
- `master_profiles` — независимый профиль, `user_id` nullable (NULL = теневой)
- `salon_masters.status`: `active` / `pending` / `inactive`
- OTP-авторизация технически работает, SMS не отправляется — код логируется в stderr. Для разработки: смотреть код в логах бэкенда и вводить вручную.
- Существующий auth-флоу: `POST /api/auth/otp/request` → `POST /api/auth/otp/verify` → JWT

Читай `AGENTS.md` и `CLAUDE.md`. После изменений: `go build ./...` + `go test ./...` + `npm run lint` + `npm run build`.

---

## Бэкенд

### 1. Claiming при OTP-верификации

Файл: `backend/internal/service/auth.go`, метод `VerifyOTP` (или аналог).

После успешной верификации OTP и создания/получения `users` записи — добавить claiming-логику:

```go
// После того как user создан или найден по phone_e164:
// Найти теневой master_profile с этим телефоном
shadowProfile, err := masterRepo.FindShadowByPhone(ctx, phoneE164)
if err == nil && shadowProfile != nil && shadowProfile.UserID == nil {
    _ = masterRepo.ClaimProfile(ctx, shadowProfile.ID, user.ID)
}
```

`FindShadowByPhone` — SELECT из `master_profiles` WHERE `phone_e164 = ? AND user_id IS NULL LIMIT 1`.
`ClaimProfile` — `UPDATE master_profiles SET user_id = ?, phone_e164 = ?, updated_at = now() WHERE id = ?`.

Если несколько теневых профилей с одним телефоном — брать самый ранний по `created_at`.
Claiming не блокирует авторизацию: ошибки логировать, не возвращать клиенту.

Новые методы добавить в `MasterPublicRepository` (файл уже есть) или создать отдельный `MasterRepository`.

### 2. Определение роли мастера

При `GET /api/auth/me` — добавить в ответ поле `masterProfileId *string`: UUID профиля если у пользователя есть `master_profiles.user_id = current_user.id`, иначе null.

Фронтенд использует это поле чтобы понять, показывать ли кнопку входа в кабинет мастера.

### 3. Новые эндпоинты `/api/v1/master-dashboard`

Новый файл: `backend/internal/controller/master_dashboard_controller.go`.
Новый сервис: `backend/internal/service/master_dashboard.go`.
Новый репозиторий (или расширение существующего): методы для кабинета мастера.

Все маршруты защищены `auth.RequireAuth`. Дополнительная проверка: `current_user` должен иметь `master_profiles` запись с `user_id = current_user.id` — иначе 403.

```
GET  /api/v1/master-dashboard/profile
PUT  /api/v1/master-dashboard/profile
GET  /api/v1/master-dashboard/invites          ← salon_masters WHERE master_id=my_profile AND status='pending'
POST /api/v1/master-dashboard/invites/:salonMasterId/accept
POST /api/v1/master-dashboard/invites/:salonMasterId/decline
GET  /api/v1/master-dashboard/salons           ← salon_masters WHERE master_id=my_profile AND status='active'
GET  /api/v1/master-dashboard/appointments     ← cross-salon записи
```

**GET /profile** — возвращает `master_profiles` текущего пользователя.

**PUT /profile** — обновляет: `display_name`, `bio`, `specializations`, `years_experience`, `avatar_url`. Нельзя менять `phone_e164` (readonly после claiming).

**GET /invites** — JOIN `salon_masters` → `salons`. Ответ:
```json
[{
  "salonMasterId": "uuid",
  "salonId": "uuid",
  "salonName": "Студия Аврора",
  "salonAddress": "ул. Тверская, 12",
  "createdAt": "..."
}]
```

**POST /invites/:id/accept** — проверить что `salon_masters.master_id = my_profile_id AND status='pending'`, затем `UPDATE SET status='active', joined_at=now()`.

**POST /invites/:id/decline** — `UPDATE SET status='inactive', left_at=now()`.

**GET /salons** — активные членства. Аналогично invites но `status='active'`, плюс поле `joinedAt`.

**GET /appointments** — записи мастера по всем салонам:
```sql
SELECT a.*, s.name as service_name, sal.name_override as salon_name
FROM appointments a
JOIN salon_masters sm ON a.salon_master_id = sm.id
JOIN services s ON a.service_id = s.id  
JOIN salons sal ON a.salon_id = sal.id
WHERE sm.master_id = :masterProfileId
ORDER BY a.starts_at DESC
LIMIT 50
```
Query params: `from`, `to`, `status`.

Зарегистрировать контроллер в `app.go` и `server.go`.

---

## Фронтенд

### 1. Обновить `authApi.ts` и `authSlice`

`GET /api/auth/me` теперь возвращает `masterProfileId`. Добавить поле в тип `AuthUser` и в `authSlice.user`. Это нужно для роутинга и показа кнопки кабинета мастера.

### 2. Новые роуты

В `routes.ts` добавить:
```ts
MASTER_DASHBOARD: '/master-dashboard',
MASTER_DASHBOARD_INVITES: '/master-dashboard/invites',
MASTER_DASHBOARD_PROFILE: '/master-dashboard/profile',
```

В `App.tsx` добавить `<Route path="/master-dashboard/*" element={<MasterDashboardPage />} />`.

Защита маршрута: если `authSlice.user.masterProfileId == null` — редирект на `/`. Аналог `RequireAuth` но для мастера.

### 3. Новый API-файл

`frontend/src/shared/api/masterDashboardApi.ts`:
```ts
getMyProfile(): Promise<MasterProfileDTO>
updateMyProfile(data: UpdateMasterProfileDTO): Promise<MasterProfileDTO>
getMyInvites(): Promise<MasterInviteDTO[]>
acceptInvite(salonMasterId: string): Promise<void>
declineInvite(salonMasterId: string): Promise<void>
getMySalons(): Promise<MasterSalonMembershipDTO[]>
getMyAppointments(params): Promise<DashboardAppointment[]>
```

### 4. Страница `/master-dashboard`

Новый файл: `frontend/src/pages/master-dashboard/ui/MasterDashboardPage.tsx`.

Секции через `?section=` аналогично дашборду салона:

**Секция `profile` (дефолтная):**
- Аватар (инициалы + цвет первого салона), имя крупно
- Форма редактирования: `display_name`, `bio` (multiline, 300 символов), `specializations` (chips из `SPECIALIZATION_PRESETS`), `years_experience`
- Телефон — readonly, пометка «Используется для входа»
- Кнопка «Сохранить» → PUT

**Секция `invites`:**
- Список входящих приглашений
- Каждая карточка: название салона, адрес, дата приглашения
- Кнопки «Принять» и «Отклонить» (с confirm на отклонение)
- Если список пуст — пустое состояние «Нет входящих приглашений»

**Секция `salons`:**
- Список активных членств
- Карточка: название салона, адрес, дата прихода, ссылка «Открыть страницу» → `/salon/:id`

**Секция `appointments`:**
- Таблица записей: дата, время, салон, услуга, клиент (имя), статус
- Фильтр по статусу, по дате (from/to)
- Простой список без редактирования — мастер только смотрит

**Навбар / переключение кабинетов:**

Если пользователь одновременно `salon_owner` И мастер — в NavBar показывать два варианта: «Кабинет салона» и «Кабинет мастера». Если только мастер — одна кнопка.

Стилизация: использовать стандартную тему дашборда (`useDashboardPalette()`), структуру аналогичную `DashboardPage.tsx` — боковой список секций + основной контент.

### 5. Первичная настройка профиля (onboarding)

Если мастер только что зарегистрировался и у него нет `bio` и `specializations` — показать баннер вверху с призывом заполнить профиль: «Заполните профиль, чтобы салоны могли вас найти». Клик → scroll/redirect к форме профиля. Баннер скрывается когда `bio != null && specializations.length > 0`.

---

## Stop-list

- ❌ Не подключать реальную SMS/Telegram отправку OTP
- ❌ Не делать `master_services` CRUD (личный каталог услуг мастера) — следующий этап
- ❌ Не делать портфолио и загрузку фото — позже
- ❌ Не трогать дашборд салона (`/dashboard/*`)
- ❌ Не менять публичные эндпоинты `/api/v1/masters/*` и `/api/v1/salons/*`

---

## Результат

- При OTP-верификации: теневой `master_profile` с совпадающим телефоном автоматически привязывается к `user_id`.
- `GET /api/auth/me` возвращает `masterProfileId` если у пользователя есть профиль мастера.
- `/master-dashboard` — доступна авторизованным пользователям с `masterProfileId`.
- Мастер видит входящие инвайты, может принять/отклонить.
- Мастер видит свои активные салоны и записи по всем салонам.
- Мастер редактирует bio, специализации, стаж.
- `go build ./...` OK, `go test ./...` OK, `npm run build` OK.
