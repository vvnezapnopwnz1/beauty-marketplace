---
title: "Управление персоналом и RBAC — спецификация"
updated: 2026-04-28
source_of_truth: true
status: approved
code_pointers:
  - backend/internal/controller/dashboard_controller.go
  - backend/internal/controller/dashboard_personnel_handlers.go
  - backend/internal/repository/dashboard.go
  - backend/internal/repository/salon_member_invite.go
  - backend/internal/repository/user_roles.go
  - backend/internal/service/dashboard_personnel.go
  - backend/internal/service/user_roles_service.go
  - frontend/src/pages/dashboard/ui/DashboardPage.tsx
  - frontend/src/entities/salon-invite/
  - frontend/src/shared/api/rtkApi.ts
  - frontend/src/shared/config/routes.ts
---

# Управление персоналом и RBAC

## Контекст

Сейчас дашборд салона поддерживает две роли в `salon_members`: `owner` и `admin`, которые имеют одинаковые права. Доступ определяется через `resolveSalonMembership()`, которая возвращает *первый найденный* салон — мульти-салон не поддерживается. Мастера (`salon_masters`) не имеют доступа к дашборду салона.

Задача: добавить управление персоналом с ролями и invite-flow, а также перевести дашборд на multi-salon архитектуру.

## Решения (из брейншторма)

1. **Роли** — фиксированные: `owner`, `admin`, `receptionist`. Без гранулярных пермишенов.
2. **Invite flow** — отдельная таблица `salon_member_invites` (инвайт = намерение, `salon_members` = факт).
3. **Multi-salon** — вариант C: URL браузера `/dashboard/:salonId/*`, бэкенд API остаётся `/api/v1/dashboard/*`, салон передаётся заголовком `X-Salon-Id`.
4. **EffectiveRoles** — единый массив `salonMemberships: [{salonId, salonName, role}]` вместо `ownerOfSalons` + `adminOfSalons`.
5. **Cache при смене салона** — `api.util.resetApiState()` при переключении.
6. **Двойная роль** — человек может быть мастером (`salon_masters`) и админом (`salon_members`) в одном салоне. Два отдельных кабинета в UI.

---

## Матрица прав

| Действие                    | owner | admin | receptionist |
|-----------------------------|-------|-------|--------------|
| Записи: просмотр всех       | да    | да    | да           |
| Записи: создание/редактирование | да | да   | да           |
| Клиенты: просмотр           | да    | да    | да           |
| Клиенты: создание/редактирование | да | да  | да           |
| Услуги: управление          | да    | да    | нет          |
| Мастера: управление         | да    | да    | нет          |
| Расписание: редактирование  | да    | да    | нет          |
| Профиль салона              | да    | нет   | нет          |
| Аналитика (stats)          | да    | да    | нет          |
| Управление персоналом (invite/remove) | да | нет | нет     |

---

## Фаза 1: Миграция БД (`000024_staff_management.up.sql`)

### 1.1 Расширить enum `salon_member_role`

```sql
ALTER TYPE salon_member_role ADD VALUE IF NOT EXISTS 'receptionist';
```

### 1.2 Создать таблицу `salon_member_invites`

```sql
CREATE TYPE salon_member_invite_status AS ENUM (
    'pending', 'accepted', 'declined', 'expired'
);

CREATE TABLE salon_member_invites (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id    uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    phone_e164  text NOT NULL,
    role        salon_member_role NOT NULL,
    status      salon_member_invite_status NOT NULL DEFAULT 'pending',
    invited_by  uuid NOT NULL REFERENCES users(id),
    user_id     uuid REFERENCES users(id),       -- заполняется если пользователь уже зарегистрирован
    created_at  timestamptz NOT NULL DEFAULT now(),
    expires_at  timestamptz NOT NULL DEFAULT (now() + interval '30 days'),

    CONSTRAINT no_owner_invite CHECK (role <> 'owner')
);

CREATE INDEX idx_smi_salon_status ON salon_member_invites(salon_id, status);
CREATE INDEX idx_smi_phone_pending ON salon_member_invites(phone_e164, status)
    WHERE status = 'pending';
CREATE INDEX idx_smi_user_pending ON salon_member_invites(user_id, status)
    WHERE status = 'pending' AND user_id IS NOT NULL;
```

### 1.3 Обновить триггер `recalc_user_global_role`

