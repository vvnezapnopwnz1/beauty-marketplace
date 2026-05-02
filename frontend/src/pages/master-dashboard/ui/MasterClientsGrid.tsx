import { JSX, useCallback, useMemo, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  GridColDef,
  GridPaginationModel,
  GridSortModel,
  GridToolbarColumnsButton,
  GridValidRowModel,
} from '@mui/x-data-grid-premium'
import RenderTable from '@shared/ui/DataGrid/RenderTable'
import { getDataGridDashboardSx } from '@shared/ui/DataGrid/dataGridDashboardSx'
import { V } from '@shared/theme/palettes'
import { useGetMasterClientsQuery, type MasterClientDTO } from '@entities/master'
import { MasterFilterClientsBar, type MasterClientFilterState } from './MasterFilterClientsBar'

const masterClientColumns: GridColDef<MasterClientDTO>[] = [
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
    field: 'phone',
    headerName: 'Телефон',
    width: 160,
    sortable: false,
    renderCell: ({ value }) => (
      <Box sx={{ fontSize: 13, color: V.textMuted }}>{(value as string) ?? '—'}</Box>
    ),
  },
  {
    field: 'notes',
    headerName: 'Заметки',
    flex: 1,
    minWidth: 200,
    sortable: false,
    renderCell: ({ value }) => (
      <Box
        sx={{
          fontSize: 12,
          color: V.textMuted,
          fontStyle: 'italic',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {(value as string) || '—'}
      </Box>
    ),
  },
  {
    field: 'extraContact',
    headerName: 'Доп. контакт',
    width: 160,
    sortable: false,
    renderCell: ({ value }) => (
      <Box sx={{ fontSize: 12, color: V.textMuted }}>{(value as string) || '—'}</Box>
    ),
  },
]

function ClientsToolbar(): JSX.Element {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: '4px' }}>
      <GridToolbarColumnsButton />
      <Box sx={{ flex: 1 }} />
    </Box>
  )
}

export type MasterClientsGridProps = {
  onRowClick?: (row: MasterClientDTO) => void
  onRequestCreate?: () => void
}

export function MasterClientsGrid({ onRowClick, onRequestCreate }: MasterClientsGridProps): JSX.Element {
  const theme = useTheme()

  const fallbackSortModel = useMemo<GridSortModel>(
    () => [{ field: 'displayName', sort: 'asc' }],
    [],
  )
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  })
  const [sortModel, setSortModel] = useState<GridSortModel>(fallbackSortModel)
  const [filters, setFilters] = useState<MasterClientFilterState>({ search: '' })

  const { data, isLoading, error } = useGetMasterClientsQuery({
    search: filters.search || undefined,
    sortBy: sortModel[0]?.field,
    sortDir: sortModel[0]?.sort === 'asc' ? 'asc' : 'desc',
    page: paginationModel.page + 1,
    pageSize: paginationModel.pageSize,
  })

  const onSortModelChange = useCallback(
    (next: GridSortModel) => {
      setSortModel(next.length > 0 ? next : fallbackSortModel)
    },
    [fallbackSortModel],
  )

  const cols = useMemo(() => masterClientColumns as GridColDef<GridValidRowModel>[], [])

  return (
    <Box>
      <MasterFilterClientsBar filters={filters} setFilters={setFilters} onNewClient={onRequestCreate} />
      <RenderTable
        tableName="clients"
        rows={((data?.items ?? []) as unknown) as GridValidRowModel[]}
        error={error}
        checkboxSelection={false}
        heightOffset={160}
        dashboardPalette={theme.palette.dashboard}
        sx={getDataGridDashboardSx}
        minHeight={500}
        columns={cols}
        getRowId={(r: GridValidRowModel) => r.id}
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
        onRowClick={
          onRowClick
            ? p => {
                onRowClick(p.row as MasterClientDTO)
              }
            : undefined
        }
        slots={{
          toolbar: ClientsToolbar,
          loadingOverlay: () => (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <CircularProgress size={32} sx={{ color: theme.palette.dashboard.accent }} />
            </Box>
          ),
          noRowsOverlay: () => (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: theme.palette.dashboard.muted,
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
