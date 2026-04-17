# Статус разработки — Beauty Marketplace

> Дата: 2026-04-17 | Версия: pre-MVP (v0.1)

### Последние изменения (2026-04-17)

- **Этап 4 — кабинет мастера:** при успешной OTP-верификации теневой `master_profiles` (`user_id IS NULL`, тот же `phone_e164`, самый ранний по `created_at`) автоматически привязывается к пользователю (`ClaimMasterProfile`). `GET /api/auth/me` и ответ `verify` включают `masterProfileId` (UUID или отсутствует). API кабинета под префиксом **`/api/v1/master-dashboard/`** (JWT + строка `master_profiles` с `user_id = текущий пользователь`, иначе 403): `GET|PUT /profile`, `GET /invites`, `POST /invites/:salonMasterId/accept|decline`, `GET /salons`, `GET /appointments?from=&to=&status=`. Реализация: `master_dashboard_repository.go`, `service/master_dashboard.go`, `controller/master_dashboard_controller.go`, доработка `service/auth.go`, регистрация в `app.go` / `server.go`. Фронт: `masterDashboardApi.ts`, `/master-dashboard` (`MasterDashboardPage.tsx`, секции `?section=profile|invites|salons|appointments`), защита без `masterProfileId` → редирект на `/`, `AuthBootstrap` + поле `masterProfileId` в `authApi`/`authSlice`, в `NavBar` — «Кабинет салона» (роль `salon_owner`) и/или «Кабинет мастера». См. `docs/agent-prompt-stage4-master-cabinet.md`.
- **Дашборд — страница мастера и drawer’ы:** `/dashboard/staff/:staffId` (`StaffDetailView.tsx`): шапка с аватаром (цвет мастера), статус `active`/`pending`/`inactive`, bio и специализации, кнопки «Редактировать» / «Деактивировать» (confirm + `DELETE .../salon-masters/:id` как в форме), таблица услуг с базовой и эффективной ценой/длительностью, «Настроить услуги» открывает `StaffFormModal`; недельное расписание из `GET .../salon-masters/:id/schedule`, правка — `ScheduleDrawer` → `PUT` того же bundle; ближайшие записи — `GET .../appointments?salon_master_id=&from=&page_size=5`, клик — `AppointmentDrawer`. Список записей (`DashboardAppointments.tsx`) использует тот же `AppointmentDrawer` вместо модалки редактирования; создание новой записи по-прежнему в модалке. См. `docs/agent-prompt-dashboard-master-page-drawer.md`.
- **Этап 3 — публичный профиль мастера:** без JWT: `GET /api/v1/salons/:salonId/masters` (активные `salon_masters` + опционально `master_profiles`, услуги с `effectivePriceCents`), `GET /api/v1/masters/:masterProfileId` (профиль + активные салоны и названия услуг; `headerCalendarColor` — цвет первого членства). Реализация: `master_public_repository.go`, `service/master_public.go`, `SalonController` + `MasterController`, маршрут в `server.go`. Фронт: `fetchSalonMasters` / `fetchMasterProfile` в `salonApi.ts`, страница `/master/:masterProfileId` (`MasterPage.tsx`), вкладка «Мастера» на `SalonPage` с реальными данными для UUID-салона (для `/place/...` и mock-id секция скрыта). См. `docs/agent-prompt-stage3-master-public.md`.

### Последние изменения (2026-04-16)

