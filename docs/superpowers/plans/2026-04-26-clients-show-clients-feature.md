# Clients Show-Clients Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual `ClientsListView` with a proper RTK-Query-powered DataGrid table (using shared `RenderTable`) with server-side sorting, filtering by search + tags, following the exact same pattern as `ShowAppointmentsGrid`.

**Architecture:** Create `entities/client` (types + RTK slice + RTK API), then `features/clients/show-clients` (columns + grid + filter bar), then refactor the existing `ClientsListView` page to compose those pieces. Old `clientsApi.ts` fetch functions stay untouched — the new RTK API injects into `rtkApi` and calls the same backend endpoint.

**Tech Stack:** React, Redux Toolkit, RTK Query (rtkApi), MUI X DataGrid Premium, TypeScript.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/entities/client/model/types.ts` | All client-related TS types |
| Create | `src/entities/client/model/clientApi.ts` | RTK Query endpoints for clients |
| Create | `src/entities/client/model/clientSlice.ts` | Redux slice: filter state |
| Create | `src/entities/client/index.ts` | Barrel export |
| Modify | `src/shared/api/rtkApi.ts` | Add `'Clients'` tag type |
| Modify | `src/app/store.ts` | Register `clientSlice` reducer |
| Create | `src/features/clients/show-clients/model/columns.tsx` | GridColDef column definitions |
| Create | `src/features/clients/show-clients/ui/style.tsx` | DataGrid sx styles |
| Create | `src/features/clients/show-clients/ui/FilterClientsBar.tsx` | Search + tag chip filter bar |
| Create | `src/features/clients/show-clients/ui/ShowClientsGrid.tsx` | Main grid component |
| Modify | `src/pages/dashboard/ui/ClientsListView.tsx` | Compose new components, delete old fetch logic |

---

## Task 1: Create `entities/client/model/types.ts`

**Files:**
- Create: `src/entities/client/model/types.ts`

- [ ] **Step 1: Create the types file**

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
}

export interface ClientFilterState {
  search: string
  tagIds: string[]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/entities/client/model/types.ts
git commit -m "feat(client-entity): add types"
```

---

## Task 2: Add `'Clients'` tag type to `rtkApi`

**Files:**
- Modify: `src/shared/api/rtkApi.ts`

- [ ] **Step 1: Add the tag**

Open `src/shared/api/rtkApi.ts`. Find the `tagTypes` array and add `'Clients'`:

```typescript
tagTypes: [
    'Appointments',
    'Clients',
],
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/api/rtkApi.ts
git commit -m "feat(rtkApi): add Clients tag type"
```

---

## Task 3: Create `entities/client/model/clientApi.ts`

**Files:**
- Create: `src/entities/client/model/clientApi.ts`

- [ ] **Step 1: Create the RTK Query API**

```typescript
// src/entities/client/model/clientApi.ts
import { rtkApi } from '@shared/api/rtkApi'
import type { ClientListRequest, ClientListResponse, SalonClient, ClientTag } from './types'

const clientApi = rtkApi.injectEndpoints({
  endpoints: builder => ({
    getClients: builder.query<ClientListResponse, ClientListRequest>({
      providesTags: ['Clients'],
      query: (params: ClientListRequest) => ({
        method: 'GET',
        url: '/clients',
        params: {
          search: params.search || undefined,
          tag_ids: params.tagIds?.length ? params.tagIds.join(',') : undefined,
          sort_by: params.sortBy || undefined,
          sort_dir: params.sortDir || undefined,
          page: params.page,
          page_size: params.pageSize,
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
  }),
})

export const {
  useGetClientsQuery,
  useGetClientTagsQuery,
  useGetClientByIdQuery,
} = clientApi
```

- [ ] **Step 2: Commit**

```bash
git add src/entities/client/model/clientApi.ts
git commit -m "feat(client-entity): add RTK Query clientApi"
```

---

## Task 4: Create `entities/client/model/clientSlice.ts`

**Files:**
- Create: `src/entities/client/model/clientSlice.ts`

- [ ] **Step 1: Create the slice**

```typescript
// src/entities/client/model/clientSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { ClientFilterState } from './types'

interface ClientState {
  filters: ClientFilterState
}

const initialState: ClientState = {
  filters: {
    search: '',
    tagIds: [],
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
  },
})

export const { setClientFilters, resetClientFilters } = clientSlice.actions
```

- [ ] **Step 2: Commit**

```bash
git add src/entities/client/model/clientSlice.ts
git commit -m "feat(client-entity): add clientSlice"
```

---

## Task 5: Create `entities/client/index.ts` barrel

**Files:**
- Create: `src/entities/client/index.ts`

- [ ] **Step 1: Create barrel**

