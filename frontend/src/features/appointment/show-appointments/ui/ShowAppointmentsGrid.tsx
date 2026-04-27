import { JSX, useCallback, useMemo, useState } from 'react'
import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { type DashboardAppointment } from '@entities/appointment'
import RenderTable from '@shared/ui/DataGrid/RenderTable'
import {
  GridPaginationModel,
  GridSortModel,
  GridToolbarColumnsButton,
} from '@mui/x-data-grid-premium'
import { GridRowParams } from '@mui/x-data-grid-premium'
import { CircularProgress } from '@mui/material'
import { getShowAppointmentsGridSx } from './styles'
import CreateAppointmentBtn from './CreateAppointment'
import { useAppDispatch, useAppSelector } from '@app/store'
import { openAppointmentDrawer } from '@entities/appointment'
import { useGetAppointmentsQuery } from '@entities/appointment/model/appointmentApi'
import { usePatchAppointmentStatusMutation } from '@entities/appointment'
import { useColumns } from '../model/columns'

const SORT_FIELD_TO_API: Record<string, string> = {
  startsAt: 'starts_at',
  clientLabel: 'client_name',
  serviceName: 'service_name',
  staffName: 'master_name',
  status: 'status',
}

// ─── toolbar ───────────────────────────────────────────────────────────────

function AppointmentsToolbar(): JSX.Element {
  const dispatch = useAppDispatch()

  const handleOpen = () => {
    dispatch(openAppointmentDrawer({ mode: 'create', id: null }))
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: '4px' }}>
      <GridToolbarColumnsButton />
      <Box sx={{ flex: 1 }} />
      <CreateAppointmentBtn onClick={handleOpen} />
      <Box sx={{ width: 4 }} />
    </Box>
  )
}

function LoadingOverlay(): JSX.Element {
  const theme = useTheme()
  const accent = theme.palette.dashboard.accent
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
      }}
    >
      <CircularProgress size={32} sx={{ color: accent }} />
    </Box>
  )
}

function NoRowsOverlay(): JSX.Element {
  const theme = useTheme()
  const muted = theme.palette.dashboard.muted
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: muted,
        fontSize: 13,
      }}
    >
      Нет записей
    </Box>
  )
}

const GRID_SLOTS = {
  toolbar: AppointmentsToolbar,
  loadingOverlay: LoadingOverlay,
  noRowsOverlay: NoRowsOverlay,
}

// ─── RenderTable sx ───────────────────────────────────────────────────────────

export function ShowAppointmentsGrid(): JSX.Element | null {
  const theme = useTheme()
  const fallbackSortModel = useMemo<GridSortModel>(() => [{ field: 'startsAt', sort: 'desc' }], [])

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  })
  const [sortModel, setSortModel] = useState<GridSortModel>(fallbackSortModel)

  const filters = useAppSelector(state => state.appointment.filters)
  const activeSort = sortModel[0]
  const sortByApi = activeSort ? (SORT_FIELD_TO_API[activeSort.field] ?? 'starts_at') : 'starts_at'
  const sortDirApi = activeSort?.sort === 'asc' ? 'asc' : 'desc'

  const { data, isLoading, error, refetch } = useGetAppointmentsQuery({
    from: filters.from,
    to: filters.to,
    statuses: filters.statuses,
    staffId: filters.staffId,
    serviceId: filters.serviceId,
    search: filters.search.trim() || undefined,
    sortBy: sortByApi,
    sortDir: sortDirApi,
    page: paginationModel.page + 1,
    pageSize: paginationModel.pageSize,
  })
  const [patchAppointmentStatus] = usePatchAppointmentStatusMutation()
  const load = useCallback(async () => {
    await refetch()
  }, [refetch])
  const onSortModelChange = useCallback(
    (next: GridSortModel) => {
      setSortModel(next.length > 0 ? next : fallbackSortModel)
      setPaginationModel(prev => ({ ...prev, page: 0 }))
    },
    [fallbackSortModel],
  )
  const handleStatusChange = useCallback(
    async (id: string, status: string) => {
      await patchAppointmentStatus({ id, status }).unwrap()
      await load()
    },
    [patchAppointmentStatus, load],
  )
  const cols = useColumns({ onStatusChange: handleStatusChange })

  const dispatch = useAppDispatch()

  const handleRowClick = (params: GridRowParams<DashboardAppointment>) => {
    dispatch(openAppointmentDrawer({ mode: 'edit', id: params.row.id ?? null }))
  }

  return (
    <RenderTable
      tableName="appointments"
      rows={(data?.items as unknown as DashboardAppointment[]) ?? []}
      error={error}
      checkboxSelection={false}
      heightOffset={140}
      dashboardPalette={theme.palette.dashboard}
      sx={getShowAppointmentsGridSx}
      minHeight={600}
      columns={cols}
      getRowId={r => r.id}
      loading={isLoading}
      pagination
      getRowHeight={params => {
        if (params.model.serviceNames.length <= 1) {
          return 40
        }
        return 'auto'
      }}
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
      onRowClick={handleRowClick}
      slots={GRID_SLOTS}
    />
  )
}
