---
title: phase1 agent prompt
updated: 2026-04-24
source_of_truth: mirror
code_pointers: []
---

# Промпт для агента: Фаза 1 — Core MVP Dashboard

> Скопируй весь текст ниже и отправь агенту (Cursor, Claude Code и т.д.)

---

## Контекст проекта

Beautica — двусторонний бьюти-маркетплейс для России. Клиент ищет салон через поиск, салон управляет бизнесом через дашборд. Стек: React + Vite + TypeScript + MUI + Redux Toolkit (frontend), Go + net/http + Uber Fx + GORM + PostgreSQL (backend).

**ОБЯЗАТЕЛЬНО прочитай эти файлы перед началом работы:**

| Файл | Что в нём | Зачем читать |
|------|-----------|-------------|
| [`product/context.md`](../../vault/product/context.md) | Продукт, рынок, MVP scope, монетизация | Понять бизнес-логику и приоритеты |
| [`product/status.md`](../../vault/product/status.md) | Что готово, что нет, техдолг | Понять текущее состояние, не сломать работающее |
| [`architecture/`](../../vault/architecture/overview.md) + [code-map](../../vault/architecture/code-map.md) | Роуты, Mermaid, указатели в код | Главный справочник: знать где что лежит и как связано |
| `docs/beautica-dashboard-features.md` | 62 фичи дашборда с роадмапом | Полный список фич, описание каждой, API-спецификации |
| `docs/beautica-v2-redesign.html` | Дизайн-референс: Warm Mocha палитра, компоненты | Визуальный стиль дашборда (цвета, типография, компоненты) |
| `AGENTS.md` | Правила для AI-агентов: стек, безопасность, как проверять | Обязательные проверки: `go test`, `npm run lint`, `npm run build` |

---

## Задача: реализовать Фазу 1 — Core MVP Dashboard

Сейчас `DashboardPage.tsx` — пустая страница с заглушками. Нет API для бизнес-панели. Гостевые записи (`POST /v1/salons/{id}/bookings`) уходят в БД, но владелец не может их видеть. Нужно превратить дашборд в рабочий инструмент.

---

## Что нужно сделать (7 подзадач)

### 1. Backend: Dashboard API (новый контроллер)

Создать `DashboardController` — защищённый `auth.RequireAuth` middleware. Доступ только для `salon_owner` и `admin` (проверять через `SalonMember`).

**Новые эндпоинты:**

```
# Записи
GET    /api/v1/dashboard/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD&status=pending&staff_id=UUID
POST   /api/v1/dashboard/appointments          # ручная запись владельцем
PATCH  /api/v1/dashboard/appointments/{id}/status   # body: {"status": "confirmed"}
PUT    /api/v1/dashboard/appointments/{id}      # перенос: изменить starts_at, ends_at, staff_id

# Услуги
GET    /api/v1/dashboard/services
POST   /api/v1/dashboard/services
PUT    /api/v1/dashboard/services/{id}
DELETE /api/v1/dashboard/services/{id}          # soft delete: is_active = false

# Мастера (Staff)
GET    /api/v1/dashboard/staff
POST   /api/v1/dashboard/staff
PUT    /api/v1/dashboard/staff/{id}
DELETE /api/v1/dashboard/staff/{id}             # soft delete: is_active = false

# Расписание
GET    /api/v1/dashboard/schedule               # рабочие часы салона
PUT    /api/v1/dashboard/schedule               # body: массив WorkingHour

# Расписание мастера
GET    /api/v1/dashboard/staff/{id}/schedule
PUT    /api/v1/dashboard/staff/{id}/schedule

# Статистика (виджеты)
GET    /api/v1/dashboard/stats?period=week      # записей сегодня, новых за неделю, загрузка, рейтинг

# Профиль салона
GET    /api/v1/dashboard/salon/profile
PUT    /api/v1/dashboard/salon/profile          # описание, контакты, категория
```

**Архитектурные требования:**

Следуй существующим паттернам проекта (изучи `docs/vault/architecture/backend.md` и `code-map.md`):

- Новый контроллер: `backend/internal/controller/dashboard_controller.go`
- Новый сервис: `backend/internal/service/dashboard.go`
- Репозиторий: расширить `backend/internal/infrastructure/persistence/salon_repository.go` и `appointment_repository.go` (или создать `dashboard_repository.go`)
- Зарегистрировать в DI: `backend/internal/app/app.go` → `fx.Provide(...)` + `controller.NewDashboardController`
- Зарегистрировать роуты: `backend/internal/controller/server.go`
- Все dashboard-роуты должны быть обёрнуты в `auth.RequireAuth(jwtMgr, ...)`

**Авторизация dashboard-эндпоинтов:**