Триггер уже проверяет `role = 'owner'` для определения `salon_owner`. Роли `admin` и `receptionist` не влияют на `global_role` — триггер менять не нужно.

---

## Фаза 2: Бэкенд — multi-salon + RBAC

### 2.1 Рефакторинг `resolveSalonMembership`

**Файл:** `backend/internal/controller/dashboard_controller.go`

Текущая сигнатура:
```go
func (h *DashboardController) resolveSalonMembership(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool)
```

Новая сигнатура:
```go
func (h *DashboardController) resolveSalonMembership(w http.ResponseWriter, r *http.Request) (salonID uuid.UUID, role string, ok bool)
```

Логика:
1. Извлечь `userID` из JWT-контекста.
2. Прочитать заголовок `X-Salon-Id` — он **обязателен** (раз нет прода, fallback не нужен).
3. Распарсить UUID.
4. Вызвать `FindMembershipForUserAndSalon(ctx, userID, salonID)` — вернёт `(role, error)` или `nil`.
5. Если membership нет → 403 `"no salon access"`.
6. Вернуть `(salonID, role, true)`.

### 2.2 Проверка прав в роутере

**Файл:** `backend/internal/controller/dashboard_controller.go` → `DashboardRoutes`

После получения `(salonID, role)` — проверка по матрице прав перед вызовом хендлера:

```go
func (h *DashboardController) DashboardRoutes(w http.ResponseWriter, r *http.Request) {
    salonID, role, ok := h.resolveSalonMembership(w, r)
    if !ok {
        return
    }

    // ... path parsing ...

    switch parts[0] {
    case "appointments", "clients":
        // owner, admin, receptionist — все имеют доступ
    case "services", "salon-masters", "master-invites", "schedule", "slots":
        if role == "receptionist" {
            jsonError(w, "forbidden", http.StatusForbidden)
            return
        }
    case "stats":
        if role == "receptionist" {
            jsonError(w, "forbidden", http.StatusForbidden)
            return
        }
    case "salon":
        if parts[1] == "profile" {
            if r.Method == http.MethodPut && role != "owner" {
                jsonError(w, "forbidden", http.StatusForbidden)
                return
            }
            // GET доступен всем (чтобы sidebar мог показать имя салона)
        }
    case "staff-invites": // новый раздел
        if role != "owner" {
            jsonError(w, "forbidden", http.StatusForbidden)
            return
        }
    }
    // ... dispatch ...
}
```

### 2.3 Новые методы в репозитории

**Файл:** `backend/internal/repository/dashboard.go`

```go
// Добавить в DashboardRepository interface:
FindMembershipForUserAndSalon(ctx context.Context, userID, salonID uuid.UUID) (*SalonMembership, error)
```

**Файл:** `backend/internal/infrastructure/persistence/dashboard_repository.go`

```go
func (r *dashboardRepository) FindMembershipForUserAndSalon(
    ctx context.Context, userID, salonID uuid.UUID,
) (*repository.SalonMembership, error) {
    var m model.SalonMember
    err := r.db.WithContext(ctx).
        Where("user_id = ? AND salon_id = ?", userID, salonID).
        First(&m).Error
    if errors.Is(err, gorm.ErrRecordNotFound) {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }
    return &repository.SalonMembership{SalonID: m.SalonID, Role: m.Role}, nil
}
```

Старый `FindMembershipForUser` — удалить (нет прода).

### 2.4 Обновить `DashboardService` interface

**Файл:** `backend/internal/service/dashboard.go`

```go
// Было:
Membership(ctx context.Context, userID uuid.UUID) (*repository.SalonMembership, error)

// Стало:
MembershipForSalon(ctx context.Context, userID, salonID uuid.UUID) (*repository.SalonMembership, error)
```

### 2.5 Расширить `EffectiveRoles` → `salonMemberships`

**Файл:** `backend/internal/repository/user_roles.go`

```go
// Было:
type SalonRef struct {
    SalonID uuid.UUID `json:"salonId"`
}

type EffectiveRoles struct {
    IsClient        bool       `json:"isClient"`
    IsMaster        bool       `json:"isMaster"`
    IsPlatformAdmin bool       `json:"isPlatformAdmin"`
    OwnerOfSalons   []SalonRef `json:"ownerOfSalons"`
    AdminOfSalons   []SalonRef `json:"adminOfSalons"`
}

// Стало:
type SalonMembershipRef struct {
    SalonID   uuid.UUID `json:"salonId"`
    SalonName string    `json:"salonName"`
    Role      string    `json:"role"`
}

type EffectiveRoles struct {
    IsClient         bool                  `json:"isClient"`
    IsMaster         bool                  `json:"isMaster"`
    IsPlatformAdmin  bool                  `json:"isPlatformAdmin"`
    SalonMemberships []SalonMembershipRef  `json:"salonMemberships"`
    PendingInvites   int                   `json:"pendingInvites"`
}
```

