import { useCallback, useMemo } from 'react'
import { Box, Typography, useTheme } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { dashboardPath } from '@shared/config/routes'
import { type DashboardStaffListItem } from '@shared/api/dashboardApi'
import { useGetStaffListQuery } from '@entities/staff'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { type GridColDef } from '@mui/x-data-grid-premium'
import RenderTable from '@shared/ui/DataGrid/RenderTable'
import { getDataGridDashboardSx } from '@shared/ui/DataGrid/dataGridDashboardSx'

export function StaffListView(props: { onSelectStaff?: (staffId: string) => void }) {
  const { onSelectStaff } = props
  const theme = useTheme()
  const d = useDashboardPalette()
  const navigate = useNavigate()
  const { salonId } = useParams<{ salonId: string }>()
  const { data, isLoading, isFetching, isError } = useGetStaffListQuery(undefined, {
    refetchOnMountOrArgChange: true,
  })

  const rows = data ?? []

  const handleOpenDetails = useCallback(
    (staffId: string) => {
      if (onSelectStaff) {
        onSelectStaff(staffId)
        return
      }
      if (salonId) navigate(`${dashboardPath(salonId)}/staff/${staffId}`)
    },
    [navigate, onSelectStaff, salonId],
  )

  const columns = useMemo<GridColDef<DashboardStaffListItem>[]>(
    () => [
      {
        field: 'staffName',
        headerName: 'Мастер',
        minWidth: 260,
        flex: 1,
        sortable: false,
        valueGetter: (_: unknown, row: DashboardStaffListItem) => row.staff.displayName,
        renderCell: params => (
          <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 0.5 }}>
            <Typography sx={{ fontWeight: 600, color: d.text }} noWrap>
              {params.row.staff.displayName}
            </Typography>
            <Typography sx={{ fontSize: 12, color: d.mutedDark }} noWrap>
              {[params.row.staff.role, params.row.staff.level].filter(Boolean).join(' · ') || '—'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'isActive',
        headerName: 'Активен',
        width: 100,
        valueGetter: (_: unknown, row: DashboardStaffListItem) =>
          row.staff.isActive ? 'Да' : 'Нет',
      },
      {
        field: 'services',
        headerName: 'Услуг',
        width: 100,
        valueGetter: (_: unknown, row: DashboardStaffListItem) =>
          String(row.connectedServices.length),
      },
      {
        field: 'completedVisits',
        headerName: 'Визиты',
        width: 100,
        valueGetter: (_: unknown, row: DashboardStaffListItem) => row.completedVisits,
      },
      {
        field: 'revenueMonthCents',
        headerName: 'Выручка',
        width: 140,
        valueGetter: (_: unknown, row: DashboardStaffListItem) => row.revenueMonthCents,
        valueFormatter: ({ value }) =>
          value > 0 ? `${(value / 100).toLocaleString('ru-RU')} ₽` : '—',
      },
    ],
    [d.text, d.mutedDark],
  )

  return (
    <Box>
      <RenderTable
        tableName="staff"
        rows={rows}
        loading={isLoading || isFetching}
        error={isError ? { status: 500 } : undefined}
        checkboxSelection={false}
        disableRowSelectionOnClick
        minHeight={560}
        heightOffset={110}
        columns={columns}
        getRowId={row => row.staff.id}
        density="comfortable"
        disableColumnMenu
        dashboardPalette={theme.palette.dashboard}
        sx={getDataGridDashboardSx}
        emptyStateTitle="Нет мастеров"
        onRowClick={params => handleOpenDetails(params.row.staff.id)}
      />
    </Box>
  )
}
