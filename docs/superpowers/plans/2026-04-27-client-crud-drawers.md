# Client CRUD Drawers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace page-based `ClientDetailView` with drawer-based full CRUD (create, read, update, soft-delete, restore) mirroring the `DashboardAppointments` / `AppointmentDrawer` pattern.

**Architecture:** Redux drawer state (`clientDrawerData`) controls two drawers in `ClientsListView`. All client API calls consolidate into `entities/client` (RTK). Soft delete uses GORM's built-in `gorm.DeletedAt` so all queries automatically exclude deleted clients; `Unscoped()` is used for listing/restoring deleted ones.

**Tech Stack:** Go/GORM (backend), React/TypeScript, Redux Toolkit + RTK Query, MUI v6, `@mui/x-data-grid-premium`

---

## File Map

**Created:**
- `backend/migrations/000022_salon_clients_soft_delete.up.sql`
- `backend/migrations/000022_salon_clients_soft_delete.down.sql`
- `frontend/src/features/clients/create-client/ui/CreateClientDrawer.tsx`
- `frontend/src/widgets/client-detail-drawer/ui/ClientDetailDrawer.tsx`

**Modified:**
- `backend/internal/infrastructure/persistence/model/models.go` — add `DeletedAt gorm.DeletedAt`
- `backend/internal/repository/salon_client.go` — add `IncludeDeleted` to filter, add `SoftDelete`/`Restore` to interface
- `backend/internal/infrastructure/persistence/salon_client_repository.go` — implement soft delete/restore/list with deleted
- `backend/internal/service/salon_client_service.go` — add `CreateClient`, `DeleteClient`, `RestoreClient`
- `backend/internal/controller/salon_client_controller.go` — add `POST /clients`, `DELETE /:id`, `POST /:id/restore`, update `listClients`
- `frontend/src/entities/client/model/types.ts` — add `deletedAt`, new types
- `frontend/src/entities/client/model/clientApi.ts` — add all new RTK endpoints
- `frontend/src/entities/client/model/clientSlice.ts` — add drawer state
- `frontend/src/entities/client/index.ts` — re-export new hooks/actions
- `frontend/src/features/clients/show-clients/model/columns.tsx` — add Status column
- `frontend/src/features/clients/show-clients/ui/FilterClientsBar.tsx` — add Switch + add button
- `frontend/src/features/clients/show-clients/ui/ShowClientsGrid.tsx` — dispatch instead of navigate, isRowDisabled
- `frontend/src/pages/dashboard/ui/ClientsListView.tsx` — add both drawers
- `frontend/src/pages/dashboard/ui/DashboardPage.tsx` — remove client route

**Deleted:**
- `frontend/src/shared/api/clientsApi.ts`
- `frontend/src/pages/dashboard/ui/ClientDetailView.tsx`

---

## Task 1: DB migration — add `deleted_at` to `salon_clients`

**Files:**
- Create: `backend/migrations/000022_salon_clients_soft_delete.up.sql`
- Create: `backend/migrations/000022_salon_clients_soft_delete.down.sql`

- [ ] **Step 1: Create up migration**

```sql
-- backend/migrations/000022_salon_clients_soft_delete.up.sql
-- +migrate Up

ALTER TABLE salon_clients
    ADD COLUMN deleted_at TIMESTAMPTZ NULL DEFAULT NULL;

CREATE INDEX idx_salon_clients_deleted_at
    ON salon_clients (deleted_at)
    WHERE deleted_at IS NOT NULL;
```

- [ ] **Step 2: Create down migration**

```sql
-- backend/migrations/000022_salon_clients_soft_delete.down.sql
-- +migrate Down

DROP INDEX IF EXISTS idx_salon_clients_deleted_at;

ALTER TABLE salon_clients
    DROP COLUMN IF EXISTS deleted_at;
```

- [ ] **Step 3: Run migration**

```bash
# From backend/
migrate -path migrations -database "$DATABASE_URL" up
```

Expected: `000022/u salon_clients_soft_delete OK`

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/000022_salon_clients_soft_delete.up.sql \
        backend/migrations/000022_salon_clients_soft_delete.down.sql
git commit -m "feat(db): add soft delete column to salon_clients"
```

---

## Task 2: Add `DeletedAt` to `SalonClient` GORM model

**Files:**
- Modify: `backend/internal/infrastructure/persistence/model/models.go:371-390`

- [ ] **Step 1: Add the field**

In `models.go`, update the `SalonClient` struct (currently at line ~372):

```go
// SalonClient maps to salon_clients.
type SalonClient struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey"`
	SalonID     uuid.UUID      `gorm:"type:uuid;not null;column:salon_id"`
	UserID      *uuid.UUID     `gorm:"type:uuid;column:user_id"`
	PhoneE164   *string        `gorm:"column:phone_e164"`
	DisplayName string         `gorm:"column:display_name;not null"`
	Notes       *string        `gorm:"column:notes"`
	DeletedAt   gorm.DeletedAt `gorm:"column:deleted_at;index"`
	CreatedAt   time.Time      `gorm:"column:created_at;not null;autoCreateTime"`
	UpdatedAt   time.Time      `gorm:"column:updated_at;not null;autoUpdateTime"`
}
```

Make sure `"gorm.io/gorm"` is already in the import block (it will be, since `BeforeCreate` uses it).

- [ ] **Step 2: Verify build**

```bash
cd backend && go build ./...
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/infrastructure/persistence/model/models.go
git commit -m "feat(model): add gorm.DeletedAt soft-delete field to SalonClient"
```

---

## Task 3: Repository — interface + implementation for soft delete/restore + `IncludeDeleted` filter

**Files:**
- Modify: `backend/internal/repository/salon_client.go`
- Modify: `backend/internal/infrastructure/persistence/salon_client_repository.go`

- [ ] **Step 1: Add `IncludeDeleted` to filter and new methods to interface**

Replace `SalonClientListFilter` and `SalonClientRepository` in `backend/internal/repository/salon_client.go`:

```go
// SalonClientListFilter filters the salon client list.
type SalonClientListFilter struct {
	Search         string
	TagIDs         []uuid.UUID
	Page           int
	PageSize       int
	IncludeDeleted bool
}

