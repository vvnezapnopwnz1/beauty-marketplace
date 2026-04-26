import { JSX, useCallback, useMemo, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { useNavigate } from 'react-router-dom'
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
import { setClientFilters, useGetClientsQuery, useGetClientTagsQuery } from '@entities/client'
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

  const cols = useMemo(() => clientColumns as GridColDef<GridValidRowModel>[], [])

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