```typescript
// src/entities/client/index.ts
export * from './model/types'
export * from './model/clientSlice'
export * from './model/clientApi'
```

- [ ] **Step 2: Commit**

```bash
git add src/entities/client/index.ts
git commit -m "feat(client-entity): add index barrel"
```

---

## Task 6: Register `clientSlice` in the Redux store

**Files:**
- Modify: `src/app/store.ts`

- [ ] **Step 1: Import and register**

Open `src/app/store.ts`. The current file looks like:

```typescript
import { appointmentSlice } from '@entities/appointment/model/appointmentSlice'
import { rtkApi } from '@shared/api/rtkApi'
```

Add the import after the `appointmentSlice` import:

```typescript
import { clientSlice } from '@entities/client/model/clientSlice'
```

Then inside `configureStore({ reducer: { ... } })`, add:

```typescript
client: clientSlice.reducer,
```

The final reducer map should be:

```typescript
reducer: {
  search: searchSlice.reducer,
  auth: authSlice.reducer,
  location: locationSlice.reducer,
  profile: profileReducer,
  appointment: appointmentSlice.reducer,
  client: clientSlice.reducer,
  [rtkApi.reducerPath]: rtkApi.reducer,
},
```

- [ ] **Step 2: Commit**

```bash
git add src/app/store.ts
git commit -m "feat(store): register clientSlice reducer"
```

---

## Task 7: Create `features/clients/show-clients/model/columns.tsx`

**Files:**
- Create: `src/features/clients/show-clients/model/columns.tsx`

- [ ] **Step 1: Create the columns file**

```typescript
// src/features/clients/show-clients/model/columns.tsx
import { Box, Chip, Stack } from '@mui/material'
import { GridColDef } from '@mui/x-data-grid-premium'
import type { SalonClient } from '@entities/client'
import { V } from '@shared/theme/palettes'

function formatDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export const clientColumns: GridColDef<SalonClient>[] = [
  {
    field: 'displayName',
    headerName: 'Имя',
    flex: 1,
    minWidth: 180,
    sortable: true,
    renderCell: ({ value }) => (
      <Box sx={{ fontWeight: 500, fontSize: 13, color: V.text }}>{value as string}</Box>
    ),
  },
  {
    field: 'phoneE164',
    headerName: 'Телефон',
    width: 160,
    sortable: false,
    renderCell: ({ row }) => (
      <Box sx={{ fontSize: 13, color: V.textMuted }}>
        {row.phoneE164 ?? row.userPhone ?? '—'}
      </Box>
    ),
  },
  {
    field: 'tags',
    headerName: 'Теги',
    width: 220,
    sortable: false,
    renderCell: ({ row }) => (
      <Stack direction="row" flexWrap="wrap" gap={0.5}>
        {row.tags.map(tag => (
          <Chip
            key={tag.id}
            label={tag.name}
            size="small"
            sx={{ bgcolor: tag.color, color: '#fff', fontSize: 11, height: 20 }}
          />
        ))}
      </Stack>
    ),
  },
  {
    field: 'visitCount',
    headerName: 'Визиты',
    width: 100,
    sortable: true,
    renderCell: ({ value }) => (
      <Box sx={{ fontSize: 13, color: V.text }}>{value as number}</Box>
    ),
  },
  {
    field: 'lastVisitAt',
    headerName: 'Последний визит',
    width: 160,
    sortable: true,
    renderCell: ({ value }) => (
      <Box sx={{ fontSize: 13, color: V.textMuted }}>{formatDate(value as string)}</Box>
    ),
  },
  {
    field: 'createdAt',
    headerName: 'Добавлен',
    width: 140,
    sortable: true,
    renderCell: ({ value }) => (
      <Box sx={{ fontSize: 13, color: V.textMuted }}>{formatDate(value as string)}</Box>
    ),
  },
]
```

- [ ] **Step 2: Commit**

```bash
git add src/features/clients/show-clients/model/columns.tsx
git commit -m "feat(show-clients): add DataGrid column definitions"
```

---

## Task 8: Create `features/clients/show-clients/ui/style.tsx`

**Files:**
- Create: `src/features/clients/show-clients/ui/style.tsx`

- [ ] **Step 1: Create style file (identical structure to `showAppointmentsGridSx`)**