// SalonClientRepository reads/writes salon client data.
type SalonClientRepository interface {
	ListBysalon(ctx context.Context, salonID uuid.UUID, f SalonClientListFilter) ([]SalonClientRow, int64, error)
	GetByID(ctx context.Context, salonID, clientID uuid.UUID) (*SalonClientRow, error)
	Create(ctx context.Context, c *model.SalonClient) error
	Update(ctx context.Context, c *model.SalonClient) error
	SoftDelete(ctx context.Context, salonID, clientID uuid.UUID) error
	Restore(ctx context.Context, salonID, clientID uuid.UUID) (*SalonClientRow, error)

	GetOrCreateByPhone(ctx context.Context, salonID uuid.UUID, phone, displayName string) (*model.SalonClient, error)
	GetOrCreateByUserID(ctx context.Context, salonID, userID uuid.UUID, displayName string) (*model.SalonClient, error)
	MergeGuestToUser(ctx context.Context, salonID, clientID, userID uuid.UUID) (*model.SalonClient, error)

	ListTags(ctx context.Context, salonID uuid.UUID) ([]model.SalonClientTag, error)
	CreateTag(ctx context.Context, t *model.SalonClientTag) error
	AssignTag(ctx context.Context, salonClientID, tagID uuid.UUID) error
	RemoveTag(ctx context.Context, salonClientID, tagID uuid.UUID) error

	ListClientAppointments(ctx context.Context, salonID, clientID uuid.UUID, page, pageSize int) ([]AppointmentListRow, int64, error)
}
```

- [ ] **Step 2: Update `ListBysalon` in `salon_client_repository.go` to handle `IncludeDeleted`**

Find the line:
```go
base := r.db.WithContext(ctx).Model(&model.SalonClient{}).Where("salon_id = ?", salonID)
```

Replace it with:
```go
q := r.db.WithContext(ctx).Model(&model.SalonClient{})
if f.IncludeDeleted {
    q = q.Unscoped()
}
base := q.Where("salon_id = ?", salonID)
```

- [ ] **Step 3: Add `SoftDelete` implementation to `salon_client_repository.go`**

Add after the `Update` method:

```go
func (r *salonClientRepository) SoftDelete(ctx context.Context, salonID, clientID uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("id = ? AND salon_id = ?", clientID, salonID).
		Delete(&model.SalonClient{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("client not found")
	}
	return nil
}
```

- [ ] **Step 4: Add `Restore` implementation to `salon_client_repository.go`**

Add after `SoftDelete`:

```go
func (r *salonClientRepository) Restore(ctx context.Context, salonID, clientID uuid.UUID) (*SalonClientRow, error) {
	var c model.SalonClient
	err := r.db.WithContext(ctx).Unscoped().
		Where("id = ? AND salon_id = ? AND deleted_at IS NOT NULL", clientID, salonID).
		First(&c).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("client not found or not deleted")
		}
		return nil, err
	}
	if err := r.db.WithContext(ctx).Unscoped().Model(&c).Update("deleted_at", nil).Error; err != nil {
		return nil, err
	}
	return r.GetByID(ctx, salonID, clientID)
}
```

Make sure `"fmt"` is in the import block (it already is via other methods).

- [ ] **Step 5: Build**

```bash
cd backend && go build ./...
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/repository/salon_client.go \
        backend/internal/infrastructure/persistence/salon_client_repository.go
git commit -m "feat(repo): add soft delete, restore, includeDead filter to SalonClientRepository"
```

---

## Task 4: Service — add `CreateClient`, `DeleteClient`, `RestoreClient`

**Files:**
- Modify: `backend/internal/service/salon_client_service.go`

- [ ] **Step 1: Extend the `SalonClientService` interface**

Add three new methods to the `SalonClientService` interface:

```go
type SalonClientService interface {
	ListClients(ctx context.Context, salonID uuid.UUID, f repository.SalonClientListFilter) ([]repository.SalonClientRow, int64, error)
	GetClient(ctx context.Context, salonID, clientID uuid.UUID) (*repository.SalonClientRow, error)
	CreateClient(ctx context.Context, salonID uuid.UUID, displayName, phoneE164 string) (*repository.SalonClientRow, error)
	UpdateClient(ctx context.Context, salonID, clientID uuid.UUID, displayName *string, notes *string) (*repository.SalonClientRow, error)
	DeleteClient(ctx context.Context, salonID, clientID uuid.UUID) error
	RestoreClient(ctx context.Context, salonID, clientID uuid.UUID) (*repository.SalonClientRow, error)
	MergeToUser(ctx context.Context, salonID, clientID, userID uuid.UUID) (*model.SalonClient, error)

	GetOrCreateByPhone(ctx context.Context, salonID uuid.UUID, phone, name string) (*model.SalonClient, error)
	GetOrCreateByUserID(ctx context.Context, salonID, userID uuid.UUID, displayName string) (*model.SalonClient, error)

	ListTags(ctx context.Context, salonID uuid.UUID) ([]model.SalonClientTag, error)
	CreateTag(ctx context.Context, salonID uuid.UUID, name, color string) (*model.SalonClientTag, error)
	AssignTag(ctx context.Context, salonID, clientID, tagID uuid.UUID) error
	RemoveTag(ctx context.Context, salonID, clientID, tagID uuid.UUID) error

	ListClientAppointments(ctx context.Context, salonID, clientID uuid.UUID, page, pageSize int) ([]repository.AppointmentListRow, int64, error)
}
```

- [ ] **Step 2: Implement `CreateClient`**

Add after `GetClient`:

```go
func (s *salonClientService) CreateClient(ctx context.Context, salonID uuid.UUID, displayName, phoneE164 string) (*repository.SalonClientRow, error) {
	displayName = strings.TrimSpace(displayName)
	if displayName == "" {
		return nil, fmt.Errorf("display_name is required")
	}
	c := &model.SalonClient{
		SalonID:     salonID,
		DisplayName: displayName,
	}
	if p := strings.TrimSpace(phoneE164); p != "" {
		c.PhoneE164 = &p
	}
	if err := s.repo.Create(ctx, c); err != nil {
		return nil, err
	}
	return s.repo.GetByID(ctx, salonID, c.ID)
}
```

- [ ] **Step 3: Implement `DeleteClient` and `RestoreClient`**

Add after `UpdateClient`:

```go
func (s *salonClientService) DeleteClient(ctx context.Context, salonID, clientID uuid.UUID) error {
	return s.repo.SoftDelete(ctx, salonID, clientID)
}

func (s *salonClientService) RestoreClient(ctx context.Context, salonID, clientID uuid.UUID) (*repository.SalonClientRow, error) {
	return s.repo.Restore(ctx, salonID, clientID)
}
```

- [ ] **Step 4: Build**

```bash
cd backend && go build ./...
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/service/salon_client_service.go
git commit -m "feat(service): add CreateClient, DeleteClient, RestoreClient to SalonClientService"
```

---

## Task 5: Controller — new endpoints + `deletedAt` in response

**Files:**
- Modify: `backend/internal/controller/salon_client_controller.go`

- [ ] **Step 1: Add `DeletedAt` to `clientOut` and `toClientOut`**

Update `clientOut` struct (currently at line ~112):

```go
type clientOut struct {
	ID              uuid.UUID      `json:"id"`
	SalonID         uuid.UUID      `json:"salonId"`
	UserID          *uuid.UUID     `json:"userId,omitempty"`
	PhoneE164       *string        `json:"phoneE164,omitempty"`
	DisplayName     string         `json:"displayName"`
	Notes           *string        `json:"notes,omitempty"`
	Tags            []clientTagOut `json:"tags"`
	VisitCount      int64          `json:"visitCount"`
	LastVisitAt     *time.Time     `json:"lastVisitAt,omitempty"`
	UserPhone       *string        `json:"userPhone,omitempty"`
	UserDisplayName *string        `json:"userDisplayName,omitempty"`
	DeletedAt       *time.Time     `json:"deletedAt,omitempty"`
	CreatedAt       time.Time      `json:"createdAt"`
}
```

Update `toClientOut` to populate `DeletedAt`:

```go
func toClientOut(row repository.SalonClientRow) clientOut {
	tags := make([]clientTagOut, len(row.Tags))
	for i, t := range row.Tags {
		tags[i] = clientTagOut{ID: t.ID, SalonID: t.SalonID, Name: t.Name, Color: t.Color}
	}
	out := clientOut{
		ID:              row.Client.ID,
		SalonID:         row.Client.SalonID,
		UserID:          row.Client.UserID,
		PhoneE164:       row.Client.PhoneE164,
		DisplayName:     row.Client.DisplayName,
		Notes:           row.Client.Notes,
		Tags:            tags,
		VisitCount:      row.VisitCount,
		LastVisitAt:     row.LastVisitAt,
		UserPhone:       row.UserPhone,
		UserDisplayName: row.UserDisplayName,
		CreatedAt:       row.Client.CreatedAt,
	}
	if row.Client.DeletedAt.Valid {
		t := row.Client.DeletedAt.Time
		out.DeletedAt = &t
	}
	return out
}
```

- [ ] **Step 2: Add new routes to `HandleClients`**

Update the `len(parts) == 1` block to also handle `POST`:

```go
if len(parts) == 1 {
    switch r.Method {
    case http.MethodGet:
        h.listClients(w, r, salonID)
    case http.MethodPost:
        h.createClient(w, r, salonID)
    default:
        http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
    }
    return
}
```

Update the `len(parts) == 2` block to also handle `DELETE`:

```go
if len(parts) == 2 {
    switch r.Method {
    case http.MethodGet:
        h.getClient(w, r, salonID, clientID)
    case http.MethodPut:
        h.updateClient(w, r, salonID, clientID)
    case http.MethodDelete:
        h.deleteClient(w, r, salonID, clientID)
    default:
        http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
    }
    return
}
```

Add `"restore"` case to the `switch parts[2]` block:

```go
case "restore":
    if len(parts) == 3 && r.Method == http.MethodPost {
        h.restoreClient(w, r, salonID, clientID)
        return
    }