**Файл:** `backend/internal/repository/user_roles.go` — расширить `UserRolesRepository`:

```go
type UserRoleMembership struct {
    SalonID   uuid.UUID
    SalonName string    // JOIN с salons.name_override
    Role      string
}

type UserRolesRepository interface {
    GetGlobalRoleByUserID(ctx context.Context, userID uuid.UUID) (string, error)
    ListSalonMembershipsByUserID(ctx context.Context, userID uuid.UUID) ([]UserRoleMembership, error)
    HasMasterProfileByUserID(ctx context.Context, userID uuid.UUID) (bool, error)
    CountPendingInvitesByUserID(ctx context.Context, userID uuid.UUID) (int, error) // НОВОЕ
}
```

**Файл:** `backend/internal/infrastructure/persistence/user_roles_repository.go` — `ListSalonMembershipsByUserID` теперь JOIN с `salons`:

```go
func (r *UserRolesRepository) ListSalonMembershipsByUserID(
    ctx context.Context, userID uuid.UUID,
) ([]repository.UserRoleMembership, error) {
    var scans []struct {
        SalonID   uuid.UUID
        SalonName *string
        Role      string
    }
    err := r.db.WithContext(ctx).
        Table("salon_members sm").
        Select("sm.salon_id, COALESCE(s.name_override, '') AS salon_name, sm.role").
        Joins("JOIN salons s ON s.id = sm.salon_id").
        Where("sm.user_id = ?", userID).
        Scan(&scans).Error
    if err != nil {
        return nil, err
    }
    out := make([]repository.UserRoleMembership, len(scans))
    for i, s := range scans {
        name := ""
        if s.SalonName != nil {
            name = *s.SalonName
        }
        out[i] = repository.UserRoleMembership{
            SalonID: s.SalonID, SalonName: name, Role: s.Role,
        }
    }
    return out, nil
}
```

**Файл:** `backend/internal/service/user_roles_service.go` — обновить `Resolve`:

```go
func (s *userRolesService) Resolve(ctx context.Context, userID uuid.UUID) (repository.EffectiveRoles, error) {
    role, _ := s.repo.GetGlobalRoleByUserID(ctx, userID)
    memberships, _ := s.repo.ListSalonMembershipsByUserID(ctx, userID)
    isMaster, _ := s.repo.HasMasterProfileByUserID(ctx, userID)
    pendingInvites, _ := s.repo.CountPendingInvitesByUserID(ctx, userID)

    refs := make([]repository.SalonMembershipRef, len(memberships))
    for i, m := range memberships {
        refs[i] = repository.SalonMembershipRef{
            SalonID: m.SalonID, SalonName: m.SalonName, Role: m.Role,
        }
    }

    return repository.EffectiveRoles{
        IsClient:         true,
        IsMaster:         isMaster,
        IsPlatformAdmin:  role == "admin",
        SalonMemberships: refs,
        PendingInvites:   pendingInvites,
    }, nil
}
```

### 2.6 Invite flow — новые эндпоинты

**Новый префикс:** `/api/v1/dashboard/staff-invites/` (доступен только `owner`).

| Метод | URL | Описание |
|-------|-----|----------|
| `GET`  | `/staff-invites` | Список инвайтов (pending + accepted) для текущего салона |
| `POST` | `/staff-invites` | Создать инвайт: `{phoneE164, role}` |
| `DELETE` | `/staff-invites/:id` | Отозвать pending-инвайт |

**Новый префикс:** `/api/v1/me/salon-invites/` (для принятия/отклонения).

| Метод | URL | Описание |
|-------|-----|----------|
| `GET`  | `/me/salon-invites` | Мои pending-инвайты |
| `POST` | `/me/salon-invites/:id/accept` | Принять → создать `salon_members` |
| `POST` | `/me/salon-invites/:id/decline` | Отклонить |

### 2.7 Auto-claim инвайтов при регистрации

