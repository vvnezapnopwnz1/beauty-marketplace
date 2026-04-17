# Задача: Этап 2 — Профили мастеров в дашборде

## Контекст

Монорепо `beauty-marketplace`. После Этапа 1 в БД существуют:
- `master_profiles` — независимый профиль мастера (поля: `display_name`, `bio`, `avatar_url`, `specializations TEXT[]`, `phone_e164`, `years_experience`)
- `master_services` — личный каталог услуг мастера
- `salon_masters` — таблица членства (бывший `staff`), теперь с FK `master_id → master_profiles.id`
- `salon_master_services` — услуги мастера в конкретном салоне, с `price_override_cents` и `duration_override_minutes`

Бэкенд: Go + Uber Fx + GORM + PostgreSQL. Фронт: React + MUI + `dashboardApi.ts`.
Читай `AGENTS.md` и `CLAUDE.md` перед началом. После изменений: `go build ./...` + `go test ./...` + `npm run lint` + `npm run build`.

---

## Цели этапа

1. Бэкенд: обогатить существующие эндпоинты данными `master_profile`, добавить эндпоинт редактирования профиля.
2. Бэкенд: переименовать URL `/staff` → `/salon-masters` с сохранением старых путей как алиасов (deprecated).
3. Бэкенд: invite-флоу — поиск мастера по телефону + создание приглашения.
4. Фронт: форма мастера получает поля профиля (bio, специализации, override цены/длительности на услугу).
5. Фронт: обновить типы и вызовы в `dashboardApi.ts` под новые URL и поля.

---

## Бэкенд

### 1. Обогатить GET /api/v1/dashboard/salon-masters (бывший /staff)

Эндпоинт должен возвращать `master_profile` вложенным объектом:

```json
{
  "id": "uuid",
  "displayName": "Анна",
  "color": "#D8956B",
  "isActive": true,
  "masterProfile": {
    "id": "uuid",
    "bio": "...",
    "specializations": ["colorist", "haircut"],
    "avatarUrl": null,
    "yearsExperience": 5
  },
  "services": [
    {
      "serviceId": "uuid",
      "serviceName": "Стрижка",
      "priceOverrideCents": null,
      "durationOverrideMinutes": null
    }
  ]
}
```

В репозитории: JOIN `salon_masters` → `master_profiles` + LEFT JOIN `salon_master_services` → `services`.

### 2. PUT /api/v1/dashboard/salon-masters/:id — обновление мастера

Принимает все поля `salon_masters` (displayName, color, isActive) **плюс** поля профиля (bio, specializations, yearsExperience). Обновляет обе таблицы в одной транзакции. Если `masterProfile.user_id IS NOT NULL` — поля профиля редактирует только сам мастер (пока просто пропускаем обновление profile-полей в этом случае, без ошибки).

### 3. PUT /api/v1/dashboard/salon-masters/:id/services — назначить услуги мастеру

Заменяет весь список `salon_master_services` для данного `salon_master_id`. Тело:

```json
[
  { "serviceId": "uuid", "priceOverrideCents": 150000, "durationOverrideMinutes": null }
]
```

`null` = использовать значение из `services` (salon-level). Upsert через `ON CONFLICT`.

### 4. Invite-флоу

`GET /api/v1/dashboard/masters/lookup?phone=+7...`
- Ищет `master_profiles` по `phone_e164`. Возвращает `{ found: true, profile: {...} }` или `{ found: false }`.
- Нужен для: пригласить уже зарегистрированного мастера вместо создания теневого профиля.

`POST /api/v1/dashboard/master-invites`
```json
{ "masterProfileId": "uuid" }
```
- Создаёт строку в `salon_masters` с `is_active: false`, `joined_at: null` (ожидает принятия мастером). Пока без уведомлений — просто создаёт запись. Возвращает созданный `salon_master`.