```

- [ ] **Step 3: Update `listClients` to support `include_deleted`**

In `listClients`, add before `rows, total, err := h.svc.ListClients(...)`:

```go
f.IncludeDeleted = q.Get("include_deleted") == "true"
```

- [ ] **Step 4: Add `createClient` handler**

Add after `updateClient`:

```go
func (h *SalonClientController) createClient(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	var body struct {
		DisplayName string `json:"displayName"`
		PhoneE164   string `json:"phoneE164"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid json", http.StatusBadRequest)
		return
	}
	row, err := h.svc.CreateClient(r.Context(), salonID, body.DisplayName, body.PhoneE164)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(toClientOut(*row))
}
```

- [ ] **Step 5: Add `deleteClient` and `restoreClient` handlers**

Add after `createClient`:

```go
func (h *SalonClientController) deleteClient(w http.ResponseWriter, r *http.Request, salonID, clientID uuid.UUID) {
	if err := h.svc.DeleteClient(r.Context(), salonID, clientID); err != nil {
		if err.Error() == "client not found" {
			jsonError(w, "not found", http.StatusNotFound)
			return
		}
		h.log.Error("delete client", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *SalonClientController) restoreClient(w http.ResponseWriter, r *http.Request, salonID, clientID uuid.UUID) {
	row, err := h.svc.RestoreClient(r.Context(), salonID, clientID)
	if err != nil {
		if err.Error() == "client not found or not deleted" {
			jsonError(w, "not found", http.StatusNotFound)
			return
		}
		h.log.Error("restore client", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(toClientOut(*row))
}
```

- [ ] **Step 6: Build**

```bash
cd backend && go build ./...
```

Expected: no errors.

- [ ] **Step 7: Smoke test the new endpoints**

```bash
# Replace TOKEN and IDs with real values from your dev environment
curl -s -X POST http://localhost:8080/api/v1/dashboard/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Test Client","phoneE164":"+79001234567"}' | jq .

# Take the id from the response and test soft delete:
curl -s -X DELETE http://localhost:8080/api/v1/dashboard/clients/<id> \
  -H "Authorization: Bearer $TOKEN"
# Expected: 204 No Content

# Verify it's hidden from list:
curl -s "http://localhost:8080/api/v1/dashboard/clients" \
  -H "Authorization: Bearer $TOKEN" | jq '.items | length'

# Verify it appears with include_deleted:
curl -s "http://localhost:8080/api/v1/dashboard/clients?include_deleted=true" \
  -H "Authorization: Bearer $TOKEN" | jq '.items[-1].deletedAt'

# Restore:
curl -s -X POST http://localhost:8080/api/v1/dashboard/clients/<id>/restore \
  -H "Authorization: Bearer $TOKEN" | jq .deletedAt
# Expected: null
```

- [ ] **Step 8: Commit**

```bash
git add backend/internal/controller/salon_client_controller.go
git commit -m "feat(api): add create/delete/restore client endpoints with soft delete"
```

---

## Task 6: Frontend — update `entities/client/model/types.ts`

**Files:**
- Modify: `frontend/src/entities/client/model/types.ts`

- [ ] **Step 1: Replace full file content**

```typescript
// src/entities/client/model/types.ts

export interface ClientTag {
  id: string
  salonId?: string | null
  name: string
  color: string
}

export interface SalonClient {
  id: string
  salonId: string
  userId?: string | null
  phoneE164?: string | null
  displayName: string
  notes?: string | null
  tags: ClientTag[]
  visitCount: number
  lastVisitAt?: string | null
  userPhone?: string | null
  userDisplayName?: string | null
  deletedAt?: string | null
  createdAt: string
}

export interface ClientListResponse {
  items: SalonClient[]
  total: number
}

export interface ClientListRequest {
  search?: string
  tagIds?: string[]
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
  includeDead?: boolean
}

export interface ClientFilterState {
  search: string
  tagIds: string[]
  includeDead: boolean
}

export interface ClientAppointmentRow {
  id: string
  startsAt: string
  endsAt: string
  status: string
  serviceName: string
  staffName?: string | null
  clientLabel: string
  clientPhone?: string | null
}

export interface ClientAppointmentListResponse {
  items: ClientAppointmentRow[]
  total: number
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only from files that still import from `shared/api/clientsApi` (those will be fixed in Task 10).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/entities/client/model/types.ts
git commit -m "feat(entities/client): add deletedAt, ClientAppointmentRow, includeDead to types"
```

---

## Task 7: Frontend — update `entities/client/model/clientApi.ts`

**Files:**
- Modify: `frontend/src/entities/client/model/clientApi.ts`

- [ ] **Step 1: Replace full file content**

```typescript
import { rtkApi } from '@shared/api/rtkApi'
import type {
  ClientListRequest,
  ClientListResponse,
  SalonClient,
  ClientTag,
  ClientAppointmentListResponse,
} from './types'

const clientApi = rtkApi.injectEndpoints({
  endpoints: builder => ({
    getClients: builder.query<ClientListResponse, ClientListRequest>({
      providesTags: ['Clients'],
      query: (params) => ({
        method: 'GET',
        url: '/clients',
        params: {
          search: params.search || undefined,
          tag_ids: params.tagIds?.length ? params.tagIds.join(',') : undefined,
          sort_by: params.sortBy || undefined,
          sort_dir: params.sortDir || undefined,
          page: params.page,
          page_size: params.pageSize,
          include_deleted: params.includeDead ? 'true' : undefined,
        },
      }),
    }),
    getClientTags: builder.query<ClientTag[], void>({
      providesTags: ['Clients'],
      query: () => ({ url: '/clients/tags' }),
    }),
    getClientById: builder.query<SalonClient, string>({
      providesTags: ['Clients'],
      query: id => ({ url: `/clients/${id}` }),
    }),
    getClientAppointments: builder.query<
      ClientAppointmentListResponse,
      { clientId: string; page?: number; pageSize?: number }
    >({
      providesTags: ['Clients'],
      query: ({ clientId, page = 1, pageSize = 25 }) => ({
        url: `/clients/${clientId}/appointments`,
        params: { page, page_size: pageSize },
      }),
    }),
    createClient: builder.mutation<SalonClient, { displayName: string; phoneE164?: string }>({
      invalidatesTags: ['Clients'],
      query: body => ({ method: 'POST', url: '/clients', body }),
    }),
    updateClient: builder.mutation<
      SalonClient,
      { id: string; body: { displayName?: string; notes?: string } }
    >({
      invalidatesTags: ['Clients'],
      query: ({ id, body }) => ({ method: 'PUT', url: `/clients/${id}`, body }),
    }),
    deleteClient: builder.mutation<void, string>({
      invalidatesTags: ['Clients'],
      query: id => ({ method: 'DELETE', url: `/clients/${id}` }),
    }),
    restoreClient: builder.mutation<SalonClient, string>({
      invalidatesTags: ['Clients'],
      query: id => ({ method: 'POST', url: `/clients/${id}/restore` }),
    }),
    assignTag: builder.mutation<void, { clientId: string; tagId: string }>({
      invalidatesTags: ['Clients'],
      query: ({ clientId, tagId }) => ({
        method: 'POST',
        url: `/clients/${clientId}/tags`,
        body: { tagId },
      }),
    }),
    removeTag: builder.mutation<void, { clientId: string; tagId: string }>({
      invalidatesTags: ['Clients'],
      query: ({ clientId, tagId }) => ({
        method: 'DELETE',
        url: `/clients/${clientId}/tags/${tagId}`,
      }),
    }),
    createClientTag: builder.mutation<ClientTag, { name: string; color: string }>({
      invalidatesTags: ['Clients'],
      query: body => ({ method: 'POST', url: '/clients/tags', body }),
    }),
    mergeClientToUser: builder.mutation<SalonClient, { clientId: string; userId: string }>({
      invalidatesTags: ['Clients'],
      query: ({ clientId, userId }) => ({
        method: 'POST',
        url: `/clients/${clientId}/merge`,
        body: { userId },
      }),
    }),
  }),
})

export const {
  useGetClientsQuery,
  useGetClientTagsQuery,
  useGetClientByIdQuery,
  useGetClientAppointmentsQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
  useRestoreClientMutation,
  useAssignTagMutation,
  useRemoveTagMutation,
  useCreateClientTagMutation,
  useMergeClientToUserMutation,
} = clientApi
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/entities/client/model/clientApi.ts
git commit -m "feat(entities/client): add all CRUD mutations and queries to clientApi RTK"
```

---

## Task 8: Frontend — update `entities/client/model/clientSlice.ts` with drawer state

**Files:**
- Modify: `frontend/src/entities/client/model/clientSlice.ts`

- [ ] **Step 1: Replace full file content**

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { ClientFilterState } from './types'

interface ClientDrawerData {
  mode: 'view' | 'create' | null
  id: string | null
}

interface ClientState {
  filters: ClientFilterState
  clientDrawerData: ClientDrawerData
}

const initialState: ClientState = {
  filters: {
    search: '',
    tagIds: [],
    includeDead: false,
  },
  clientDrawerData: {
    mode: null,
    id: null,
  },
}

export const clientSlice = createSlice({
  name: 'client',
  initialState,
  reducers: {
    setClientFilters: (state, action: PayloadAction<ClientFilterState>) => {
      state.filters = action.payload
    },
    resetClientFilters: state => {
      state.filters = initialState.filters
    },
    openClientDrawer: (
      state,
      action: PayloadAction<{ mode: 'view' | 'create'; id?: string | null }>,
    ) => {
      state.clientDrawerData = {
        mode: action.payload.mode,
        id: action.payload.id ?? null,
      }
    },
    closeClientDrawer: state => {
      state.clientDrawerData = { mode: null, id: null }
    },
  },
})

export const {
  setClientFilters,
  resetClientFilters,
  openClientDrawer,
  closeClientDrawer,
} = clientSlice.actions
```

- [ ] **Step 2: Build check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/entities/client/model/clientSlice.ts
git commit -m "feat(entities/client): add clientDrawerData and drawer actions to clientSlice"
```

---

## Task 9: Frontend — update `entities/client/index.ts`

**Files:**
- Modify: `frontend/src/entities/client/index.ts`

- [ ] **Step 1: Replace file content**

```typescript
export * from './model/types'
export * from './model/clientSlice'
export * from './model/clientApi'
```

(File is already correct — verify it exports everything. No change needed if it already has these three lines.)

- [ ] **Step 2: Delete `shared/api/clientsApi.ts`**

```bash
rm frontend/src/shared/api/clientsApi.ts
```

- [ ] **Step 3: Build check — confirm only `ClientDetailView` still imports from shared**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "clientsApi" | head -20
```

Expected: errors only from `ClientDetailView.tsx` (which will be deleted in Task 17).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/entities/client/index.ts
git rm frontend/src/shared/api/clientsApi.ts
git commit -m "feat(entities/client): consolidate client API in entities, remove shared/api/clientsApi"
```

---

## Task 10: Frontend — add Status column to `columns.tsx`

**Files:**
- Modify: `frontend/src/features/clients/show-clients/model/columns.tsx`

- [ ] **Step 1: Add Status column to the array**

Add this column definition at the end of the `clientColumns` array (before the closing `]`):

```typescript
  {
    field: 'deletedAt',
    headerName: 'Статус',
    width: 130,
    sortable: false,
    renderCell: ({ row }) => (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          px: 1,
          py: 0.25,
          borderRadius: 1,
          fontSize: 11,
          fontWeight: 600,
          bgcolor: row.deletedAt ? 'rgba(255,255,255,.07)' : 'rgba(107,203,119,.15)',
          color: row.deletedAt ? V.textMuted : '#6BCB77',
        }}
      >
        {row.deletedAt ? 'Неактивный' : 'Активный'}
      </Box>
    ),
  },
```

- [ ] **Step 2: Build check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/clients/show-clients/model/columns.tsx
git commit -m "feat(show-clients): add Status column to client grid"
```

---

## Task 11: Frontend — update `FilterClientsBar` (add switch + add button)

**Files:**
- Modify: `frontend/src/features/clients/show-clients/ui/FilterClientsBar.tsx`

- [ ] **Step 1: Replace full file content**

```typescript
import { ChangeEvent, JSX, useRef, useState } from 'react'
import { Box, Chip, Stack, Switch, FormControlLabel, Button } from '@mui/material'
import { V } from '@shared/theme/palettes'
import type { ClientTag, ClientFilterState } from '@entities/client'

interface Props {
  filters: ClientFilterState
  tags: ClientTag[]
  setFilters: (f: ClientFilterState) => void
  onAddClient: () => void
}

export function FilterClientsBar({ filters, tags, setFilters, onAddClient }: Props): JSX.Element {
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [localSearch, setLocalSearch] = useState(filters.search)

  function onSearchChange(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setLocalSearch(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setFilters({ ...filters, search: v }), 300)
  }

  function toggleTag(id: string) {
    const next = filters.tagIds.includes(id)
      ? filters.tagIds.filter(x => x !== id)
      : [...filters.tagIds, id]
    setFilters({ ...filters, tagIds: next })
  }

  const hasActive = filters.tagIds.length > 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2.5 }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box
          component="input"
          type="text"
          placeholder="Поиск по имени или телефону..."
          value={localSearch}
          onChange={onSearchChange}
          sx={{
            px: '10px',
            py: '6px',
            borderRadius: V.rSm,
            border: `1px solid ${V.border}`,
            bgcolor: V.surface,
            color: V.text,
            fontSize: 12,
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s',
            width: 240,
            '&::placeholder': { color: V.textMuted },
            '&:focus': { borderColor: V.accent },
          }}
        />

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={filters.includeDead}
              onChange={(_, checked) => setFilters({ ...filters, includeDead: checked })}
            />
          }
          label={
            <Box component="span" sx={{ fontSize: 12, color: V.textMuted }}>
              Показать неактивные
            </Box>
          }
          sx={{ ml: 0.5, mr: 0 }}
        />

        {hasActive && (
          <Box
            component="button"
            onClick={() => setFilters({ ...filters, tagIds: [] })}
            sx={{
              px: '10px',
              py: '5px',
              border: `1px solid ${V.error}55`,
              borderRadius: V.rMd,
              bgcolor: V.errorSoft,
              color: V.error,
              fontSize: 11,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all 0.15s',
              '&:hover': { bgcolor: `${V.error}18` },
            }}
          >
            Сбросить теги ×
          </Box>
        )}

        <Button
          size="small"
          variant="contained"
          onClick={onAddClient}
          sx={{
            ml: 'auto',
            bgcolor: V.accent,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: '8px',
            px: 1.5,
            py: 0.5,
          }}
        >
          + Добавить клиента
        </Button>
      </Box>

      {tags.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {tags.map(tag => {
            const on = filters.tagIds.includes(tag.id)
            return (
              <Chip
                key={tag.id}
                label={tag.name}
                size="small"
                onClick={() => toggleTag(tag.id)}
                sx={{
                  bgcolor: on ? tag.color : 'transparent',
                  color: on ? '#fff' : V.text,
                  border: `1px solid ${tag.color}`,
                  fontWeight: on ? 600 : 400,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              />
            )
          })}
        </Stack>
      )}
    </Box>
  )
}
```

- [ ] **Step 2: Build check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: error in `ShowClientsGrid.tsx` because `onAddClient` prop is missing — fixed in Task 12.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/clients/show-clients/ui/FilterClientsBar.tsx
git commit -m "feat(show-clients): add 'Показать неактивные' switch and '+ Добавить клиента' button to FilterClientsBar"
```