**Файл:** `backend/internal/service/auth.go` — в `VerifyOTP` после создания/нахождения пользователя:

```go
// После успешного OTP — подхватить pending инвайты по phone_e164
func (s *authService) claimPendingMemberInvites(ctx context.Context, userID uuid.UUID, phoneE164 string) {
    // UPDATE salon_member_invites SET user_id = ? WHERE phone_e164 = ? AND status = 'pending' AND user_id IS NULL
}
```

Это не автопринятие — только привязка `user_id`. Пользователь всё равно должен явно принять.

---

## Фаза 3: Фронтенд — multi-salon + RBAC

### 3.1 Обновить типы

**Файл:** `frontend/src/shared/api/authApi.ts`

```typescript
// Было:
effectiveRoles?: {
    isClient: boolean
    isMaster: boolean
    isPlatformAdmin: boolean
    ownerOfSalons: Array<{ salonId: string }>
    adminOfSalons: Array<{ salonId: string }>
}

// Стало:
effectiveRoles?: {
    isClient: boolean
    isMaster: boolean
    isPlatformAdmin: boolean
    salonMemberships: Array<{ salonId: string; salonName: string; role: 'owner' | 'admin' | 'receptionist' }>
    pendingInvites: number
}
```

### 3.2 Обновить маршруты

**Файл:** `frontend/src/shared/config/routes.ts`

```typescript
export const ROUTES = {
    // ...
    DASHBOARD: '/dashboard/:salonId',       // было: '/dashboard'
    ONBOARDING: '/dashboard/:salonId/onboarding',
    // ...
}

export const dashboardPath = (salonId: string) => `/dashboard/${salonId}`
export const dashboardSectionPath = (salonId: string, section: string) =>
    `/dashboard/${salonId}?section=${section}`
```

**Файл:** `frontend/src/app/App.tsx`

```tsx
<Route path="/dashboard/:salonId/*" element={<DashboardPage />} />
```

### 3.3 Добавить `X-Salon-Id` заголовок

**Файл:** `frontend/src/shared/api/rtkApi.ts`

```typescript
import { store } from '@app/store'; // или через middleware

export const rtkApi = createApi({
    baseQuery: fetchBaseQuery({
        baseUrl: HOST_API_KEY_MIDDLEWARE || publicApiUrl('/api/v1/dashboard'),
        prepareHeaders: (headers) => {
            const token = getStoredAccessToken();
            if (token) headers.set('Authorization', `Bearer ${token}`);

            const sessionId = getStoredSessionId();
            if (sessionId) headers.set('X-Session-Id', sessionId);

            // НОВОЕ: salon context
            const salonId = getActiveSalonId(); // из localStorage или store
            if (salonId) headers.set('X-Salon-Id', salonId);

            return headers;
        },
    }),
    // ...
});
```

**Файл:** `frontend/src/shared/api/dashboardApi.ts` (legacy API) — аналогично в `authFetch`:

Обернуть `authFetch` в `dashboardFetch`, который добавляет `X-Salon-Id`. Или добавить header в каждый вызов `base()`:

```typescript
function dashboardHeaders(): HeadersInit {
    const salonId = getActiveSalonId();
    return salonId ? { 'X-Salon-Id': salonId } : {};
}
```

### 3.4 DashboardPage — извлечение `salonId` из URL

**Файл:** `frontend/src/pages/dashboard/ui/DashboardPage.tsx`

```typescript
export function DashboardPage() {
    const { salonId } = useParams<{ salonId: string }>();
    const navigate = useNavigate();
    const user = useAppSelector(selectUser);

    // Валидация: есть ли у пользователя доступ к этому салону
    useEffect(() => {
        if (!user || !salonId) return;
        const memberships = user.effectiveRoles?.salonMemberships ?? [];
        const membership = memberships.find(m => m.salonId === salonId);
        if (!membership) {
            // Нет доступа — редирект
            if (memberships.length > 0) {
                navigate(dashboardPath(memberships[0].salonId), { replace: true });
            } else {
                navigate(ROUTES.ME, { replace: true });
            }
            return;
        }
        // Сохранить activeSalonId для заголовков
        setActiveSalonId(salonId);
    }, [user, salonId, navigate]);

    // Роль текущего пользователя в этом салоне
    const role = useMemo(() => {
        const memberships = user?.effectiveRoles?.salonMemberships ?? [];
        return memberships.find(m => m.salonId === salonId)?.role;
    }, [user, salonId]);

    // ... rest of component, passing `role` down for permission checks
}
```

