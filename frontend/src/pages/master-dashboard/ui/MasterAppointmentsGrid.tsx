import { JSX, useCallback, useMemo, useState } from 'react'
import { Box, Chip, CircularProgress } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'
import {
  GridColDef,
  GridPaginationModel,
  GridSortModel,
  GridToolbarColumnsButton,
  GridValidRowModel,
} from '@mui/x-data-grid-premium'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { ru } from 'date-fns/locale'
import RenderTable from '@shared/ui/DataGrid/RenderTable'
import { getDataGridDashboardSx } from '@shared/ui/DataGrid/dataGridDashboardSx'
import { getServiceColor } from '@shared/lib/getServiceColor'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { InitialsAvatar } from '@features/appointment/show-appointments/ui/InitialsAvatar'
import StatusChip from '@features/appointment/show-appointments/ui/StatusChip'
import {
  useGetMasterAppointmentsQuery,
  useGetMasterSalonsQuery,
  type MasterAppointmentDTO,
} from '@entities/master'
import MasterFilterAppointmentsBar, {
  type MasterAppointmentFilterState,
} from './MasterFilterAppointmentsBar'

const SORT_FIELD_TO_API: Record<string, string> = {
  startsAt: 'starts_at',
  clientLabel: 'client_name',
  serviceName: 'service_name',
  status: 'status',
  salonName: 'salon_name',
}

function MasterAppointmentsToolbar(): JSX.Element {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: '4px' }}>
      <GridToolbarColumnsButton />
      <Box sx={{ flex: 1 }} />
    </Box>
  )
}

function useMasterColumns(): GridColDef<MasterAppointmentDTO>[] {
  const d = useDashboardPalette()
  return useMemo(
    () => [
      {
        field: 'startsAt',
        headerName: 'Дата и время',
        width: 160,
        sortable: true,
        renderCell: ({ value }) => {
          if (!value) return <Box sx={{ color: d.muted, fontSize: 12 }}>—</Box>
          const dt = new Date(value as string)
          return (
            <Box display="flex" flexDirection="row" alignItems="center" gap={0.5}>
              <Box sx={{ fontSize: 12, fontWeight: 600, color: d.text, lineHeight: 1.4 }}>
                {dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </Box>
              <Box sx={{ fontSize: 11, color: d.muted }}>
                {String(dt.getHours()).padStart(2, '0')}:{String(dt.getMinutes()).padStart(2, '0')}
              </Box>
            </Box>
          )
        },
      },
      {
        field: 'salonName',
        headerName: 'Источник',
        width: 170,
        sortable: true,
        renderCell: ({ value }) => {
          const name = value as string
          if (!name || name === 'Личная запись') {
            return (
              <Chip
                label="Личная запись"
                size="small"
                sx={{ bgcolor: alpha(d.accent, 0.15), color: d.accent, fontWeight: 600, fontSize: 11 }}
              />
            )
          }
          return (
            <Box sx={{ fontSize: 12, color: d.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name}
            </Box>
          )
        },
      },
      {
        field: 'clientLabel',
        headerName: 'Клиент',
        flex: 1,
        minWidth: 200,
        sortable: true,
        renderCell: ({ row }) => (
          <Box display="flex" flexDirection="row" alignItems="center" gap={0.5}>
            <InitialsAvatar name={row.clientLabel ?? '?'} size={28} />
            <Box sx={{ minWidth: 0 }} display="flex" flexDirection="row" alignItems="center" gap={0.25}>
              <Box
                sx={{
                  fontWeight: 600,
                  fontSize: 12,
                  color: d.text,
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {row.clientLabel}
              </Box>
              {row.clientPhone && <Box sx={{ fontSize: 10, color: d.muted }}>{row.clientPhone}</Box>}
            </Box>
          </Box>
        ),
      },
      {
        field: 'serviceName',
        headerName: 'Услуга',
        width: 210,
        sortable: true,
        renderCell: ({ value }) => {
          const svcColor = getServiceColor((value as string) ?? '')
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
              <Box sx={{ width: 3, height: 24, borderRadius: '2px', bgcolor: svcColor, flexShrink: 0 }} />
              <Box
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: 12,
                  color: d.text,
                }}
              >
                {value as string}
              </Box>
            </Box>
          )
        },
      },
      {
        field: 'status',
        headerName: 'Статус',
        width: 145,
        sortable: true,
        renderCell: ({ value }) => <StatusChip status={value as string} />,
      },
    ] as GridColDef<MasterAppointmentDTO>[],
    [d],
  )
}

export type MasterAppointmentsGridProps = {
  onRowClick?: (row: MasterAppointmentDTO) => void
  onRequestCreate?: () => void
}

export function MasterAppointmentsGrid({
  onRowClick,
  onRequestCreate,
}: MasterAppointmentsGridProps): JSX.Element {
  const theme = useTheme()
  const fallbackSortModel = useMemo<GridSortModel>(() => [{ field: 'startsAt', sort: 'desc' }], [])

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 })
  const [sortModel, setSortModel] = useState<GridSortModel>(fallbackSortModel)
  const [filters, setFilters] = useState<MasterAppointmentFilterState>({
    preset: 'today',
    from: '',
    to: '',
    statuses: [],
    source: '',
    search: '',
  })

  const { data: salons = [] } = useGetMasterSalonsQuery()

  const activeSort = sortModel[0]
  const sortByApi = activeSort ? (SORT_FIELD_TO_API[activeSort.field] ?? 'starts_at') : 'starts_at'
  const sortDirApi = activeSort?.sort === 'asc' ? 'asc' : 'desc'

  const { data, isLoading, error } = useGetMasterAppointmentsQuery({
    from: filters.from || undefined,
    to: filters.to || undefined,
    status: filters.statuses.length ? filters.statuses.join(',') : undefined,
    search: filters.search.trim() || undefined,
    source: filters.source || undefined,
    sortBy: sortByApi,
    sortDir: sortDirApi,
    page: paginationModel.page + 1,
    pageSize: paginationModel.pageSize,
  })

  const onSortModelChange = useCallback(
    (next: GridSortModel) => {
      setSortModel(next.length > 0 ? next : fallbackSortModel)
      setPaginationModel(prev => ({ ...prev, page: 0 }))
    },
    [fallbackSortModel],
  )

  const cols = useMasterColumns()

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
      <Box>
        <MasterFilterAppointmentsBar
          filters={filters}
          setFilters={setFilters}
          salons={salons}
          onNewAppointment={onRequestCreate}
        />
        <RenderTable
          tableName="appointments"
          rows={((data?.items ?? []) as unknown) as GridValidRowModel[]}
          error={error}
          checkboxSelection={false}
          heightOffset={140}
          dashboardPalette={theme.palette.dashboard}
          sx={getDataGridDashboardSx}
          minHeight={600}
          columns={cols as GridColDef<GridValidRowModel>[]}
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
          sortingOrder={['asc', 'desc']}
          disableColumnMenu
          disableRowSelectionOnClick
          onRowClick={
            onRowClick
              ? p => {
                  onRowClick(p.row as MasterAppointmentDTO)
                }
              : undefined
          }
          slots={{
            toolbar: MasterAppointmentsToolbar,
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
                Нет записей
              </Box>
            ),
          }}
        />
      </Box>
    </LocalizationProvider>
  )
}