- **Этап 2 — мастера в дашборде:** миграция `000013_salon_master_status` (enum `active` / `pending` / `inactive` на `salon_masters`). API: основной путь `/api/v1/dashboard/salon-masters` (+ deprecated `/staff`), `GET/PUT` с вложенным `masterProfile` и списком услуг с `priceOverrideCents` / `durationOverrideMinutes`, `PUT .../:id/services`, `GET /masters/lookup?phone=`, `POST /master-invites`. Записи в JSON: `salonMasterId`. Фронт: `dashboardApi.ts`, форма мастера (новый / пригласить по телефону, профиль, оверрайды услуг), карточка мастера, календарь и список записей. См. `docs/agent-prompt-stage2-master-dashboard.md`, `docs/master_profiles_salon_masters.md`.
- **Тема и кабинет:** семантическая палитра дашборда вынесена в `theme.palette.dashboard` (`frontend/src/shared/theme/dashboardPalette.ts`, `getDashboardPalette`), типы расширены через `mui-augmentation.d.ts`. Компоненты дашборда переведены на `useDashboardPalette()` / `useDashboardListCardSurface()` вместо статического `mocha.ts` где это затронуто; общие стили форм — `formStyles.ts`, переиспользуемые блоки — `ui/components/formComponents.tsx`.
- **Главная (поиск):** блок Hero на `SearchPage` использует **светлый** градиент (cream → blush) в **светлой** теме и прежний тёмный Warm Mocha-градиент в **тёмной**; текст и бейдж берутся из брендовых `COLORS` (`ink` / `inkSoft` / `accent`). `SearchBar` переключает «таблетку» поиска: светлая пилюля в light, тёмная — в dark.
- **Календарь дашборда:** реализованы все 8 задач из `docs/calendar-upgrade-prompt.md` — красная линия текущего времени (NowLine), штриховка нерабочего времени и выходных, блоки перерывов мастеров, аватарки с цветом в шапке колонок, 3-строчные блоки событий с длительностью, клик по дню в «Неделе» → «День», индикаторы загруженности в «Месяце», расширенная модалка деталей записи. Светлая тема: `calendarEventLightTextColors`.
- **Документация:** синхронизированы `docs/status.md`, `docs/architecture.md`; в `backend/internal/requestid/context.go` добавлен пакетный комментарий к заголовкам корреляции.

---

## 1. Сущности и связи

### Персистентные сущности (хранятся в PostgreSQL)

#### Salon

Центральная сущность. Наш агрегат с UUID + обогащённые данные поверх внешних геосервисов.

| Поле                   | Тип                 | Описание                                                  |
| ---------------------- | ------------------- | --------------------------------------------------------- |
| `id`                   | UUID                | Наш внутренний идентификатор                              |
| `ExternalIDs`          | `map[string]string` | Источник → внешний ID: `{"2gis": "...", "yandex": "..."}` |
| `NameOverride`         | `*string`           | Переопределение названия (приоритет над 2GIS)             |
| `AddressOverride`      | `*string`           | Переопределение адреса                                    |
| `Timezone`             | `string`            | Таймзона салона, default `Europe/Moscow`                  |
| `OnlineBookingEnabled` | `bool`              | Включена ли онлайн-запись                                 |
| `CategoryID`           | `*string`           | Категория: `hair`, `nails`, `spa`, `barber` и др.         |
| `BusinessType`         | `*string`           | `venue` (заведение) или `individual` (мастер)             |
| `Lat`, `Lng`           | `*float64`          | Координаты                                                |
| `Address`, `District`  | `*string`           | Адрес и район                                             |
| `PhotoURL`             | `*string`           | Главное фото                                              |
| `Badge`                | `*string`           | UI-бейдж: `popular`, `top`, `new`                         |
| `CardGradient`         | `*string`           | Тема карточки: `bg1`..`bg6`                               |
| `Emoji`                | `*string`           | Эмодзи-иконка                                             |
| `CachedRating`         | `*float64`          | Рейтинг на нашей платформе                                |
| `CachedReviewCount`    | `*int`              | Количество наших отзывов                                  |

#### SalonExternalID

Связывает один салон с N внешними геосервисами (2GIS, Yandex, Google и т.д.).

| Поле                  | Описание                                                          |
| --------------------- | ----------------------------------------------------------------- |
| `salon_id` + `source` | Composite PK                                                      |
| `external_id`         | ID во внешнем сервисе                                             |
| `meta JSONB`          | Произвольные поля: `booking_url`, `rating_snapshot`, промо-ссылки |
| `synced_at`           | Когда последний раз синхронизировались                            |

UNIQUE `(source, external_id)` — один внешний объект не может ссылаться на два наших салона.

#### SalonService (таблица `services`)

Услуги салона — то, на что можно записаться.

| Поле               | Описание                                                                 |
| ------------------ | ------------------------------------------------------------------------ |
| `salon_id`         | FK → salons                                                              |
| `name`             | Название услуги                                                          |
| `duration_minutes` | Длительность                                                             |
| `price_cents`      | Цена в копейках (nullable — "по договорённости")                         |
| `sort_order`       | Порядок отображения                                                      |
| `is_active`        | Показывать ли в листинге                                                 |
| `category`         | Legacy-текст / группа (часто `parent_slug` или свободная метка)          |
| `category_slug`    | Ссылка на системную строку `service_categories.slug` (см. миграции 010+) |
| `description`      | Описание (миграция 009+)                                                 |

