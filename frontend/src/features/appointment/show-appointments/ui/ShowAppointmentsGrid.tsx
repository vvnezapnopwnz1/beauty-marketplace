import { JSX, useCallback, useMemo, useState } from 'react'
import { Box } from '@mui/material'
import { type DashboardAppointment } from '@entities/appointment'
import RenderTable from '@shared/ui/DataGrid/RenderTable'
import { VELA_IVORY_PALETTE, V } from '@shared/theme/palettes'
import {
  GridPaginationModel,
  GridSortModel,
  GridToolbarColumnsButton,
  GridValidRowModel,
} from '@mui/x-data-grid-premium'
import { GridColDef } from '@mui/x-data-grid-premium'
import { GridRowParams } from '@mui/x-data-grid-premium'
import { CircularProgress } from '@mui/material'
import { showAppointmentsGridSx } from './style'
import CreateAppointmentBtn from './CreateAppointment'
import { useAppDispatch, useAppSelector } from '@app/store'
import { openAppointmentDrawer } from '@entities/appointment'
import { useGetAppointmentsQuery } from '@entities/appointment/model/appointmentApi'
import { usePatchAppointmentStatusMutation } from '@entities/appointment'
import { columns } from '../model/columns'

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

// ─── RenderTable sx ───────────────────────────────────────────────────────────

export function ShowAppointmentsGrid(): JSX.Element | null {
  const fallbackSortModel = useMemo<GridSortModel>(() => [{ field: 'startsAt', sort: 'desc' }], [])

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  })
  const [sortModel, setSortModel] = useState<GridSortModel>(fallbackSortModel)

  const filters = useAppSelector(state => state.appointment.filters)

  const { data, isLoading, error, refetch } = useGetAppointmentsQuery({
    from: filters.from,
    to: filters.to,
    statuses: filters.statuses,
    staffId: filters.staffId,
    serviceId: filters.serviceId,
    sortBy: sortModel[0]?.field,
    sortDir: sortModel[0]?.sort === 'asc' ? 'asc' : 'desc',
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
  const cols = useMemo(
    () => columns({ onStatusChange: handleStatusChange }) as GridColDef<GridValidRowModel>[],
    [handleStatusChange],
  )

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
      heightOffset={130}
      dashboardPalette={VELA_IVORY_PALETTE}
      sx={showAppointmentsGridSx}
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
      disableColumnMenu
      disableRowSelectionOnClick
      onRowClick={handleRowClick}
      slots={{
        toolbar: () => <AppointmentsToolbar />,
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
            Нет записей
          </Box>
        ),
      }}
    />
  )
}
