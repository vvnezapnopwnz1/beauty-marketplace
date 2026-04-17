# Задача: Этап 1 — Профили мастеров как отдельная сущность (фундамент)

## Контекст

Репозиторий: монорепо `beauty-marketplace`.
- Бэкенд: Go 1.24 + `net/http` + Uber Fx + GORM + PostgreSQL.
- Фронтенд: React + TypeScript + Vite + MUI + Redux Toolkit.
- Правила проекта: `AGENTS.md` и `CLAUDE.md` — читать обязательно перед началом.
- После любых изменений бэкенда: `go build ./...` + `go test ./...`.
- После любых изменений фронтенда: `npm run lint` + `npm run build`.

Эта задача — **только бэкенд и база данных**. Фронтенд не меняется ни в каком файле.

---

## Суть изменения

Сейчас `staff` — это «сотрудник конкретного салона», жёстко привязанный к `salon_id`. Нет независимого профиля мастера: история, отзывы и репутация теряются при смене салона.

Цель этапа 1 — заложить фундамент:
1. Переименовать все `staff`-таблицы в `salon_masters`-семейство (clean rename).
2. Создать таблицу `master_profiles` — независимый профиль мастера.
3. Создать таблицу `master_services` — личный каталог услуг мастера (не привязан к салону).
4. Связать каждую строку `salon_masters` с `master_profiles` через `master_id`.
5. Сделать backfill: для каждого существующего мастера создать `master_profile`.

**Никакие HTTP-эндпоинты, JSON-поля API и фронтенд не меняются в этом этапе.**
Go-типы переименовываются, но `TableName()` и JSON-теги гарантируют обратную совместимость.

---

## Что НЕ трогаем

- Любые файлы в `frontend/` — ни один файл.
- HTTP URL-пути: `/api/v1/dashboard/staff`, `/api/v1/dashboard/schedule/staff/:id` и т.д. остаются без изменений.
- JSON-поля в ответах API: поле `staff_id` в `appointments` остаётся `"staff_id"` в JSON через тег `json:"staff_id"` на переименованном Go-поле.
- Таблицы `services`, `service_categories`, `working_hours` (расписание салона), `appointments` (кроме rename одной колонки) — не трогаем структуру.
- Миграции 000001–000011 — не редактируем.

---

## Шаг 1 — Прочитать текущую схему

Перед написанием миграции прочитай актуальную схему таблиц staff-семейства:

```bash
# Посмотреть точные колонки staff и связанных таблиц
psql "$DATABASE_DSN" -c "\d staff"
psql "$DATABASE_DSN" -c "\d staff_services"
psql "$DATABASE_DSN" -c "\d staff_working_hours"
psql "$DATABASE_DSN" -c "\d staff_absences"
psql "$DATABASE_DSN" -c "\d appointments" | grep staff
```

Это нужно, чтобы точно знать: есть ли уже колонка `color` в `staff`, какие FK constraints называются, существует ли `staff_absences`.

---

## Шаг 2 — Миграция `000012_master_profiles.up.sql`

Создать файл `backend/migrations/000012_master_profiles.up.sql`.

Миграция выполняет операции строго в следующем порядке (порядок критичен из-за FK):

### 2.1 Создать `master_profiles`

```sql
CREATE TABLE master_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    display_name        TEXT NOT NULL,
    avatar_url          TEXT,
    bio                 TEXT,
    specializations     TEXT[] NOT NULL DEFAULT '{}',
    years_experience    INT,
    phone_e164          TEXT,
    cached_rating       NUMERIC(3,2),
    cached_review_count INT NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_master_profiles_user_id UNIQUE (user_id),
    CONSTRAINT chk_master_profiles_rating CHECK (cached_rating IS NULL OR (cached_rating >= 1 AND cached_rating <= 5))
);

CREATE INDEX idx_master_profiles_user_id ON master_profiles(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_master_profiles_phone ON master_profiles(phone_e164) WHERE phone_e164 IS NOT NULL;
```

### 2.2 Создать `master_services`

```sql
CREATE TABLE master_services (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id           UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
    category_slug       TEXT REFERENCES service_categories(slug),
    name                TEXT NOT NULL,
    description         TEXT,
    price_cents         INT,
    duration_minutes    INT NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order          INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT chk_master_services_duration CHECK (duration_minutes > 0)
);

CREATE INDEX idx_master_services_master_id ON master_services(master_id);
```

### 2.3 Переименовать `staff` → `salon_masters`