Связь **мастер ↔ услуга**: таблица `staff_services` (N:N), см. миграция `000009_dashboard_extended`.

#### ServiceCategory (таблица `service_categories`)

Справочник «папок» услуг для дашборда (не путать с рубриками 2GIS). Сид: 72 системные строки (`salon_id IS NULL`). Подробная матрица slug — в [service-categories.md](service-categories.md).

| Поле          | Описание                                              |
| ------------- | ----------------------------------------------------- |
| `slug`        | Уникален среди системных (`salon_id IS NULL`)       |
| `parent_slug` | Группа (hair, nails, barbershop, …)                   |
| `name_ru`     | Отображаемое имя                                    |
| `salon_id`    | NULL = системная; зарезервировано под кастом салона |

#### Salon (доп. поля кабинета)

| Поле                    | Описание                                                                 |
| ----------------------- | ------------------------------------------------------------------------ |
| `salon_type`            | Тип заведения (например `hair_salon`) — фильтр списка категорий в форме услуги |
| `slot_duration_minutes` | Шаг слота для расчётов расписания (15–240 мин), default 30             |

#### User

Клиент, владелец салона, мастер или администратор. Авторизация по телефону.

| Поле           | Описание                                                     |
| -------------- | ------------------------------------------------------------ |
| `phone_e164`   | Телефон в E.164 формате, unique                              |
| `display_name` | Имя (заполняется пользователем)                              |
| `global_role`  | `client` / `salon_owner` / `master` / `advertiser` / `admin` |

#### OtpCode + RefreshToken

Инфраструктура авторизации. OTP: 4 цифры, TTL 5 минут. RefreshToken: 30 дней, хранится как SHA256-хеш.

#### Appointment

Запись на услугу. Поддерживает как зарегистрированных пользователей, так и гостей.

| Поле                             | Описание                                                  |
| -------------------------------- | --------------------------------------------------------- |
| `salon_id`, `service_id`         | FK → salons, services                                     |
| `client_user_id`                 | FK → users (NULL для гостей)                              |
| `guest_name`, `guest_phone_e164` | Данные гостя (заполняются если нет user_id)               |
| `salon_master_id`                | FK → salon_masters (необязательно)                      |
| `starts_at`, `ends_at`           | Время записи                                              |
| `status`                         | `pending → confirmed → completed / cancelled_* / no_show` |
| `client_note`                    | Пожелания клиента                                         |

DB constraint: либо `client_user_id`, либо `(guest_name + guest_phone_e164)` — не оба и не ни одного.

#### SalonMaster (таблица `salon_masters`) / SalonMember / WorkingHour

- **SalonMaster** — членство мастера в салоне: `display_name`, цвет календаря, `is_active`, `status` (`active` / `pending` / `inactive`), FK `master_id` → `master_profiles`, связь услуг через `salon_master_services` (в т.ч. override цены и длительности)
- **SalonMember** — связь user ↔ salon с ролью `owner` или `admin`
- **WorkingHour** — расписание по дням недели (day_of_week 0-6, opens_at, closes_at)

#### SalonSubscription

Подписка салона на платформу. Plan: `free` / `paid`. Status: `trial` / `active` / `expired`. Поля под будущий payment provider.

#### Review, WaitlistEntry _(схема есть, функционал не реализован)_

- **Review** — один отзыв на одну запись (rating 1-5, body, ответ владельца)
- **WaitlistEntry** — лист ожидания: пользователь + салон + желаемые даты

---

### In-memory сущности (не хранятся в БД)

#### PlaceItem / PlaceDetail

DTO с данными из 2GIS. Используются только внутри запроса, никогда не персистируются (ограничение лицензии API).

```
PlaceItem: externalId, name, address, lat/lon, photoUrl, rating, reviewCount, rubricNames[]
PlaceDetail: + description, orgName, weeklySchedule[], contacts[], photoUrls[]
```

---

### Диаграмма связей