---

## Task 12: Frontend — update `ShowClientsGrid` (dispatch + isRowDisabled + onAddClient)

**Files:**
- Modify: `frontend/src/features/clients/show-clients/ui/ShowClientsGrid.tsx`

- [ ] **Step 1: Replace full file content**

```typescript
import { JSX, useCallback, useMemo, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import {
  GridColDef,
  GridPaginationModel,
  GridRowParams,
  GridSortModel,
  GridToolbarColumnsButton,
  GridValidRowModel,
} from '@mui/x-data-grid-premium'
import RenderTable from '@shared/ui/DataGrid/RenderTable'
import { VELA_IVORY_PALETTE, V } from '@shared/theme/palettes'
import { useAppDispatch, useAppSelector } from '@app/store'
import {
  setClientFilters,
  openClientDrawer,
  useGetClientsQuery,
  useGetClientTagsQuery,
} from '@entities/client'
import type { SalonClient } from '@entities/client'
import { clientColumns } from '../model/columns'
import { showClientsGridSx } from './style'
import { FilterClientsBar } from './FilterClientsBar'

function ClientsToolbar(): JSX.Element {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: '4px' }}>
      <GridToolbarColumnsButton />
      <Box sx={{ flex: 1 }} />
    </Box>
  )
}

export function ShowClientsGrid(): JSX.Element {
  const dispatch = useAppDispatch()

  const filters = useAppSelector(state => state.client.filters)

  const fallbackSortModel = useMemo<GridSortModel>(
    () => [{ field: 'lastVisitAt', sort: 'desc' }],
    [],
  )
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  })
  const [sortModel, setSortModel] = useState<GridSortModel>(fallbackSortModel)

  const { data, isLoading, error } = useGetClientsQuery({
    search: filters.search || undefined,
    tagIds: filters.tagIds.length ? filters.tagIds : undefined,
    sortBy: sortModel[0]?.field,
    sortDir: sortModel[0]?.sort === 'asc' ? 'asc' : 'desc',
    page: paginationModel.page + 1,
    pageSize: paginationModel.pageSize,
    includeDead: filters.includeDead || undefined,
  })

  const { data: tags = [] } = useGetClientTagsQuery()

  const onSortModelChange = useCallback(
    (next: GridSortModel) => {
      setSortModel(next.length > 0 ? next : fallbackSortModel)
    },
    [fallbackSortModel],
  )

  const cols = useMemo(() => clientColumns as GridColDef<GridValidRowModel>[], [])

  const handleRowClick = (params: GridRowParams<SalonClient>) => {
    dispatch(openClientDrawer({ mode: 'view', id: params.row.id }))
  }

  const handleAddClient = () => {
    dispatch(openClientDrawer({ mode: 'create', id: null }))
  }

  return (
    <Box>
      <FilterClientsBar
        filters={filters}
        tags={tags}
        setFilters={next => dispatch(setClientFilters(next))}
        onAddClient={handleAddClient}
      />
      <RenderTable
        tableName="clients"
        rows={(data?.items ?? []) as GridValidRowModel[]}
        error={error}
        checkboxSelection={false}
        heightOffset={160}
        dashboardPalette={VELA_IVORY_PALETTE}
        sx={showClientsGridSx}
        minHeight={500}
        columns={cols}
        getRowId={r => r.id}
        loading={isLoading}
        pagination
        paginationMode="server"
        sortingMode="server"
        filterMode="server"
        rowCount={data?.total ?? 0}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sortModel={sortModel}
        onSortModelChange={onSortModelChange}
        pageSizeOptions={[25, 50, 100]}
        density="comfortable"
        disableColumnMenu
        disableRowSelectionOnClick
        onRowClick={handleRowClick}
        isRowDisabled={(params: GridRowParams<SalonClient>) => !!params.row.deletedAt}
        slots={{
          toolbar: () => <ClientsToolbar />,
          loadingOverlay: () => (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <CircularProgress size={32} sx={{ color: V.accent }} />
            </Box>
          ),
          noRowsOverlay: () => (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: V.textMuted,
                fontSize: 13,
              }}
            >
              Клиенты не найдены
            </Box>
          ),
        }}
      />
    </Box>
  )
}
```