```typescript
// src/features/clients/show-clients/ui/style.tsx
import { V } from '@shared/theme/palettes'

export const showClientsGridSx = {
  '& .MuiDataGrid-virtualScroller': {
    '@supports(overflow: overlay)': { overflow: 'overlay' },
    overflow: 'overlay',
    scrollbarGutter: 'auto',
    '& + div': { display: 'none' },
  },
  border: `1px solid ${V.border}`,
  borderRadius: V.rLg,
  backgroundColor: V.surface,
  color: V.text,
  fontFamily: 'inherit',
  boxShadow: '0 2px 20px rgba(212,84,122,0.07)',
  '.MuiDataGrid-columnHeader': {
    backgroundColor: `${V.surfaceEl} !important`,
    borderBottom: `1px solid ${V.border}`,
    borderRadius: `${V.rLg} ${V.rLg} 0 0`,
  },
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: `${V.surfaceEl} !important`,
    borderBottom: `1px solid ${V.border}`,
    borderRadius: `${V.rLg} ${V.rLg} 0 0`,
  },
  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: 600,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    color: `${V.textMuted} !important`,
  },
  '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
    outline: 'none',
  },
  '& .MuiDataGrid-row': {
    borderBottom: `1px solid ${V.borderSub}`,
    cursor: 'pointer',
    transition: 'background 0.12s',
    backgroundColor: `${V.surface} !important`,
    '&:hover': { backgroundColor: `${V.surfaceEl} !important` },
    '&.Mui-selected': { backgroundColor: `${V.accent}09 !important` },
    '&.Mui-selected:hover': { backgroundColor: `${V.accent}14 !important` },
  },
  '& .MuiDataGrid-cell': {
    color: `${V.text} !important`,
    display: 'flex',
    alignItems: 'center',
    backgroundColor: `${V.surface} !important`,
    '&:focus, &:focus-within': { outline: 'none' },
  },
  '& .MuiDataGrid-columnSeparator': { color: V.border },
  '*': { borderColor: `${V.border} !important` },
  '& .MuiCheckbox-root': {
    color: V.border,
    padding: '4px',
    '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: V.accent },
  },
  '& .MuiDataGrid-toolbarContainer': {
    padding: '8px 12px',
    borderBottom: `1px solid ${V.border}`,
    backgroundColor: V.surfaceEl,
    '& .MuiButton-root': {
      color: V.textMuted,
      fontSize: 12,
      fontFamily: 'inherit',
      borderRadius: V.rSm,
      '&:hover': { backgroundColor: V.surfaceHi, color: V.text },
    },
  },
  '& .MuiDataGrid-footerContainer': {
    borderTop: `1px solid ${V.border}`,
    borderRadius: `0 0 ${V.rLg} ${V.rLg}`,
    overflow: 'hidden',
    '& > div': {
      backgroundColor: `${V.surfaceEl} !important`,
      borderTop: 'none !important',
    },
  },
  '& .MuiTablePagination-root': { color: V.textMuted },
  '& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel': {
    color: V.textMuted,
    fontSize: 12,
    margin: 0,
  },
  '& .MuiTablePagination-select': { color: V.textSub, fontSize: 12 },
  '& .MuiDataGrid-footerContainer .MuiIconButton-root': {
    color: V.textMuted,
    borderRadius: V.rSm,
    '&:hover': { backgroundColor: V.surfaceHi, color: V.text },
    '&.Mui-disabled': { opacity: 0.35 },
  },
  '& .MuiSelect-icon': { color: V.textMuted },
  '& .MuiDataGrid-virtualScroller::-webkit-scrollbar': { width: '7px', height: '7px' },
  '& .MuiDataGrid-virtualScroller::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
  '& .MuiDataGrid-virtualScroller::-webkit-scrollbar-thumb': {
    backgroundColor: V.border,
    borderRadius: '10px',
  },
  '& .MuiDataGrid-pinnedColumns--right': {
    boxShadow: `0px 4px 16px rgba(212,84,122,0.08)`,
    backgroundColor: `${V.surface} !important`,
  },
  '& .MuiDataGrid-pinnedColumns--right .MuiDataGrid-cell': {
    backgroundColor: `${V.surface} !important`,
  },
  '& .MuiDataGrid-pinnedColumnHeaders--right': {
    backgroundColor: `${V.surfaceEl} !important`,
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/clients/show-clients/ui/style.tsx
git commit -m "feat(show-clients): add DataGrid sx styles"
```

---

## Task 9: Create `features/clients/show-clients/ui/FilterClientsBar.tsx`

**Files:**
- Create: `src/features/clients/show-clients/ui/FilterClientsBar.tsx`

- [ ] **Step 1: Create the filter bar**