1. Извлечь user_id из JWT (через `auth.RequireAuth` middleware — уже реализован, см. `backend/internal/auth/middleware.go`)
2. Найти `SalonMember` где `user_id` = текущий пользователь
3. Получить `salon_id` из `SalonMember`
4. Все операции — только в рамках этого salon_id (владелец видит только свой салон)
5. Проверять `SalonMember.Role` — `owner` имеет полный доступ, `admin` тоже (пока без различий)

**Существующие модели (НЕ нужно создавать, уже в БД):**

```
# Из docs/vault/architecture/db-schema.md → Persistence модели:
Salon:         ID, ExternalIDs, NameOverride, AddressOverride, Timezone, Description, PhonePublic, OnlineBookingEnabled, CategoryID, BusinessType, Lat, Lng, Address, District, PhotoURL, Badge, CardGradient, Emoji, CachedRating, CachedReviewCount
SalonMember:   SalonID, UserID, Role (owner|admin)
Staff:         ID, SalonID, DisplayName, IsActive, CreatedAt
SalonService:  ID, SalonID, Name, DurationMinutes, PriceCents, IsActive, SortOrder
WorkingHour:   ID, SalonID, DayOfWeek(0-6), OpensAt, ClosesAt, ValidFrom, ValidTo
Appointment:   ID, SalonID, ClientUserID, GuestName, GuestPhoneE164, StaffID, ServiceID, StartsAt, EndsAt, Status, ClientNote, CreatedAt, UpdatedAt
```

**Enums (уже определены в `backend/internal/model/enums.go`):**
```
AppointmentStatus: pending, confirmed, cancelled_by_client, cancelled_by_salon, completed, no_show
SalonMemberRole:   owner, admin
```

### 2. Frontend: Структура Dashboard

Переделать `frontend/src/pages/dashboard/ui/DashboardPage.tsx` из заглушки в полноценный layout.

**Структура файлов (создать):**

```
frontend/src/pages/dashboard/
  ui/
    DashboardPage.tsx          # layout: sidebar + content area
    DashboardOverview.tsx      # главная: виджеты + command center + мини-календарь
    DashboardCalendar.tsx      # полноэкранный календарь (день/неделя)
    DashboardAppointments.tsx  # список записей с фильтрами
    DashboardServices.tsx      # CRUD услуг
    DashboardStaff.tsx         # управление мастерами
    DashboardSchedule.tsx      # расписание салона
    DashboardProfile.tsx       # редактирование профиля
  model/
    dashboardSlice.ts          # Redux slice (опционально, можно React Query / local state)
```

**Shared API (создать):**
```
frontend/src/shared/api/dashboardApi.ts    # все dashboard fetch-функции
```

**Layout DashboardPage:**
- Sidebar слева (220px): навигация по разделам (Обзор, Календарь, Записи, Услуги, Мастера, Расписание, Профиль)
- Content area справа: рендерит выбранный раздел
- Использовать local state или React Router nested routes для переключения
- Sidebar item с иконкой + текстом, active state

### 3. Frontend: Обзор (DashboardOverview)

Главный экран при входе в /dashboard.

**Виджеты (верхний ряд, 4 карточки):**
- Записей сегодня: число + «из них подтверждённых N» + мини-график за 7 дней
- Новых за неделю: число + % изменения vs прошлая неделя
- Загрузка: % + мини-график
- Рейтинг: число + количество отзывов

Данные из `GET /api/v1/dashboard/stats`

**Command Center (под виджетами):**
- Карточки с действиями (см. `docs/beautica-dashboard-features.md` → секция 10)
- Типы: pending записи (жёлтый), отмены (красный), свободные слоты (фиолетовый)
- Каждая карточка — кнопка действия (например «Подтвердить все»)

**Мини-календарь (нижняя часть):**
- Расписание на сегодня: колонки по мастерам, строки по часам
- Цветовая индикация статусов: pending (жёлтый), confirmed (зелёный), cancelled (красный)

### 4. Frontend: Календарь (DashboardCalendar)

**Виды:** день / неделя (переключатель)

**Режим «день»:**
- Колонки = мастера (Staff), строки = часы (с шагом 30 мин)
- Ячейки: запись с именем клиента, услугой, статусом (цветом)
- Рабочие часы — светлый фон, нерабочие — тёмный
- Click на пустую ячейку → модалка создания записи

**Режим «неделя»:**
- Колонки = дни ПН–ВС, строки = часы
- Упрощённые ячейки (меньше деталей)

**Навигация:** ← →  стрелки для переключения дня/недели, кнопка «Сегодня»

Данные из `GET /api/v1/dashboard/appointments?from=...&to=...`