```
salons ──────────────── salon_external_ids
  │  1:N (source → external_id + meta JSONB)
  │
  ├──1:N── services (salon_services)
  │
  ├──1:N── working_hours
  │
  ├──1:N── salon_masters ──N:1── master_profiles (опционально)
  │
  ├──1:N── salon_members ──N:1── users
  │
  ├──1:N── salon_subscriptions
  │
  └──1:N── appointments ──N:1── users (или гость)
                │
                └──N:1── services
                │
                └──N:1── salon_masters (опционально)
                │
                └──1:1── reviews (post-MVP)

users ──1:N── otp_codes
      ──1:N── refresh_tokens
      ──1:N── waitlist_entries (post-MVP)
      ──1:1── user_telegram_identities (post-MVP)
```

---

## 2. Геосервисы

### Текущее состояние

Реализован один адаптер — **2GIS Catalog API 3.0**.

Архитектура: интерфейс `PlacesProvider` в `service/` → реализация `CatalogAdapter` в `infrastructure/twogis/`. Это позволяет добавить Yandex, Google и другие без изменения бизнес-логики.

```
PlacesService
    └── PlacesProvider (interface)
            └── CatalogAdapter (2GIS)   ← единственная реализация сейчас
```

### Как работает 2GIS

**Поиск** (`GET /api/v1/places/search`):

- Запрос: `q`, `lat`/`lon`, `radius` (м), `page`, `page_size`, `locale`
- Вызывает `https://catalog.api.2gis.com/3.0/items` с `type=branch`
- Возвращает: список PlaceItem + total count

**Детали** (`GET /api/v1/places/item/{externalId}`):

- Те же поля + расписание, контакты, все фото, описание

**Ограничения:**

- Данные НЕ кешируются в БД (лицензия)
- Иногда `point: null` → lat/lon = 0 (известная проблема)
- Pagination через 2GIS (не наша БД)

### Как связаны 2GIS и наши салоны

Связь через `salon_external_ids`:

```sql
INSERT INTO salon_external_ids (salon_id, source, external_id, meta)
VALUES ('<наш UUID>', '2gis', '<2GIS ID>', '{"booking_url": "..."}');
```

Поле `meta JSONB` готово для хранения специфичных для источника данных — например, `booking_url` из Yandex Business (поле `CompanyMetaData.Links[].href` с `type=="online-registration"`).

### Roadmap геосервисов

| Сервис      | Статус       | Примечание                            |
| ----------- | ------------ | ------------------------------------- |
| 2GIS        | ✅ Работает  | Тест 2026-04-04, 12к+ результатов     |
| Yandex Maps | ❌ Не начато | Интерфейс готов, нужен второй адаптер |
| Google Maps | ❌ Не начато | Низкий приоритет для РФ рынка         |

---

## 3. Связь фронтенда с бекендом

### API-файлы на фронтенде

| Файл           | Базовый URL                  | Покрытые эндпоинты                                                                                       |
| -------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `authApi.ts`   | `VITE_API_URL`               | `/api/auth/otp/request`, `/api/auth/otp/verify`, `/api/auth/refresh`, `/api/auth/me`, `/api/auth/logout` |
| `salonApi.ts`  | `VITE_API_BASE`              | `GET /v1/salons`, `GET /v1/salons/{id}`, `POST /v1/salons/{id}/bookings`                                 |
| `placesApi.ts` | `publicApiUrl` → `/api/v1/…` | `GET /api/v1/places/search`, `GET /api/v1/places/item/{id}`                                              |
| `searchApi.ts` | `publicApiUrl` → `/api/v1/…` | `GET /api/v1/search` (unified: 2GIS + обогащение из БД), infinite scroll                                 |
| `geoApi.ts`    | `publicApiUrl` → `/api/v1/…` | `GET /api/v1/geo/region`, `/geo/cities`, `/geo/reverse`                                                  |

### Что подключено реально

