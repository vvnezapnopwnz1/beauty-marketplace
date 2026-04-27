import { JSX, useCallback, useMemo, useState } from 'react'
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  GridColDef,
  GridPaginationModel,
  GridRowParams,
  GridSortModel,
  GridToolbarColumnsButton,
  GridValidRowModel,
} from '@mui/x-data-grid-premium'
import RenderTable from '@shared/ui/DataGrid/RenderTable'
import { getDataGridDashboardSx } from '@shared/ui/DataGrid/dataGridDashboardSx'
import { useAppDispatch, useAppSelector } from '@app/store'
import {
  openClientDrawer,
  useCreateClientTagMutation,
  setClientFilters,
  useGetClientTagsQuery,
  useGetClientsQuery,
} from '@entities/client'
import type { SalonClient } from '@entities/client'
import { clientColumns } from '../model/columns'
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
  const theme = useTheme()
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
  const [createClientTag, { isLoading: createTagBusy }] = useCreateClientTagMutation()
  const [createTagOpen, setCreateTagOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6366F1')

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

  const handleOpenAddTag = () => setCreateTagOpen(true)

  const handleCloseAddTag = () => {
    if (createTagBusy) return
    setCreateTagOpen(false)
    setNewTagName('')
    setNewTagColor('#6366F1')
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    await createClientTag({ name: newTagName.trim(), color: newTagColor }).unwrap()
    handleCloseAddTag()
  }

  return (
    <Box>
      <FilterClientsBar
        filters={filters}
        tags={tags}
        setFilters={next => dispatch(setClientFilters(next))}
        onAddTag={handleOpenAddTag}
        onAddClient={handleAddClient}
      />
      <RenderTable
        tableName="clients"
        rows={(data?.items ?? []) as GridValidRowModel[]}
        error={error}
        checkboxSelection={false}
        heightOffset={160}
        dashboardPalette={theme.palette.dashboard}
        sx={getDataGridDashboardSx}
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
      <Dialog open={createTagOpen} onClose={handleCloseAddTag} fullWidth maxWidth="xs">
        <DialogTitle>Добавить тег</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', pt: 0.5 }}>
            <TextField
              autoFocus
              fullWidth
              size="small"
              label="Название"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
            />
            <input
              type="color"
              value={newTagColor}
              onChange={e => setNewTagColor(e.target.value)}
              style={{ width: 40, height: 40, border: 'none', background: 'transparent', cursor: 'pointer' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddTag} disabled={createTagBusy}>
            Отмена
          </Button>
          <Button variant="contained" onClick={() => void handleCreateTag()} disabled={!newTagName.trim() || createTagBusy}>
            Добавить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