### 3.5 Обновить `useMatch` для staff

**Было:**
```typescript
const staffMatch = useMatch('/dashboard/staff/:staffId')
```

**Стало:**
```typescript
const staffMatch = useMatch('/dashboard/:salonId/staff/:staffId')
```

### 3.6 UserMenu — список салонов

**Файл:** `frontend/src/features/user-menu/ui/UserMenu.tsx`

```typescript
const memberships = roles?.salonMemberships ?? [];
const canSalon = memberships.length > 0;

// В меню:
{memberships.length === 1 && (
    <MenuItem onClick={() => navigate(dashboardPath(memberships[0].salonId))}>
        Кабинет салона
    </MenuItem>
)}
{memberships.length > 1 && memberships.map(m => (
    <MenuItem key={m.salonId} onClick={() => navigate(dashboardPath(m.salonId))}>
        {m.salonName || 'Салон'} ({roleLabel(m.role)})
    </MenuItem>
))}
```

### 3.7 Cache reset при смене салона

В `DashboardPage`, при изменении `salonId`:

```typescript
const prevSalonRef = useRef(salonId);
useEffect(() => {
    if (prevSalonRef.current && prevSalonRef.current !== salonId) {
        dispatch(rtkApi.util.resetApiState());
    }
    prevSalonRef.current = salonId;
}, [salonId, dispatch]);
```

### 3.8 Скрытие секций по роли

В sidebar навигации `DashboardPage`:

```typescript
const visibleNav = useMemo(() => {
    if (role === 'receptionist') {
        return NAV.filter(item =>
            ['overview', 'calendar', 'appointments', 'clients'].includes(item.id)
        );
    }
    if (role === 'admin') {
        return NAV.filter(item => item.id !== 'profile');
        // admin видит всё кроме профиля салона (чтение профиля через отдельный запрос)
    }
    return NAV; // owner видит всё
}, [role]);
```

---

## Фаза 4: UI управления персоналом

### 4.1 Новая секция «Персонал» в навигации дашборда

Добавить в `NAV`:

```typescript
{ id: 'personnel', label: 'Персонал', icon: '🔑' }
```

Видна только `owner`.

### 4.2 PersonnelView — список членов + инвайтов

Показывает:
- Текущие `salon_members` (кроме owner — его не удалить).
- Pending `salon_member_invites`.
- Кнопка «Пригласить сотрудника».

Для каждого члена:
- Имя, телефон, роль, бейдж статуса.
- Действия: изменить роль, удалить.

### 4.3 InviteStaffDrawer

Поля:
- Телефон (E.164 input).
- Роль: select `admin` / `receptionist`.
- Кнопка «Пригласить».

### 4.4 Экран принятия инвайтов

На странице `/me` — бейдж с `pendingInvites`. При клике — список инвайтов с кнопками «Принять» / «Отклонить».

---

## Порядок реализации

### Этап 1: Multi-salon (без новых ролей)
1. Миграция `000024`: добавить `receptionist` в enum + создать `salon_member_invites`.
2. Бэкенд: `FindMembershipForUserAndSalon`, рефакторинг `resolveSalonMembership` (читать `X-Salon-Id`), `MembershipForSalon` в сервисе.
3. Бэкенд: обновить `EffectiveRoles` → `salonMemberships[]`.
4. Фронтенд: маршруты `/dashboard/:salonId/*`, `X-Salon-Id` в headers, `UserMenu` с выбором салона.
5. **Верификация:** запустить дашборд, убедиться что все секции работают через `X-Salon-Id`.

### Этап 2: RBAC enforcement
6. Бэкенд: проверка `role` в `DashboardRoutes` по матрице прав.
7. Бэкенд: `resolveSalonMembership` теперь возвращает `role`.
8. Фронтенд: скрытие секций по роли, `role` в context/props.
9. **Верификация:** создать тестового `admin` и `receptionist` через SQL seed, проверить что запрещённые секции возвращают 403.

### Этап 3: Invite flow
10. Бэкенд: CRUD `salon_member_invites`, эндпоинты `/staff-invites`, `/me/salon-invites`.
11. Бэкенд: auto-claim в `VerifyOTP`.
12. Фронтенд: PersonnelView + InviteStaffDrawer.
13. Фронтенд: экран принятия инвайтов на `/me`.
14. **Верификация:** полный flow — инвайт → регистрация → принятие → появление в `salon_members`.