```sql
ALTER TABLE staff RENAME TO salon_masters;
```

PostgreSQL автоматически обновляет все FK constraints, ссылающиеся на эту таблицу (включая из `appointments.staff_id`). Constraint-имена сохраняются.

### 2.4 Добавить новые колонки в `salon_masters`

```sql
ALTER TABLE salon_masters
    ADD COLUMN master_id UUID REFERENCES master_profiles(id) ON DELETE SET NULL,
    ADD COLUMN display_name_override TEXT,
    ADD COLUMN joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ADD COLUMN left_at TIMESTAMP WITH TIME ZONE;

-- Добавить color только если не существует (она могла быть добавлена в 000009+)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'salon_masters' AND column_name = 'color'
    ) THEN
        ALTER TABLE salon_masters ADD COLUMN color TEXT;
    END IF;
END$$;

CREATE INDEX idx_salon_masters_master_id ON salon_masters(master_id) WHERE master_id IS NOT NULL;
CREATE INDEX idx_salon_masters_salon_id ON salon_masters(salon_id);
```

### 2.5 Переименовать `staff_services` → `salon_master_services`

```sql
ALTER TABLE staff_services RENAME TO salon_master_services;

-- Добавить override-колонки (NULL = использовать значение из salon_services)
ALTER TABLE salon_master_services
    ADD COLUMN IF NOT EXISTS price_override_cents INT,
    ADD COLUMN IF NOT EXISTS duration_override_minutes INT;
```

### 2.6 Переименовать `staff_working_hours` → `salon_master_hours`

```sql
ALTER TABLE staff_working_hours RENAME TO salon_master_hours;
```

### 2.7 Переименовать `staff_absences` (если существует)

```sql
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_absences') THEN
        ALTER TABLE staff_absences RENAME TO salon_master_absences;
    END IF;
END$$;
```

### 2.8 Переименовать колонку `appointments.staff_id` → `appointments.salon_master_id`

```sql
-- Найти и удалить FK constraint по staff_id в appointments
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'appointments'
        AND kcu.column_name = 'staff_id'
        AND tc.constraint_type = 'FOREIGN KEY';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE appointments DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;
END$$;

ALTER TABLE appointments RENAME COLUMN staff_id TO salon_master_id;

ALTER TABLE appointments
    ADD CONSTRAINT appointments_salon_master_id_fkey
    FOREIGN KEY (salon_master_id) REFERENCES salon_masters(id) ON DELETE SET NULL;

-- Пересоздать индекс если был
DROP INDEX IF EXISTS idx_appointments_staff_id;
CREATE INDEX IF NOT EXISTS idx_appointments_salon_master_id ON appointments(salon_master_id) WHERE salon_master_id IS NOT NULL;
```

### 2.9 Backfill: создать `master_profile` для каждого существующего мастера

```sql
CREATE TEMP TABLE _master_backfill AS
SELECT
    sm.id AS salon_master_id,
    gen_random_uuid() AS master_profile_id,
    sm.display_name,
    sm.created_at
FROM salon_masters sm
WHERE sm.master_id IS NULL;

INSERT INTO master_profiles (id, display_name, is_active, created_at, updated_at)
SELECT
    master_profile_id,
    display_name,
    TRUE,
    created_at,
    created_at
FROM _master_backfill;

UPDATE salon_masters sm
SET master_id = bf.master_profile_id
FROM _master_backfill bf
WHERE sm.id = bf.salon_master_id;

DROP TABLE _master_backfill;
```

---

## Шаг 3 — Миграция `000012_master_profiles.down.sql`

Создать файл `backend/migrations/000012_master_profiles.down.sql`.

Down-миграция в обратном порядке:

```sql
-- 1. Убрать backfill (мастер-профили созданные автоматически)
-- (master_profiles, созданные вручную, не трогаем — only те что созданы в up)
-- Обнулить master_id чтобы не было FK нарушений
UPDATE salon_masters SET master_id = NULL;

-- 2. Удалить FK и переименовать колонку appointments обратно
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_salon_master_id_fkey;
ALTER TABLE appointments RENAME COLUMN salon_master_id TO staff_id;
ALTER TABLE appointments
    ADD CONSTRAINT appointments_staff_id_fkey
    FOREIGN KEY (staff_id) REFERENCES salon_masters(id) ON DELETE SET NULL;
DROP INDEX IF EXISTS idx_appointments_salon_master_id;
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON appointments(staff_id) WHERE staff_id IS NOT NULL;

-- 3. Переименовать salon_master_absences обратно
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'salon_master_absences') THEN
        ALTER TABLE salon_master_absences RENAME TO staff_absences;
    END IF;
END$$;

-- 4. Переименовать salon_master_hours обратно
ALTER TABLE salon_master_hours RENAME TO staff_working_hours;

-- 5. Убрать override-колонки и переименовать salon_master_services обратно
ALTER TABLE salon_master_services
    DROP COLUMN IF EXISTS price_override_cents,
    DROP COLUMN IF EXISTS duration_override_minutes;
ALTER TABLE salon_master_services RENAME TO staff_services;

-- 6. Убрать новые колонки из salon_masters и переименовать обратно
DROP INDEX IF EXISTS idx_salon_masters_master_id;
DROP INDEX IF EXISTS idx_salon_masters_salon_id;
ALTER TABLE salon_masters
    DROP COLUMN IF EXISTS master_id,
    DROP COLUMN IF EXISTS display_name_override,
    DROP COLUMN IF EXISTS joined_at,
    DROP COLUMN IF EXISTS left_at;
ALTER TABLE salon_masters RENAME TO staff;

-- 7. Удалить новые таблицы
DROP TABLE IF EXISTS master_services;
DROP TABLE IF EXISTS master_profiles;
```

---

## Шаг 4 — Обновить Go-модели

Файл: `backend/internal/infrastructure/persistence/model/models.go`

### 4.1 Добавить новые модели

Добавить после существующих структур:

```go
// MasterProfile — независимый профиль мастера.
// Живёт вне контекста любого салона.
// UserID nullable: NULL = «теневой» профиль, созданный салоном.
// Мастер-пользователь может заклеймить теневой профиль через matching по PhoneE164.
type MasterProfile struct {
    ID                 uuid.UUID  `gorm:"type:uuid;primaryKey"`
    UserID             *uuid.UUID `gorm:"type:uuid"`
    DisplayName        string
    AvatarURL          *string
    Bio                *string
    Specializations    pq.StringArray `gorm:"type:text[]"`
    YearsExperience    *int
    PhoneE164          *string
    CachedRating       *float64
    CachedReviewCount  int
    IsActive           bool
    CreatedAt          time.Time
    UpdatedAt          time.Time
}

// MasterService — личный каталог услуг мастера.
// Не привязан ни к одному салону.
// Когда мастер работает в салоне, его услуги там определяются отдельно
// через SalonMasterService (каталог услуг салона + назначение мастера).
type MasterService struct {
    ID              uuid.UUID  `gorm:"type:uuid;primaryKey"`
    MasterID        uuid.UUID  `gorm:"type:uuid;not null"`
    CategorySlug    *string
    Name            string
    Description     *string
    PriceCents      *int
    DurationMinutes int
    IsActive        bool
    SortOrder       int
    CreatedAt       time.Time
}
```

Проверить, что импортирован `github.com/lib/pq` для `pq.StringArray`. Если нет — добавить в `go.mod` и imports.

### 4.2 Переименовать `Staff` → `SalonMaster`

Найти структуру `Staff` и заменить на:

```go
// SalonMaster — членство мастера в салоне.
// Строка НИКОГДА не удаляется при уходе мастера из салона:
// is_active=false + left_at=now(). Это сохраняет историю записей и отзывов.
// Мастер может быть одновременно членом нескольких салонов (freelance).
type SalonMaster struct {
    ID                  uuid.UUID  `gorm:"type:uuid;primaryKey"`
    SalonID             uuid.UUID  `gorm:"type:uuid;not null"`
    MasterID            *uuid.UUID `gorm:"type:uuid"`
    DisplayName         string                              // Имя как в салоне
    DisplayNameOverride *string                             // Если отличается от master_profile.display_name
    Color               *string                             // Цвет в UI календаря (#RRGGBB)
    IsActive            bool
    JoinedAt            time.Time
    LeftAt              *time.Time
    CreatedAt           time.Time
}

func (SalonMaster) TableName() string { return "salon_masters" }
```

Удалить старый метод `TableName()` у `Staff` если был, или старую структуру `Staff` целиком.

### 4.3 Переименовать `StaffWorkingHour` → `SalonMasterHour`

Найти `StaffWorkingHour` и переименовать:

```go
type SalonMasterHour struct {
    ID             uuid.UUID `gorm:"type:uuid;primaryKey"`
    SalonMasterID  uuid.UUID `gorm:"type:uuid;not null;column:staff_id"` // column имя менять не нужно — таблица уже переименована
    DayOfWeek      int
    OpensAt        string    // "HH:MM"
    ClosesAt       string    // "HH:MM"
    IsDayOff       bool
    BreakStartsAt  *string   // "HH:MM", nullable
    BreakEndsAt    *string   // "HH:MM", nullable
}

func (SalonMasterHour) TableName() string { return "salon_master_hours" }
```

> **Важно**: После rename таблицы `staff_working_hours → salon_master_hours` GORM должен знать новое имя через `TableName()`. Убедись, что старый `TableName()` у `StaffWorkingHour` (если был) удалён.

Аналогично — если есть `StaffAbsence`, переименовать в `SalonMasterAbsence` и обновить `TableName()`.

### 4.4 Переименовать `StaffService` (M:N таблица) если есть в models.go

Если в `models.go` есть явная модель для `staff_services`, переименовать:

```go
type SalonMasterService struct {
    SalonMasterID           uuid.UUID `gorm:"type:uuid;primaryKey;column:staff_id"`
    ServiceID               uuid.UUID `gorm:"type:uuid;primaryKey"`
    PriceOverrideCents      *int
    DurationOverrideMinutes *int
}

func (SalonMasterService) TableName() string { return "salon_master_services" }
```

> `column:staff_id` — потому что колонка в БД называлась `staff_id` и при rename таблицы имя колонки остаётся (мы переименовывали только таблицу, не колонки внутри staff_services).

### 4.5 Обновить поле `StaffID` в `Appointment`

В структуре `Appointment` найти поле `StaffID` и обновить:

```go
// Было:
StaffID *uuid.UUID `gorm:"type:uuid"`

// Стало:
SalonMasterID *uuid.UUID `gorm:"type:uuid;column:salon_master_id" json:"staff_id"`
```

> **Критично**: тег `json:"staff_id"` сохраняет обратную совместимость API. Фронт не получит сломанный JSON. Убрать этот тег можно будет в Этапе 2, когда фронт обновится.

---

## Шаг 5 — Обновить репозитории и сервисы

Задача: заменить все ссылки на старые Go-типы (`Staff`, `StaffWorkingHour`, `StaffService`) на новые (`SalonMaster`, `SalonMasterHour`, `SalonMasterService`). Логика не меняется.

### 5.1 Файлы для обновления

Найти все файлы, где используются старые имена:

```bash
grep -rn "Staff\b\|StaffID\b\|StaffWorkingHour\b\|StaffService\b" \
  backend/internal/ --include="*.go" | grep -v "_test.go"
```

Типичные файлы:
- `backend/internal/infrastructure/persistence/dashboard_repository.go`
- `backend/internal/service/dashboard.go`
- `backend/internal/controller/dashboard_controller.go`
- `backend/internal/infrastructure/persistence/appointment_repository.go`
- `backend/internal/service/booking.go`

Для каждого файла: заменить тип `Staff` → `SalonMaster`, `StaffWorkingHour` → `SalonMasterHour`, поле `StaffID` → `SalonMasterID` в Go-коде (но НЕ в JSON-тегах и НЕ в URL-путях).

### 5.2 Паттерны замены

```
model.Staff{} → model.SalonMaster{}
[]*model.Staff → []*model.SalonMaster
model.StaffWorkingHour{} → model.SalonMasterHour{}
.StaffID → .SalonMasterID
"staff_id" в GORM-запросах → "salon_master_id"
```

### 5.3 Добавить репозиторий для master_profiles

В интерфейс `DashboardRepository` (файл `backend/internal/repository/dashboard.go`) добавить методы:

```go
// MasterProfile operations
GetMasterProfile(ctx context.Context, masterID uuid.UUID) (*model.MasterProfile, error)
GetMasterProfileBySalonMaster(ctx context.Context, salonMasterID uuid.UUID) (*model.MasterProfile, error)
```

Реализовать в `dashboard_repository.go`:

```go
func (r *dashboardRepository) GetMasterProfile(ctx context.Context, masterID uuid.UUID) (*model.MasterProfile, error) {
    var profile model.MasterProfile
    err := r.db.WithContext(ctx).First(&profile, "id = ?", masterID).Error
    if errors.Is(err, gorm.ErrRecordNotFound) {
        return nil, nil
    }
    return &profile, err
}

func (r *dashboardRepository) GetMasterProfileBySalonMaster(ctx context.Context, salonMasterID uuid.UUID) (*model.MasterProfile, error) {
    var sm model.SalonMaster
    if err := r.db.WithContext(ctx).First(&sm, "id = ?", salonMasterID).Error; err != nil {
        return nil, err
    }
    if sm.MasterID == nil {
        return nil, nil
    }
    return r.GetMasterProfile(ctx, *sm.MasterID)
}
```