- [ ] **Step 2: Build check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/clients/show-clients/ui/ShowClientsGrid.tsx
git commit -m "feat(show-clients): dispatch drawer actions instead of navigate, add isRowDisabled"
```

---

## Task 13: Frontend — create `CreateClientDrawer`

**Files:**
- Create: `frontend/src/features/clients/create-client/ui/CreateClientDrawer.tsx`

- [ ] **Step 1: Create directory**

```bash
mkdir -p frontend/src/features/clients/create-client/ui
```

- [ ] **Step 2: Create the file**

```typescript
// frontend/src/features/clients/create-client/ui/CreateClientDrawer.tsx
import { useState } from 'react'
import {
  Box,
  Button,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { useDashboardFormStyles } from '@pages/dashboard/theme/formStyles'
import { useCreateClientMutation } from '@entities/client'
import { useAppDispatch } from '@app/store'
import { closeClientDrawer } from '@entities/client'

export type CreateClientDrawerProps = {
  open: boolean
  onClose: () => void
}

export function CreateClientDrawer({ open, onClose }: CreateClientDrawerProps) {
  const d = useDashboardPalette()
  const { inputBaseSx } = useDashboardFormStyles()
  const dispatch = useAppDispatch()
  const [createClient, { isLoading }] = useCreateClientMutation()
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState({ displayName: '', phoneE164: '' })

  const handleClose = () => {
    setForm({ displayName: '', phoneE164: '' })
    setErr(null)
    onClose()
  }

  const handleSubmit = async () => {
    if (!form.displayName.trim()) return setErr('Введите имя клиента')
    setErr(null)
    try {
      await createClient({
        displayName: form.displayName.trim(),
        phoneE164: form.phoneE164.trim() || undefined,
      }).unwrap()
      dispatch(closeClientDrawer())
      handleClose()
    } catch {
      setErr('Ошибка при создании клиента')
    }
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      slotProps={{ backdrop: { sx: { bgcolor: d.backdrop, backdropFilter: 'blur(4px)' } } }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: '440px' },
          maxWidth: '100%',
          bgcolor: d.page,
          borderLeft: `1px solid ${d.border}`,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 2,
            borderBottom: `1px solid ${d.borderSubtle}`,
            bgcolor: d.card,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: d.text, lineHeight: 1.2 }}>
              Новый клиент
            </Typography>
            <Typography sx={{ fontSize: 12, color: d.mutedDark }}>
              Добавление в базу салона
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{ color: d.mutedDark, bgcolor: d.control, '&:hover': { bgcolor: d.controlHover } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Body */}
        <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 3 }}>
          <Stack spacing={2.5}>
            {err && (
              <Box
                sx={{
                  bgcolor: `${d.red}15`,
                  color: d.red,
                  px: 2,
                  py: 1.5,
                  borderRadius: '12px',
                  fontSize: 13,
                  border: `1px solid ${d.red}30`,
                }}
              >
                {err}
              </Box>
            )}

            <Box>
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>
                Имя клиента *
              </Typography>
              <TextField
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                fullWidth
                autoFocus
                placeholder="Иванова Мария"
                onKeyDown={e => { if (e.key === 'Enter') void handleSubmit() }}
                InputProps={{
                  startAdornment: (
                    <PersonOutlineIcon sx={{ color: d.mutedDark, fontSize: 18, mr: 1.5 }} />
                  ),
                }}
                sx={inputBaseSx}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>
                Телефон (необязательно)
              </Typography>
              <TextField
                value={form.phoneE164}
                onChange={e => setForm(f => ({ ...f, phoneE164: e.target.value }))}
                fullWidth
                placeholder="+7 (___) ___ - __ - __"
                InputProps={{
                  startAdornment: (
                    <PhoneOutlinedIcon sx={{ color: d.mutedDark, fontSize: 18, mr: 1.5 }} />
                  ),
                }}
                sx={inputBaseSx}
              />
            </Box>
          </Stack>
        </Box>

        {/* Footer */}
        <Box sx={{ p: 3, borderTop: `1px solid ${d.borderSubtle}`, bgcolor: d.card }}>
          <Button
            variant="contained"
            fullWidth
            disabled={isLoading}
            onClick={() => void handleSubmit()}
            sx={{
              bgcolor: d.accent,
              color: d.onAccent,
              py: 1.75,
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: 15,
              textTransform: 'none',
              boxShadow: `0 4px 14px ${d.accent}40`,
              '&:hover': {
                bgcolor: d.accent,
                boxShadow: `0 6px 20px ${d.accent}60`,
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s',
            }}
          >
            {isLoading ? 'Создание...' : 'Создать клиента'}
          </Button>
          <Typography sx={{ textAlign: 'center', mt: 1.5, fontSize: 11, color: d.mutedDark }}>
            Клиент будет добавлен в базу салона
          </Typography>
        </Box>
      </Box>
    </Drawer>
  )
}
```

- [ ] **Step 3: Build check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/clients/create-client/ui/CreateClientDrawer.tsx
git commit -m "feat(create-client): add CreateClientDrawer"
```