> Таблица `master_invites` НЕ нужна — инвайт это просто `salon_masters` запись со статусом `pending`. Добавь в `salon_masters` поле `status ENUM('active','pending','inactive') DEFAULT 'active'` через новую миграцию `000013_salon_master_status.up.sql`.

### 5. Deprecated алиасы

В роутере зарегистрировать старые пути как алиасы на те же хендлеры:
```
/api/v1/dashboard/staff        → тот же хендлер что /salon-masters
/api/v1/dashboard/staff/:id    → тот же хендлер что /salon-masters/:id
```
Это нужно чтобы фронт не сломался до момента обновления.

### 6. Обновить поле json:"staff_id" → json:"salon_master_id" в Appointment

Убрать тег `json:"staff_id"` с `Appointment.SalonMasterID`. Теперь JSON-поле называется `salonMasterId` (camelCase через стандартный GORM/encoding). Обновить все места на фронте где читается `staff_id` в appointment.

---

## Фронтенд

### 1. Обновить dashboardApi.ts

- Типы: добавить `MasterProfile { bio, specializations, avatarUrl, yearsExperience }` вложенным в `SalonMaster`.
- Функции: `updateSalonMaster(id, data)` → `PUT /api/v1/dashboard/salon-masters/:id`.
- Функции: `updateMasterServices(id, services[])` → `PUT /api/v1/dashboard/salon-masters/:id/services`.
- Функции: `lookupMasterByPhone(phone)` → `GET /api/v1/dashboard/masters/lookup`.
- Функции: `createMasterInvite(masterProfileId)` → `POST /api/v1/dashboard/master-invites`.
- URL вызовов `/staff` → `/salon-masters` (кроме мест, где явно нужен deprecated путь).

### 2. Форма создания/редактирования мастера

Файл: `frontend/src/pages/dashboard/ui/modals/` — добавить или обновить форму мастера.

**Два режима создания** (табы или радио-кнопки):
- **«Новый мастер»** — форма как сейчас (имя, цвет, услуги).
- **«Пригласить по телефону»** — поле ввода телефона, кнопка «Найти», показывает найденный профиль, кнопка «Пригласить».

**Расширенная форма (оба режима):** добавить секцию «Профиль мастера» с полями:
- `bio` — TextField multiline, до 300 символов
- `specializations` — ChipInput или мультиселект из предустановленного списка (колорист, nail-мастер, стилист, бровист, массажист, барбер — хардкоженный список для MVP)
- `yearsExperience` — число, опционально

**Услуги мастера:** список назначенных услуг в форме с возможностью для каждой указать override цены и длительности. Используй существующую логику сервисов в дашборде.

### 3. Карточка мастера в дашборде (/dashboard/staff/:id)

Текущий файл: найди по роуту `/dashboard/staff/:staffId`. Добавить:
- Отображение `bio` если заполнен
- Chips специализаций
- В разделе «Услуги» — показывать цену override если задана (иначе цену из salon_services)

### 4. Appointment fields

Найти все обращения к `.staff_id` или `["staff_id"]` в компонентах дашборда и заменить на `.salonMasterId` (после снятия deprecated json-тега).

---

## Стоп-лист

- ❌ Не делать публичную страницу мастера (`/master/:id`) — это Этап 3
- ❌ Не трогать `SalonPage.tsx` — мастера там ещё мок, это тоже Этап 3
- ❌ Не добавлять уведомления об инвайте (Telegram/SMS) — пока только запись в БД
- ❌ Не делать кабинет самого мастера (`/master-dashboard`) — это Этап 4
- ❌ Не переименовывать `master_services` → `salon_services` или другие таблицы

---

## Результат

- `GET /api/v1/dashboard/salon-masters` возвращает мастеров с вложенным `masterProfile`.
- Форма мастера в дашборде имеет поля bio, специализации, invite-by-phone.
- Override цены/длительности на услугу задаётся в форме и сохраняется.
- Старые URL `/staff/*` работают как алиасы.
- `go build ./...` OK, `go test ./...` OK, `npm run build` OK.