| Функция                                 | Статус                                                                                                                                                                                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Авторизация (OTP + JWT)                 | ✅ Полностью подключена                                                                                                                                                                                                                        |
| Обновление токена (auto-refresh on 401) | ✅ Реализовано                                                                                                                                                                                                                                 |
| Профиль пользователя (`/api/auth/me`)   | ✅ Подключён                                                                                                                                                                                                                                   |
| Поиск мест через 2GIS                   | ✅ Подключён (`placesApi.ts`), в т.ч. как fallback с главной                                                                                                                                                                                   |
| Unified поиск на главной                | ✅ `searchApi.ts` → `GET /api/v1/search`; при ошибке — fallback на `placesApi` и режим «только 2GIS»                                                                                                                                           |
| Детальная страница салона (`SalonPage`) | ✅ Dual-mode: `/salon/:id` (platform) и `/place/:externalId` (2GIS), с auto-redirect через `GET /api/v1/salons/by-external`                                                                                                                  |
| Гостевая запись                         | ✅ `GuestBookingDialog` → `POST /v1/salons/{id}/bookings`                                                                                                                                                                                      |
| **Dashboard**                           | ✅ API `GET/POST/PATCH/PUT/DELETE /api/v1/dashboard/...` (JWT + членство в салоне); UI: обзор, календарь (день/неделя/месяц), список записей с редактированием, услуги с категориями, мастера, расписание, профиль. Доступ: `staff.dashboard_access` и/или роль в `salon_members` — см. `docs/seed-dashboard-access.sql` |
| Список всех салонов (`GET /v1/salons`)  | ⚠️ Эндпоинт есть; главная использует unified search, не этот список                                                                                                                                                                            |

### Переменные окружения фронтенда

```env
VITE_API_URL=http://localhost:8080     # для auth
VITE_API_BASE=http://localhost:8080    # для salon API
```

### Стек фронтенда

- **React + Vite** (dev server: localhost:5173/5174)
- **Redux Toolkit** — `searchSlice` (категория, сортировка, чипы фильтров), `authSlice`, `locationSlice` (город, геолокация устройства)
- **Material-UI** — UI-компоненты, кастомная тема (бренд: ink, accent, sage, blush, cream; для `/dashboard` — `palette.dashboard` и хук `useDashboardPalette`)
- **react-hook-form + yup** — формы с валидацией
- **react-i18next** — i18n (ru_RU)
- **framer-motion** — анимации

---

## 4. Что реализовано

### ✅ Готово и работает

**Бекенд:**

- БД: PostgreSQL, миграции `000001` и далее (в т.ч. `000009` dashboard/staff/services, `000010` service_categories + `salon_type`, `000011` sync), schema production-ready
- Архитектура: Clean Architecture с Uber Fx DI
- Auth: OTP (4 цифры, 5 мин) + JWT (access 15 мин, refresh 30 дней)
- 2GIS: поиск и детали работают (подтверждено тестом 2026-04-04)
- Salon API: `GET /v1/salons`, `GET /v1/salons/{id}`, `POST /v1/salons/{id}/bookings`
- Гостевые записи: без регистрации (имя + телефон)
- Health check: `GET /health`
- CORS middleware

**Фронтенд:**

- Роутинг: `/`, `/salon/:id`, `/place/:externalId`, `/login`, `/dashboard`
- Auth flow: Phone → OTP → JWT tokens в localStorage
- **SearchPage**: unified search + fallback 2GIS; режимы список/карта; bento-сетка (`SearchResultCard`: normal / featured-vertical / featured-horizontal); пять градиентов медиа на батч из 5 карточек (`entities/search/lib/bentoGradients.ts`); горизонтальный featured — вторая ячейка в ряду (1 колонка + 2 колонки); в режиме списка — колонка с промо (`PromoBanner`); скелетоны загрузки
- Карточки: `SearchResultCard`, PlaceCard, SalonCard
- Гостевой букинг: диалог с валидацией
- i18n: полный русский перевод
- Гео: выбор города, синхронизация координат, `geoApi` для региона/городов

### ⚠️ Частично готово

| Компонент    | Что сделано                                           | Что осталось                                                                   |
| ------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| OTP-доставка | Логика генерации/верификации                          | SMS/Telegram реально не отправляет (только stderr)                             |
| SearchPage   | Unified API + 2GIS fallback, фильтры, карта, bento UI | Дожать фильтры (часть чипов в `FilterRow` без бэкенда), polish карты           |
| SalonPage    | Dual-mode загрузка, lookup `by-external`, UI parity (hero/карточки/типографика), расписание и контакты из API | Отзывы/промо/фото-секции скрыты фичефлагами до появления API                    |
| Dashboard    | Записи CRUD, календарь (день/неделя/месяц) с расписанием мастеров, перерывами, NowLine, аватарками, детальной модалкой; услуги с `category_slug`; мастера: `master_profiles` + `salon-masters`, оверрайды услуг, lookup/invite | Drag-drop перенос записей, напоминания, конфликты слотов, кастомные `service_categories` на салон |

### ❌ Не начато