### 5. Frontend: Управление записями (DashboardAppointments)

**Таблица записей:**
- Колонки: Дата/время, Клиент (имя + телефон), Услуга, Мастер, Статус, Действия
- Фильтры: по дате (from–to), по статусу, по мастеру
- Сортировка по дате
- Пагинация

**Быстрые действия:**
- Статус `pending` → кнопки «Подтвердить» / «Отклонить»
- Статус `confirmed` → кнопки «Завершить» / «No-show» / «Отменить»
- Вызывают `PATCH /api/v1/dashboard/appointments/{id}/status`

**Модалка создания записи:**
- Выбор услуги (из списка), мастера, дата, время
- Клиент: поиск по телефону или имя + телефон для нового
- Заметка (опционально)
- `POST /api/v1/dashboard/appointments`

### 6. Frontend: Услуги и Мастера

**DashboardServices:**
- Таблица: название, длительность, цена, активность (toggle), порядок
- Кнопка «Добавить услугу» → модалка с формой
- Inline-edit: клик на ячейку → редактирование
- Drag & drop для сортировки (sort_order)
- `GET/POST/PUT/DELETE /api/v1/dashboard/services`

**DashboardStaff:**
- Карточки мастеров: имя, фото (или инициалы), статус (активен/неактивен)
- Кнопка «Добавить мастера» → модалка
- При клике на мастера → расписание мастера + список его услуг
- `GET/POST/PUT/DELETE /api/v1/dashboard/staff`

### 7. Frontend: Расписание и Профиль

**DashboardSchedule:**
- Сетка ПН–ВС: каждый день → opens_at / closes_at (time picker)
- Toggle «Выходной» для отключения дня
- Кнопка «Сохранить» → `PUT /api/v1/dashboard/schedule`

**DashboardProfile:**
- Форма: название (NameOverride), описание (Description), телефон (PhonePublic), категория (CategoryID), тип бизнеса (BusinessType), toggle онлайн-записи (OnlineBookingEnabled)
- `GET/PUT /api/v1/dashboard/salon/profile`

---

## Дизайн-референс

Стиль дашборда — **Warm Mocha** палитра. Посмотри `docs/beautica-v2-redesign.html` → вкладка «Компоненты» (там навбар, карточки, цвета). Конкретные значения:

```css
--bg: #111;              /* фон страницы */
--surface: #1a1a1a;      /* фон sidebar */
--card: #222;            /* фон карточек */
--card-hover: #2a2a2a;   /* hover карточек */
--text: #f0eae3;         /* основной текст */
--text2: #a89e94;        /* вторичный текст */
--accent: #D8956B;       /* акцентный цвет (кнопки, active) */
--green: #6BCB77;        /* confirmed, success */
--red: #FF6B6B;          /* cancelled, error */
--yellow: #FFD93D;       /* pending, warning */
--purple: #B088F9;       /* AI, unique features */
--blue: #4ECDC4;         /* info, new */
```

Также смотри `docs/beautica-dashboard-features.html` → вкладка «Мокап» — интерактивный мокап с sidebar, виджетами, календарём, CRM, аналитикой, inbox, AI-ассистентом. Это визуальный ориентир для layout и компонентов.

Используй **Material-UI** (уже в проекте), кастомная тема в `frontend/src/shared/theme/index.ts`. Можно расширить тему под Warm Mocha или использовать CSS custom properties.

---

## Порядок реализации

1. **Backend сначала**: создать все dashboard-эндпоинты, проверить `go test ./...`
2. **Frontend API layer**: `dashboardApi.ts` с fetch-функциями
3. **Dashboard layout**: sidebar + content area + routing
4. **DashboardOverview**: виджеты + command center
5. **DashboardCalendar**: сетка по мастерам/часам
6. **DashboardAppointments**: таблица + модалка создания
7. **DashboardServices + DashboardStaff**: CRUD
8. **DashboardSchedule + DashboardProfile**: формы
9. **Финальная проверка**: `go test ./...`, `npm run lint`, `npm run build`

---

## Важные ограничения

- НЕ трогай SearchPage, SearchResultCard, MapSidebar — поиск работает, не ломай
- НЕ трогай auth flow (LoginPage, OtpStep, PhoneStep) — работает
- НЕ меняй существующие миграции — если нужно добавить поля, создай новую миграцию `000007_*.up.sql`
- НЕ кэшируй данные 2GIS в БД (лицензия запрещает)
- Все dashboard-эндпоинты — за `auth.RequireAuth` middleware
- Frontend: используй существующий `authApi.ts` для получения токена, подставляй `Authorization: Bearer <token>` в dashboard запросы
- Проверяй всё через `go test ./...` и `npm run build` перед завершением