```typescript
// src/features/clients/show-clients/ui/FilterClientsBar.tsx
import { ChangeEvent, JSX, useRef, useState } from 'react'
import { Box, Chip, Stack } from '@mui/material'
import { V } from '@shared/theme/palettes'
import type { ClientTag, ClientFilterState } from '@entities/client'

interface Props {
  filters: ClientFilterState
  tags: ClientTag[]
  setFilters: (f: ClientFilterState) => void
}

export function FilterClientsBar({ filters, tags, setFilters }: Props): JSX.Element {
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

- [ ] **Step 2: Commit**

```bash
git add src/features/clients/show-clients/ui/FilterClientsBar.tsx
git commit -m "feat(show-clients): add FilterClientsBar component"
```

---

## Task 10: Create `features/clients/show-clients/ui/ShowClientsGrid.tsx`

**Files:**
- Create: `src/features/clients/show-clients/ui/ShowClientsGrid.tsx`

- [ ] **Step 1: Create the grid component**

```typescript
// src/features/clients/show-clients/ui/ShowClientsGrid.tsx
import { JSX, useCallback, useMemo, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import {
  GridPaginationModel,
  GridRowParams,
  GridSortModel,
  GridToolbarColumnsButton,
  GridValidRowModel,
} from '@mui/x-data-grid-premium'
import RenderTable from '@shared/ui/DataGrid/RenderTable'
import { VELA_IVORY_PALETTE, V } from '@shared/theme/palettes'
import { useAppDispatch, useAppSelector } from '@app/store'
import { setClientFilters } from '@entities/client'
import { useGetClientsQuery, useGetClientTagsQuery } from '@entities/client'
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
  const navigate = useNavigate()
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
  })

  const { data: tags = [] } = useGetClientTagsQuery()

  const onSortModelChange = useCallback(
    (next: GridSortModel) => {
      setSortModel(next.length > 0 ? next : fallbackSortModel)
    },
    [fallbackSortModel],
  )

  const cols = useMemo(
    () => clientColumns as unknown as typeof clientColumns,
    [],
  )

  const handleRowClick = (params: GridRowParams<SalonClient>) => {
    navigate(`/dashboard/clients/${params.row.id}`)
  }

  return (
    <Box>
      <FilterClientsBar
        filters={filters}
        tags={tags}
        setFilters={next => dispatch(setClientFilters(next))}
      />
      <RenderTable
        tableName="clients"
        rows={(data?.items ?? []) as unknown as GridValidRowModel[]}
        error={error}
        checkboxSelection={false}
        heightOffset={160}
        dashboardPalette={VELA_IVORY_PALETTE}
        sx={showClientsGridSx}
        minHeight={500}
        columns={cols as any}
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

- [ ] **Step 2: Commit**

```bash
git add src/features/clients/show-clients/ui/ShowClientsGrid.tsx
git commit -m "feat(show-clients): add ShowClientsGrid component"
```

---

## Task 11: Refactor `pages/dashboard/ui/ClientsListView.tsx`

**Files:**
- Modify: `src/pages/dashboard/ui/ClientsListView.tsx`

- [ ] **Step 1: Replace the entire file with the new composition**

```typescript
// src/pages/dashboard/ui/ClientsListView.tsx
import { Box, Typography } from '@mui/material'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { ShowClientsGrid } from '@features/clients/show-clients/ui/ShowClientsGrid'

export function ClientsListView() {
  const d = useDashboardPalette()

  return (
    <Box>
      <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: d.text, mb: 2 }}>
        Клиенты
      </Typography>
      <ShowClientsGrid />
    </Box>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors, or only pre-existing errors unrelated to clients.

- [ ] **Step 3: Commit**

```bash
git add src/pages/dashboard/ui/ClientsListView.tsx
git commit -m "feat(clients-page): refactor to use ShowClientsGrid"
```

---

## Self-Review

**Spec coverage:**
- ✅ RenderTable-based DataGrid for clients list
- ✅ Server-side pagination, sorting, filtering
- ✅ entities/client with clientSlice + clientApi + types
- ✅ features/clients/show-clients feature
- ✅ Filter by search (debounced) + tag chips
- ✅ Sort on displayName, visitCount, lastVisitAt, createdAt
- ✅ Row click navigates to `/dashboard/clients/:id` (preserves existing route)
- ✅ Tags loaded via RTK Query (useGetClientTagsQuery)
- ✅ Pattern identical to ShowAppointmentsGrid

**Placeholder scan:** All code blocks are complete. No TBD/TODO.

**Type consistency:**
- `ClientFilterState` defined in Task 1, used in Task 4 (slice), Task 9 (FilterClientsBar), Task 10 (ShowClientsGrid) — consistent.
- `setClientFilters` exported from slice in Task 4, imported in Task 10 — consistent.
- `useGetClientsQuery`, `useGetClientTagsQuery` exported in Task 3, imported in Task 10 — consistent.
- `clientColumns` defined in Task 7 as `GridColDef<SalonClient>[]`, used in Task 10 — consistent.
- `showClientsGridSx` defined in Task 8, imported in Task 10 — consistent.