- SMS-провайдер (SMSC, МТС Exolve и др.)
- Записи через Yandex Business (кнопка "Записаться")
- Публичная витрина мастера `/master/:id` и полноценный кабинет мастера (принятие инвайтов и т.д.) — Этап 3–4
- Эндпоинты отзывов (схема в БД есть)
- Подписки и оплата (ЮКасса, СБП)
- Telegram-бот для уведомлений
- Yandex Maps адаптер
- Production деплой (Docker/K8s, CI/CD)
- React Native мобильное приложение

---

## 5. Куда двигаться дальше

### Приоритет 1 — MVP для реальных пользователей

**1. OTP-доставка** — без этого нельзя онбордить реальных пользователей.

- Подключить SMS: SMSc.ru, МТС Exolve, или Telegram Bot API
- Нужно: новый интерфейс `OTPSender` в `service/`, реализация в `infrastructure/`

**2. Заполнить БД реальными салонами**

- Написать скрипт/команду: запрос к 2GIS → вставка в `salons` + `salon_external_ids`
- Без данных поиск на платформе пустой

**3. ~~Подключить SearchPage к бекенду~~** — сделано через `GET /api/v1/search` + fallback 2GIS

- Дальше: полная поддержка всех фильтров на бэкенде, ранжирование, кэш-политики при необходимости

**4. Dev-проверка салонной страницы (новое)**

- Добавлен seed-файл: `backend/migrations/dev_seed_salon_place.sql`
- Добавлена команда: `make seed-salon-page-dev`
- Покрываемые сценарии:
  - `http://localhost:5173/salon/11111111-1111-1111-1111-111111111111`
  - `http://localhost:5173/place/141373143068690` (redirect case)

### Приоритет 2 — Ценность для салонов

**4. Личный кабинет владельца**

- Базовые эндпоинты и UI на `/api/v1/dashboard` и `/dashboard` уже есть (см. §7)
- Дальше: аналитика, уведомления, конфликты слотов, drag-drop на календаре

**5. Отзывы и рейтинг**

- Схема и модели готовы (`reviews`, `waitlist_entries`)
- Нужно: `POST /api/v1/appointments/{id}/review`, агрегация в `cached_rating`

### Приоритет 3 — Рост и монетизация

**6. Подписки и оплата** — ЮКасса или СБП, webhook на смену статуса

**7. Yandex Maps адаптер** — второй `PlacesProvider`; интерфейс уже есть

**8. Telegram-бот** — уведомления о записях, напоминания

---

## 6. Технический долг и риски

| Проблема                                     | Критичность | Решение                             |
| -------------------------------------------- | ----------- | ----------------------------------- |
| `JWT_SECRET = "dev-secret-change-me"`        | 🔴 Критично | Ротировать перед любым prod-деплоем |
| OTP не отправляется                          | 🔴 Критично | Подключить SMS-провайдера           |
| Нет rate limiting на `/api/auth/otp/request` | 🟡 Важно    | Добавить Redis + rate limiter       |
| CORS разрешает `*`                           | 🟡 Важно    | Ограничить на конкретные домены     |
| lat/lon = 0 для части 2GIS-результатов       | 🟡 Важно    | Дебаггинг запросов к 2GIS API       |
| Нет error tracking (Sentry и т.п.)           | 🟠 Средне   | Добавить перед beta                 |
| Booking slot = "завтра 10:00" (заглушка) в гостевом флоу | 🟠 Средне | В кабинете слот задаётся явно; гостевой `BookingService` всё ещё упрощён |

---

## 7. Кабинет салона: модули для постановки задач агенту

Ниже — что уже есть в коде и что логично уточнять в ТЗ.

### Услуги и категории

- **Бэкенд:** `PUT/POST/DELETE /api/v1/dashboard/services`, `GET /api/v1/dashboard/service-categories` (+ опция полного списка), валидация `category_slug` против справочника; профиль салона отдаёт/принимает `salonType` для фильтрации категорий.
- **Фронт:** [ServicesView.tsx](frontend/src/pages/dashboard/ui/views/ServicesView.tsx), [ServiceFormModal.tsx](frontend/src/pages/dashboard/ui/modals/ServiceFormModal.tsx), [salonTypeOptions.ts](frontend/src/pages/dashboard/lib/salonTypeOptions.ts), клиент [dashboardApi.ts](frontend/src/shared/api/dashboardApi.ts).
- **Док спеки slug:** [service-categories.md](service-categories.md).
- **Идеи задач:** кастомные категории на салон; импорт/дублирование услуг; связь с поиском маркетплейса (`search` / `SalonService` projection).