---

## Шаг 6 — Применить миграцию и проверить

```bash
# 1. Применить миграцию
migrate -path backend/migrations \
  -database "$DATABASE_DSN" \
  up 1

# 2. Проверить схему
psql "$DATABASE_DSN" -c "\d salon_masters"
psql "$DATABASE_DSN" -c "\d master_profiles"
psql "$DATABASE_DSN" -c "\d master_services"
psql "$DATABASE_DSN" -c "\d salon_master_hours"
psql "$DATABASE_DSN" -c "\d salon_master_services"
psql "$DATABASE_DSN" -c "\d appointments" | grep salon_master

# 3. Проверить backfill
psql "$DATABASE_DSN" -c "
  SELECT
    COUNT(*) AS total_masters,
    COUNT(master_id) AS with_profile,
    COUNT(*) - COUNT(master_id) AS missing_profile
  FROM salon_masters;
"
# Ожидаемый результат: total_masters = with_profile, missing_profile = 0

# 4. Проверить связность
psql "$DATABASE_DSN" -c "
  SELECT sm.display_name, mp.display_name AS profile_name
  FROM salon_masters sm
  JOIN master_profiles mp ON sm.master_id = mp.id
  LIMIT 5;
"

# 5. Собрать бэкенд
cd backend && go build ./...

# 6. Запустить тесты
go test ./...
```

---

## Шаг 7 — Smoke-test API

После запуска `go run ./cmd/api`:

```bash
# Получить токен (или использовать существующий dev-токен)
TOKEN="..."

# Эндпоинты должны работать как раньше
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/dashboard/staff

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/dashboard/appointments

# Поле staff_id в ответе appointments должно присутствовать (json:"-" НЕ должен стоять)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/dashboard/appointments?from=2026-01-01" | \
  python3 -m json.tool | grep staff_id
```

---

## Stop-list (запрещено в этом этапе)

- ❌ Изменять любые файлы в `frontend/`
- ❌ Менять URL HTTP-эндпоинтов (`/staff`, `/schedule/staff/:id` и т.д.)
- ❌ Убирать тег `json:"staff_id"` с поля `SalonMasterID` в `Appointment`
- ❌ Трогать таблицы `services`, `service_categories`, `working_hours`, `salons`, `appointments` (кроме rename колонки `staff_id`)
- ❌ Изменять логику поиска, бронирования или авторизации
- ❌ Добавлять новые HTTP-эндпоинты (это Этап 2)
- ❌ Переименовывать URL-пути типа `/staff/:id` в URL-маршрутах Go — только Go-типы
- ❌ Устанавливать новые Go-зависимости без крайней необходимости

---

## Что должно быть после завершения этапа

1. В БД есть таблицы: `master_profiles`, `master_services`, `salon_masters`, `salon_master_hours`, `salon_master_services` (и `salon_master_absences` если была `staff_absences`).
2. Таблиц `staff`, `staff_services`, `staff_working_hours` не существует.
3. `appointments.salon_master_id` — колонка с FK на `salon_masters.id`.
4. Для каждой строки в `salon_masters` есть связанная запись в `master_profiles` (`master_id` NOT NULL для всех существующих мастеров).
5. Фронтенд работает без изменений: `GET /api/v1/dashboard/staff` возвращает тот же JSON, что и до миграции.
6. Поле `staff_id` в ответах appointments остаётся в JSON (через тег).
7. `go build ./...` — OK, `go test ./...` — OK, `npm run build` — OK (без изменений).

---

## Что будет в Этапе 2 (не делаем сейчас)

- CRUD эндпоинты для `master_profiles` (GET, PUT профиля мастера в дашборде).
- Invite-флоу: `POST /api/v1/dashboard/master-invites` — пригласить мастера по телефону.
- Поиск существующего `master_profile` по телефону.
- Фронтенд: обновление типов `StaffColumn`, форм мастера с полями bio/specializations.
- Переименование URL `/staff` → `/salon-masters` с фронтовым обновлением.
- `GET /api/v1/salons/:id/masters` для публичной страницы салона.

Публичная страница мастера (`/master/:id`) — отдельный Этап 3 со своими фронтенд-компонентами.