---

## Затронутые файлы (полный список)

### Бэкенд — изменение существующих

| Файл | Что меняется |
|------|-------------|
| `controller/dashboard_controller.go` | `resolveSalonMembership` → `(salonID, role, ok)`, RBAC в `DashboardRoutes` |
| `controller/user_controller.go` | Новые роуты `/me/salon-invites/*` |
| `controller/server.go` | Регистрация новых роутов |
| `repository/dashboard.go` | `FindMembershipForUserAndSalon`, удалить `FindMembershipForUser` |
| `repository/user_roles.go` | `SalonMembershipRef`, расширить `EffectiveRoles`, `CountPendingInvitesByUserID` |
| `infrastructure/persistence/dashboard_repository.go` | Реализация `FindMembershipForUserAndSalon` |
| `infrastructure/persistence/user_roles_repository.go` | JOIN с `salons` в `ListSalonMembershipsByUserID`, новый `CountPendingInvitesByUserID` |
| `service/dashboard.go` | `MembershipForSalon` вместо `Membership` |
| `service/dashboard_appointment.go` | Обновить вызов `Membership` → `MembershipForSalon` |
| `service/user_roles_service.go` | Новый формат `Resolve` с `SalonMemberships` |
| `service/auth.go` | `claimPendingMemberInvites` после OTP |
| `infrastructure/persistence/model/models.go` | Новые модели: `SalonMemberInvite` |

### Бэкенд — новые файлы

| Файл | Описание |
|------|----------|
| `migrations/000024_staff_management.up.sql` | Enum + `salon_member_invites` |
| `migrations/000024_staff_management.down.sql` | Откат |
| `repository/salon_member_invite.go` | Интерфейс `SalonMemberInviteRepository` |
| `infrastructure/persistence/salon_member_invite_repository.go` | Реализация |
| `service/salon_member_invite_service.go` | Бизнес-логика инвайтов |
| `controller/salon_member_invite_controller.go` | HTTP хендлеры `/staff-invites` |

### Фронтенд — изменение существующих

| Файл | Что меняется |
|------|-------------|
| `shared/config/routes.ts` | `DASHBOARD: '/dashboard/:salonId'`, хелперы `dashboardPath` |
| `shared/api/authApi.ts` | Тип `effectiveRoles` → `salonMemberships[]` |
| `shared/api/rtkApi.ts` | `X-Salon-Id` в `prepareHeaders` |
| `shared/api/dashboardApi.ts` | `X-Salon-Id` в запросы |
| `shared/api/meApi.ts` | Обновить тип `EffectiveRoles` |
| `app/App.tsx` | Роут `/dashboard/:salonId/*` |
| `pages/dashboard/ui/DashboardPage.tsx` | `useParams`, валидация, `role` context, скрытие секций, cache reset |
| `features/user-menu/ui/UserMenu.tsx` | Список салонов вместо одной кнопки |

### Фронтенд — новые файлы

| Файл | Описание |
|------|----------|
| `pages/dashboard/ui/views/PersonnelView.tsx` | Список персонала + инвайтов |
| `pages/dashboard/ui/drawers/InviteStaffDrawer.tsx` | Форма приглашения сотрудника |
| `shared/lib/activeSalon.ts` | `getActiveSalonId()` / `setActiveSalonId()` |
| `entities/salon-invite/` | RTK Query endpoints для инвайтов |

---

## Seed для разработки

```sql
-- Создать тестового admin и receptionist для существующего салона
-- (salon_id и user_id подставить из dev-данных)

INSERT INTO salon_members (salon_id, user_id, role) VALUES
    ('...salon-uuid...', '...admin-user-uuid...', 'admin'),
    ('...salon-uuid...', '...recept-user-uuid...', 'receptionist');
```

---

## Открытые вопросы

1. **Удаление члена** — soft-delete (добавить `left_at` в `salon_members`) или hard delete? Для MVP — hard delete; аудит через `salon_member_invites.status = accepted` + `created_at`.
2. **Смена роли** — может ли owner понизить admin до receptionist? Да, через `PUT /staff-invites/:id` или отдельный эндпоинт `PUT /salon-members/:userId/role`.
3. **Самоудаление** — может ли admin уйти сам? Да, через `/me/salon-memberships/:salonId` DELETE. Owner уйти не может (единственный owner).