### Записи (список)

- **Фронт:** [DashboardAppointments.tsx](frontend/src/pages/dashboard/ui/DashboardAppointments.tsx) — фильтр по дате, поиск, статусы, **двойной щелчок по строке** открывает редактирование.
- **API:** `PUT /api/v1/dashboard/appointments/:id` (время, услуга, мастер, комментарий, гость при необходимости), `PATCH .../status`, `POST` создание.
- **Идеи задач:** перенос drag-and-drop; массовые операции; экспорт.

### Календарь

- **Фронт:** [DashboardCalendar.tsx](frontend/src/pages/dashboard/ui/DashboardCalendar.tsx); сетки [CalendarDayStaffGrid.tsx](frontend/src/pages/dashboard/ui/CalendarDayStaffGrid.tsx), [CalendarWeekGrid.tsx](frontend/src/pages/dashboard/ui/CalendarWeekGrid.tsx), [CalendarMonthGrid.tsx](frontend/src/pages/dashboard/ui/CalendarMonthGrid.tsx); геометрия времени [calendarGridUtils.ts](frontend/src/pages/dashboard/lib/calendarGridUtils.ts) — таймлайн 08:00–21:59, высота блока из `endsAt - startsAt`, пересечения в колонке — несколько колонок ширины.
- **Реализовано (все 8 задач из `docs/calendar-upgrade-prompt.md`):**
  - Красная линия текущего времени (`NowLine`) — день и неделя, обновляется каждые 60 сек.
  - Штриховка нерабочего времени — выходной, до/после рабочих часов мастера (по `staff_working_hours`).
  - Перерывы мастеров — блок «☕ Перерыв» на таймлайне из `breakStartsAt`/`breakEndsAt`.
  - Аватарки мастеров с инициалами и цветом в заголовках колонок (режим «День»).
  - Трёхстрочный блок события: услуга, клиент, «09:00–10:00 · 60 мин» (при height > 40px).
  - Клик по заголовку дня в «Неделе» — переход в режим «День».
  - Индикаторы загруженности в «Месяце» (`LoadBar`: 3 уровня ширины/цвета).
  - Модалка деталей записи: аватар клиента, бейдж статуса, услуга/мастер, дата-время, длительность, заметка, кнопки действий по статусу.
- **Идеи задач (следующий этап):** drag-and-drop перенос записей с вызовом API; resize длительности; zoom масштаб таймлайна; синхронизация с `slot_duration_minutes`; доступные слоты в форме создания.

### Мастера и профили (Этап 2)

- **Бэкенд:** `GET/POST/PUT/DELETE /api/v1/dashboard/salon-masters` (deprecated-алиасы `/api/v1/dashboard/staff` и `/staff/:id`), `PUT .../salon-masters/:id/services` (полная замена `salon_master_services` с оверрайдами), `GET /api/v1/dashboard/masters/lookup?phone=`, `POST /api/v1/dashboard/master-invites` (создаёт `salon_masters` со `status=pending`). Миграция `000013_salon_master_status`. В ответах списка и карточки: вложенный `masterProfile`, массив `services` с `salonPriceCents` / оверрайдами. Записи: в JSON поле `salonMasterId`.
- **Фронт:** [StaffFormModal.tsx](frontend/src/pages/dashboard/ui/modals/StaffFormModal.tsx), [StaffListView.tsx](frontend/src/pages/dashboard/ui/views/StaffListView.tsx), [StaffDetailView.tsx](frontend/src/pages/dashboard/ui/views/StaffDetailView.tsx), [dashboardApi.ts](frontend/src/shared/api/dashboardApi.ts).
- **Концепция:** [master_profiles_salon_masters.md](master_profiles_salon_masters.md), постановка: [agent-prompt-stage2-master-dashboard.md](agent-prompt-stage2-master-dashboard.md).

### Общие файлы API

- [dashboardApi.ts](frontend/src/shared/api/dashboardApi.ts) — единая точка для кабинета.
- **Бэкенд:** [dashboard_controller.go](backend/internal/controller/dashboard_controller.go), [service/dashboard.go](backend/internal/service/dashboard.go), [dashboard_repository.go](backend/internal/infrastructure/persistence/dashboard_repository.go).
