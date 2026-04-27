# Client CRUD Drawers — Design Spec

**Date:** 2026-04-26  
**Status:** Approved

## Overview

Replace the page-based `ClientDetailView` (route `/dashboard/clients/:id`) with a drawer-based CRUD UI mirroring the `DashboardAppointments` / `AppointmentDrawer` pattern. Add full CRUD: create, read, update, soft-delete, restore.

---

## Backend

### New endpoints (`salon_client_controller.go`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/dashboard/clients` | Create client |
| `DELETE` | `/api/v1/dashboard/clients/:id` | Soft delete (sets `deleted_at`) |
| `POST` | `/api/v1/dashboard/clients/:id/restore` | Restore soft-deleted client |

**`POST /clients`** body: `{ displayName: string, phoneE164?: string }` → returns `clientOut` (201).

**`DELETE /clients/:id`** — sets `deleted_at = now()` on the record. Returns 204. If already deleted, returns 409.

**`POST /clients/:id/restore`** — sets `deleted_at = NULL`. Returns updated `clientOut`.

**`GET /clients`** — adds optional query param `include_deleted=true`. When absent, filters `deleted_at IS NULL` (default behaviour unchanged).

**`PUT /clients/:id`** — returns 404 if client is soft-deleted.

### Schema change

```sql
ALTER TABLE salon_clients ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
```

### `clientOut` — new field

```go
DeletedAt *time.Time `json:"deletedAt,omitempty"`
```

### Service methods to add

- `CreateClient(ctx, salonID, displayName, phoneE164) (*SalonClientRow, error)`
- `DeleteClient(ctx, salonID, clientID) error`
- `RestoreClient(ctx, salonID, clientID) (*SalonClientRow, error)`

### Repository changes

- `ListClients` filter: `WHERE deleted_at IS NULL` by default; skip filter when `includeDead = true`
- Add `CreateClient`, `DeleteClient`, `RestoreClient` repository methods

---

## Frontend

### Architecture decision

Drawer state managed via Redux (mirrors `appointmentDrawerData` in `appointmentSlice`). `ShowClientsGrid` dispatches Redux actions instead of calling `navigate`.

---

### `entities/client/` — full migration from `shared/api/clientsApi.ts`

**`model/types.ts`** — add/move types:

```ts
// existing, add deletedAt
interface SalonClient {
  ...
  deletedAt?: string | null
}

// move from shared
interface ClientAppointmentRow { ... }
interface ClientAppointmentListResponse { ... }
interface ClientListResponse { ... }
```

**`model/clientApi.ts`** — add RTK endpoints:

| Hook | Method | Path |
|------|--------|------|
| `useCreateClientMutation` | POST | `/clients` |
| `useUpdateClientMutation` | PUT | `/clients/:id` |
| `useDeleteClientMutation` | DELETE | `/clients/:id` |
| `useRestoreClientMutation` | POST | `/clients/:id/restore` |
| `useGetClientAppointmentsQuery` | GET | `/clients/:id/appointments` |
| `useAssignTagMutation` | POST | `/clients/:id/tags` |
| `useRemoveTagMutation` | DELETE | `/clients/:id/tags/:tagId` |
| `useCreateTagMutation` | POST | `/clients/tags` |
| `useMergeClientToUserMutation` | POST | `/clients/:id/merge` |

All mutations invalidate `['Clients']` tag.

**`model/clientSlice.ts`** — add drawer state:

```ts
interface ClientDrawerData {
  mode: 'view' | 'create' | null
  id: string | null
}

// new actions
openClientDrawer(payload: { mode: 'view' | 'create'; id?: string | null })
closeClientDrawer()
```

**`index.ts`** — re-export all new hooks and actions.

**`shared/api/clientsApi.ts`** — delete after migration (no remaining consumers once `ClientDetailView` is removed).

---

### `features/clients/create-client/ui/CreateClientDrawer.tsx`

Right-side drawer, 440px wide (same as `CreateAppointmentDrawer`).

Fields:
- **Имя** — required `TextField`
- **Телефон** — optional `TextField`, placeholder `+7 (___) ___ - __ - __`

On submit: calls `useCreateClientMutation`, closes drawer, invalidates `Clients` cache.  
Error shown inline (red box, same style as `CreateAppointmentDrawer`).  
Footer: «Создать клиента» button; subtitle «Клиент будет добавлен в базу салона».

---

### `widgets/client-detail-drawer/ui/ClientDetailDrawer.tsx`

Right-side drawer, 440px wide. Opens when `clientDrawerData.mode === 'view'`.  
Loads client via `useGetClientByIdQuery(id)` — shows `CircularProgress` while loading.

Sections (same content as current `ClientDetailView`):
1. **Имя** — inline edit (click pencil → `TextField` + save/cancel)
2. **Контакт** — телефон, аккаунт, кнопка «Привязать к аккаунту» если нет `userId`
3. **Статистика** — визиты всего / за 30 дней / за 90 дней
4. **Теги** — chips (toggle assign/remove) + форма создания нового тега
5. **Заметки** — `TextField` multiline, auto-save on blur
6. **История визитов** — таблица через `useGetClientAppointmentsQuery`

Footer:
- Если клиент активен: кнопка **«Удалить клиента»** (outlined, red) → диалог подтверждения → `useDeleteClientMutation` → закрыть drawer
- Если клиент удалён (`deletedAt` не null): кнопка **«Восстановить»** (outlined, green) → `useRestoreClientMutation` → закрыть drawer

---

### `features/clients/show-clients/`

**`ShowClientsGrid.tsx`**:
- Replace `const navigate = useNavigate()` and `navigate(...)` with `dispatch(openClientDrawer({ mode: 'view', id: params.row.id }))`
- Add `isRowDisabled={row => !!row.deletedAt}` prop to `RenderTable`

**`FilterClientsBar.tsx`**:
- Add `Switch` «Показать неактивные» → updates `filters.includeDead: boolean`
- Add **«+ Добавить клиента»** button → dispatches `openClientDrawer({ mode: 'create', id: null })`

**`model/columns.tsx`**:
- Add **«Статус»** column: renders `"Активный"` (green chip) or `"Неактивный"` (grey chip) based on `row.deletedAt`

**`FilterState` type** — add `includeDead: boolean` field; default `false`.

---

### `ClientsListView.tsx`

Add both drawers and read drawer state from Redux:

```tsx
const drawerData = useAppSelector(state => state.client.clientDrawerData)
const isCreateOpen = drawerData.mode === 'create'
const isViewOpen = drawerData.mode === 'view' && Boolean(drawerData.id)

// render:
<CreateClientDrawer open={isCreateOpen} onClose={() => dispatch(closeClientDrawer())} />
<ClientDetailDrawer open={isViewOpen} clientId={drawerData.id} onClose={() => dispatch(closeClientDrawer())} />
```

---

### `DashboardPage.tsx`

- Remove `<Route path="clients/:clientId" element={<ClientDetailView />} />`
- Remove import of `ClientDetailView`
- Remove `clientMatch` / related header title logic for client detail

### Files to delete

- `frontend/src/pages/dashboard/ui/ClientDetailView.tsx`

---

## Backlog

Migrate remaining `shared/api/*` modules to their `entities/*` counterparts using the same pattern:
- `shared/api/dashboardApi.ts` → `entities/appointment`, `entities/staff`, `entities/service`
- `shared/api/appointmentsApi.ts` → `entities/appointment`

---

## Out of scope

- Hard delete
- Bulk delete
- Pagination in appointment history within drawer (loads first 25, consistent with current `ClientDetailView`)