---

## Task 14: Frontend — create `ClientDetailDrawer` widget

**Files:**
- Create: `frontend/src/widgets/client-detail-drawer/ui/ClientDetailDrawer.tsx`

- [ ] **Step 1: Create directory**

```bash
mkdir -p frontend/src/widgets/client-detail-drawer/ui
```

- [ ] **Step 2: Create the file**

```typescript
// frontend/src/widgets/client-detail-drawer/ui/ClientDetailDrawer.tsx
import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { useDashboardFormStyles } from '@pages/dashboard/theme/formStyles'
import {
  useGetClientByIdQuery,
  useGetClientTagsQuery,
  useGetClientAppointmentsQuery,
  useUpdateClientMutation,
  useDeleteClientMutation,
  useRestoreClientMutation,
  useAssignTagMutation,
  useRemoveTagMutation,
  useCreateClientTagMutation,
  useMergeClientToUserMutation,
} from '@entities/client'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждена',
  completed: 'Завершена',
  cancelled_by_salon: 'Отмена',
  no_show: 'Не пришёл',
}

function formatDt(s: string): string {
  return new Date(s).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export type ClientDetailDrawerProps = {
  open: boolean
  clientId: string | null
  onClose: () => void
}

export function ClientDetailDrawer({ open, clientId, onClose }: ClientDetailDrawerProps) {
  const d = useDashboardPalette()
  const { inputBaseSx } = useDashboardFormStyles()

  const { data: client, isLoading } = useGetClientByIdQuery(clientId ?? '', {
    skip: !open || !clientId,
  })
  const { data: allTags = [] } = useGetClientTagsQuery(undefined, { skip: !open })
  const { data: apptData } = useGetClientAppointmentsQuery(
    { clientId: clientId ?? '', page: 1, pageSize: 25 },
    { skip: !open || !clientId },
  )
  const appointments = apptData?.items ?? []
  const apptTotal = apptData?.total ?? 0

  const [updateClient] = useUpdateClientMutation()
  const [deleteClient] = useDeleteClientMutation()
  const [restoreClient] = useRestoreClientMutation()
  const [assignTag] = useAssignTagMutation()
  const [removeTag] = useRemoveTagMutation()
  const [createClientTag] = useCreateClientTagMutation()
  const [mergeClientToUser] = useMergeClientToUserMutation()

  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState('')
  const [notesVal, setNotesVal] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeUserID, setMergeUserID] = useState('')
  const [mergeSaving, setMergeSaving] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6366F1')
  const [tagCreating, setTagCreating] = useState(false)

  // Sync editable fields when client data arrives or clientId changes
  useEffect(() => {
    if (client) {
      setNameVal(client.displayName)
      setNotesVal(client.notes ?? '')
      setEditingName(false)
    }
  }, [client?.id])

  async function saveName() {
    if (!clientId || !nameVal.trim()) return
    await updateClient({ id: clientId, body: { displayName: nameVal.trim() } })
    setEditingName(false)
  }

  async function saveNotes() {
    if (!clientId || !client) return
    setNotesSaving(true)
    try {
      await updateClient({ id: clientId, body: { notes: notesVal } })
    } finally {
      setNotesSaving(false)
    }
  }

  async function handleAssignTag(tagId: string) {
    if (!clientId || !client) return
    const has = client.tags.some(t => t.id === tagId)
    if (has) {
      await removeTag({ clientId, tagId })
    } else {
      await assignTag({ clientId, tagId })
    }
  }

  async function handleCreateTag() {
    if (!newTagName.trim() || !clientId) return
    setTagCreating(true)
    try {
      const t = await createClientTag({ name: newTagName.trim(), color: newTagColor }).unwrap()
      setNewTagName('')
      await assignTag({ clientId, tagId: t.id })
    } finally {
      setTagCreating(false)
    }
  }

  async function handleDelete() {
    if (!clientId) return
    await deleteClient(clientId)
    setDeleteDialogOpen(false)
    onClose()
  }

  async function handleRestore() {
    if (!clientId) return
    await restoreClient(clientId)
    onClose()
  }

  async function handleMerge() {
    if (!clientId || !mergeUserID.trim()) return
    setMergeSaving(true)
    try {
      await mergeClientToUser({ clientId, userId: mergeUserID.trim() })
      setMergeOpen(false)
    } finally {
      setMergeSaving(false)
    }
  }

  const recentAppts = appointments.filter(a => {
    const days = (Date.now() - new Date(a.startsAt).getTime()) / 86400000
    return days <= 30
  }).length
  const recentAppts90 = appointments.filter(a => {
    const days = (Date.now() - new Date(a.startsAt).getTime()) / 86400000
    return days <= 90
  }).length

  const isDeleted = Boolean(client?.deletedAt)

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{ backdrop: { sx: { bgcolor: d.backdrop, backdropFilter: 'blur(4px)' } } }}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: '520px' },
            maxWidth: '100%',
            bgcolor: d.page,
            borderLeft: `1px solid ${d.border}`,
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 3,
              py: 2,
              borderBottom: `1px solid ${d.borderSubtle}`,
              bgcolor: d.card,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: d.text, lineHeight: 1.2 }}>
                Клиент
              </Typography>
              <Typography sx={{ fontSize: 12, color: d.mutedDark }}>
                Просмотр и редактирование
              </Typography>
            </Box>
            <IconButton
              onClick={onClose}
              size="small"
              sx={{ color: d.mutedDark, bgcolor: d.control, '&:hover': { bgcolor: d.controlHover } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Body */}
          <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 3 }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={28} sx={{ color: d.accent }} />
              </Box>
            ) : !client ? (
              <Typography sx={{ color: d.muted }}>Клиент не найден</Typography>
            ) : (
              <Stack spacing={3}>
                {/* Name */}
                <Box>
                  {editingName ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        value={nameVal}
                        onChange={e => setNameVal(e.target.value)}
                        size="small"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') void saveName()
                          if (e.key === 'Escape') setEditingName(false)
                        }}
                        sx={inputBaseSx}
                      />
                      <Button size="small" variant="contained" onClick={() => void saveName()} sx={{ bgcolor: d.accent }}>
                        Сохранить
                      </Button>
                      <Button size="small" onClick={() => { setEditingName(false); setNameVal(client.displayName) }}>
                        Отмена
                      </Button>
                    </Stack>
                  ) : (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: d.text }}>
                        {client.displayName}
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => setEditingName(true)}
                        sx={{ color: d.muted, fontSize: 12, minWidth: 0 }}
                      >
                        ✏️
                      </Button>
                    </Stack>
                  )}
                </Box>

                {/* Contact */}
                <Box sx={{ bgcolor: d.card, border: `1px solid ${d.border}`, borderRadius: 2, p: 2.5 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: d.muted, mb: 1.5, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Контакт
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography sx={{ color: d.muted, fontSize: 13, width: 120 }}>Телефон</Typography>
                      <Typography sx={{ color: d.text, fontSize: 13 }}>
                        {client.phoneE164 ?? client.userPhone ?? '—'}
                      </Typography>
                    </Box>
                    {client.userId ? (
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Typography sx={{ color: d.muted, fontSize: 13, width: 120 }}>Аккаунт</Typography>
                        <Typography sx={{ color: d.green ?? d.accent, fontSize: 13 }}>
                          {client.userDisplayName ?? 'Зарегистрирован'}
                        </Typography>
                      </Box>
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setMergeOpen(true)}
                        sx={{ mt: 0.5, borderColor: d.border, color: d.text, fontSize: 12, alignSelf: 'flex-start' }}
                      >
                        Привязать к аккаунту
                      </Button>
                    )}
                  </Stack>
                </Box>

                {/* Stats */}
                <Stack direction="row" spacing={2}>
                  {[
                    { label: 'Всего визитов', value: client.visitCount },
                    { label: 'За 30 дней', value: recentAppts },
                    { label: 'За 90 дней', value: recentAppts90 },
                  ].map(s => (
                    <Box
                      key={s.label}
                      sx={{ bgcolor: d.card, border: `1px solid ${d.border}`, borderRadius: 2, p: 2, flex: 1, textAlign: 'center' }}
                    >
                      <Typography sx={{ fontSize: 22, fontWeight: 700, color: d.accent }}>{s.value}</Typography>
                      <Typography sx={{ fontSize: 12, color: d.muted }}>{s.label}</Typography>
                    </Box>
                  ))}
                </Stack>

                {/* Tags */}
                <Box sx={{ bgcolor: d.card, border: `1px solid ${d.border}`, borderRadius: 2, p: 2.5 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: d.muted, mb: 1.5, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Теги
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
                    {allTags.map(tag => {
                      const active = client.tags.some(t => t.id === tag.id)
                      return (
                        <Chip
                          key={tag.id}
                          label={tag.name}
                          size="small"
                          onClick={() => void handleAssignTag(tag.id)}
                          sx={{
                            bgcolor: active ? tag.color : 'transparent',
                            color: active ? '#fff' : d.text,
                            border: `1px solid ${tag.color}`,
                            cursor: 'pointer',
                            fontWeight: active ? 600 : 400,
                          }}
                        />
                      )
                    })}
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      placeholder="Новый тег"
                      size="small"
                      sx={{ width: 160, ...inputBaseSx }}
                    />
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={e => setNewTagColor(e.target.value)}
                      style={{ width: 36, height: 36, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4 }}
                    />
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!newTagName.trim() || tagCreating}
                      onClick={() => void handleCreateTag()}
                      sx={{ bgcolor: d.accent }}
                    >
                      Добавить
                    </Button>
                  </Stack>
                </Box>

                {/* Notes */}
                <Box sx={{ bgcolor: d.card, border: `1px solid ${d.border}`, borderRadius: 2, p: 2.5 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: d.muted, mb: 1.5, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Заметки
                  </Typography>
                  <TextField
                    multiline
                    minRows={3}
                    fullWidth
                    value={notesVal}
                    onChange={e => setNotesVal(e.target.value)}
                    onBlur={() => void saveNotes()}
                    placeholder="Заметки о клиенте..."
                    sx={inputBaseSx}
                  />
                  {notesSaving && (
                    <Typography sx={{ fontSize: 12, color: d.muted, mt: 0.5 }}>Сохранение...</Typography>
                  )}
                </Box>

                {/* Appointment history */}
                <Box sx={{ bgcolor: d.card, border: `1px solid ${d.border}`, borderRadius: 2, p: 2.5 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: d.muted, mb: 1.5, textTransform: 'uppercase', letterSpacing: 1 }}>
                    История визитов ({apptTotal})
                  </Typography>
                  {appointments.length === 0 ? (
                    <Typography sx={{ color: d.muted, fontSize: 14 }}>Визиты не найдены</Typography>
                  ) : (
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: d.text }}>
                      <Box component="thead">
                        <Box component="tr" sx={{ borderBottom: `1px solid ${d.border}` }}>
                          {['Дата', 'Услуга', 'Мастер', 'Статус'].map(h => (
                            <Box key={h} component="th" sx={{ textAlign: 'left', py: 1, px: 1, color: d.muted, fontWeight: 500 }}>
                              {h}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                      <Box component="tbody">
                        {appointments.map(a => (
                          <Box key={a.id} component="tr" sx={{ borderBottom: `1px solid ${d.borderSubtle}` }}>
                            <Box component="td" sx={{ py: 1, px: 1, whiteSpace: 'nowrap' }}>{formatDt(a.startsAt)}</Box>
                            <Box component="td" sx={{ py: 1, px: 1 }}>{a.serviceName}</Box>
                            <Box component="td" sx={{ py: 1, px: 1, color: d.muted }}>{a.staffName ?? '—'}</Box>
                            <Box component="td" sx={{ py: 1, px: 1 }}>
                              <Typography
                                component="span"
                                sx={{
                                  fontSize: 12,
                                  px: 1,
                                  py: 0.25,
                                  borderRadius: 1,
                                  bgcolor: a.status === 'completed'
                                    ? 'rgba(78,205,196,.15)'
                                    : a.status === 'pending'
                                    ? 'rgba(255,217,61,.15)'
                                    : 'rgba(255,255,255,.07)',
                                  color: a.status === 'completed'
                                    ? d.blue ?? d.accent
                                    : a.status === 'pending'
                                    ? d.yellow ?? d.accent
                                    : d.muted,
                                }}
                              >
                                {STATUS_LABELS[a.status] ?? a.status}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Stack>
            )}
          </Box>

          {/* Footer */}
          <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${d.borderSubtle}`, bgcolor: d.card }}>
            {client && (
              isDeleted ? (
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => void handleRestore()}
                  sx={{
                    borderColor: d.green,
                    color: d.green,
                    py: 1,
                    borderRadius: '12px',
                    fontWeight: 600,
                    textTransform: 'none',
                  }}
                >
                  Восстановить клиента
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setDeleteDialogOpen(true)}
                  sx={{
                    borderColor: d.red,
                    color: d.red,
                    py: 1,
                    borderRadius: '12px',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': { bgcolor: `${d.red}10`, borderColor: d.red },
                  }}
                >
                  Удалить клиента
                </Button>
              )
            )}
          </Box>
        </Box>
      </Drawer>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Удалить клиента?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 14 }}>
            Клиент будет скрыт из базы. Его можно восстановить через «Показать неактивные».
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" color="error" onClick={() => void handleDelete()}>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Merge dialog */}
      <Dialog open={mergeOpen} onClose={() => setMergeOpen(false)}>
        <DialogTitle>Привязать к аккаунту</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 14, mb: 2 }}>Введите UUID пользователя:</Typography>
          <TextField
            fullWidth
            size="small"
            value={mergeUserID}
            onChange={e => setMergeUserID(e.target.value)}
            placeholder="user-uuid"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            disabled={!mergeUserID.trim() || mergeSaving}
            onClick={() => void handleMerge()}
          >
            Привязать
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 3: Build check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/widgets/client-detail-drawer/ui/ClientDetailDrawer.tsx
git commit -m "feat(widgets): add ClientDetailDrawer"
```

---

## Task 15: Frontend — update `ClientsListView` and clean up `DashboardPage`

**Files:**
- Modify: `frontend/src/pages/dashboard/ui/ClientsListView.tsx`
- Modify: `frontend/src/pages/dashboard/ui/DashboardPage.tsx`
- Delete: `frontend/src/pages/dashboard/ui/ClientDetailView.tsx`

- [ ] **Step 1: Replace `ClientsListView.tsx`**

```typescript
import { Box, Typography } from '@mui/material'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { ShowClientsGrid } from '@features/clients/show-clients/ui/ShowClientsGrid'
import { CreateClientDrawer } from '@features/clients/create-client/ui/CreateClientDrawer'
import { ClientDetailDrawer } from '@widgets/client-detail-drawer/ui/ClientDetailDrawer'
import { useAppDispatch, useAppSelector } from '@app/store'
import { closeClientDrawer } from '@entities/client'

export function ClientsListView() {
  const d = useDashboardPalette()
  const dispatch = useAppDispatch()
  const drawerData = useAppSelector(state => state.client.clientDrawerData)

  const isCreateOpen = drawerData.mode === 'create'
  const isViewOpen = drawerData.mode === 'view' && Boolean(drawerData.id)
  const handleClose = () => dispatch(closeClientDrawer())

  return (
    <Box>
      <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: d.text, mb: 2 }}>
        Клиенты
      </Typography>
      <ShowClientsGrid />
      <CreateClientDrawer open={isCreateOpen} onClose={handleClose} />
      <ClientDetailDrawer open={isViewOpen} clientId={drawerData.id} onClose={handleClose} />
    </Box>
  )
}
```

- [ ] **Step 2: Remove client detail route from `DashboardPage.tsx`**

In `DashboardPage.tsx`, remove these lines:

1. Import: `import { ClientDetailView } from './ClientDetailView'`
2. Route: `<Route path="clients/:clientId" element={<ClientDetailView />} />`
3. Const: `const clientMatch = useMatch('/dashboard/clients/:clientId')`
4. In `section` useMemo: `if (clientMatch) return 'clients'`
5. In `headerTitle` useMemo: `if (clientMatch) return 'Клиент'`

The updated `content` block becomes:

```tsx
const content = (
  <Routes>
    <Route index element={<DashboardMainContent section={section} />} />
    <Route path="staff/:staffId" element={<StaffDetailView />} />
  </Routes>
)
```

The updated `section` useMemo becomes:

```tsx
const section = useMemo((): Section => {
  if (staffMatch) return 'staff'
  const s = searchParams.get('section')
  if (isSection(s)) return s
  return 'overview'
}, [staffMatch, searchParams])
```

The updated `headerTitle` useMemo becomes:

```tsx
const headerTitle = useMemo(() => {
  if (staffMatch) return 'Мастер'
  return TITLES[section]
}, [staffMatch, section])
```

- [ ] **Step 3: Delete `ClientDetailView.tsx`**

```bash
git rm frontend/src/pages/dashboard/ui/ClientDetailView.tsx
```

- [ ] **Step 4: Full build check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/dashboard/ui/ClientsListView.tsx \
        frontend/src/pages/dashboard/ui/DashboardPage.tsx
git commit -m "feat(clients): wire up ClientDetailDrawer and CreateClientDrawer in ClientsListView, remove page-based client route"
```

---

## Task 16: Manual verification checklist

Run the dev server and verify the following flows:

```bash
cd frontend && npm run dev
```

- [ ] **Grid loads** — Clients section shows the grid with a Status column
- [ ] **Row click** — clicking a client row opens `ClientDetailDrawer` from the right; client details visible
- [ ] **Edit name** — click ✏️, change name, save — name updates in drawer and grid
- [ ] **Notes** — edit notes field, click away — auto-saves
- [ ] **Tags** — click a tag chip toggles assignment; create new tag works
- [ ] **Create** — click «+ Добавить клиента», fill name, submit — drawer closes, new client appears in grid
- [ ] **Delete** — open a client, click «Удалить клиента», confirm — drawer closes, client disappears from grid
- [ ] **Show inactive** — toggle «Показать неактивные» switch — deleted client reappears with grey row styling and «Неактивный» status badge
- [ ] **Restore** — click the grey row, «Восстановить клиента» in footer — drawer closes, client returns to active with «Активный» status
- [ ] **No broken routes** — navigating to `/dashboard/clients/some-id` no longer renders `ClientDetailView` (falls through to 404 or main content)
