import { memo, ReactNode } from 'react'
import { CircularProgress } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  DataGridPremiumProps,
  GRID_CHECKBOX_SELECTION_COL_DEF,
  GridColumnVisibilityModel,
  GridRowModel,
  GridRowParams,
  GridRowSelectionModel,
} from '@mui/x-data-grid-premium'

import type { DashboardPalette } from '@shared/theme'
import { TTableName } from './types'

import ExtendedFooter from './Pagination/Footer'
import DataGridTable from './styles'
import EmptyState from './noRowsStates'
import NoRows from './noRowsStates/NoRows'

interface Props<Row extends GridRowModel = any> extends DataGridPremiumProps<Row> {
  renderCenterToolbar?: ReactNode
  renderStartToolbar?: ReactNode
  renderEndToolbar?: ReactNode
  renderStartFooter?: ReactNode
  renderAdditionalExport?: ReactNode
  hideToolbar?: boolean
  renderCustomExport?: ReactNode
  tableName: TTableName
  heightOffset?: number
  minHeight?: number
  /** Доп. пиксели под тулбар/заголовки (напр. при column grouping) — см. DataGrid extraHeaderOffset */
  extraHeaderOffset?: number
  enableSingleSelect?: boolean
  error?: { status: number } | any
  hideColumnVisibility?: boolean
  hideExport?: boolean
  userItemsSelected?: GridRowSelectionModel
  dashboardPalette?: DashboardPalette

  handleUserItemsSelected?: (items: GridRowSelectionModel) => void
  isRowDisabled?: (params: GridRowParams) => boolean
  defaultColumnVisibilityModel?: GridColumnVisibilityModel

  /** Заголовок состояния пустой таблицы. Если в таблице нет данных и от юзера требуется какое-то действие используется этот пропс чтобы сообщить ему от этом */
  emptyStateTitle?: string

  extendedColumnsPanel?: ReactNode
  forceExtendedHeader?: boolean
}

const RenderTable = (props: Props) => {
  const {
    pagination,
    renderCenterToolbar,
    renderEndToolbar,
    renderStartToolbar,
    renderStartFooter,
    tableName = 'test',
    enableSingleSelect,
    pageSizeOptions = [10, 20, 50, 100, 150],
    slots,
    minHeight,
    apiRef,
    error,
    hideExport = false,
    hideColumnVisibility = false,
    keepNonExistentRowsSelected,
    renderCustomExport,
    userItemsSelected = [],
    handleUserItemsSelected,
    isRowDisabled,
    extendedColumnsPanel,
    initialState,
    defaultColumnVisibilityModel,
    emptyStateTitle,
    forceExtendedHeader = false,
    dashboardPalette: dashboardPaletteProp,
    ...other
  } = props

  const theme = useTheme()
  const dashboardPalette = dashboardPaletteProp ?? theme.palette.dashboard

  const {
    columns: rawColumns = [],
    sortModel,
    paginationModel,
    onSortModelChange,
    onPaginationModelChange,
    ...rest
  } = other

  // Функция для применения стилей к строкам
  const getRowClassName = (params: GridRowParams) => {
    if (isRowDisabled && isRowDisabled(params)) {
      return 'row--inactive'
    }
    return ''
  }

  return (
    <>
      <DataGridTable
        apiRef={apiRef}
        minHeight={minHeight}
        dashboardPalette={dashboardPalette}
        showColumnVerticalBorder
        checkboxSelection
        disableColumnMenu
        disableRowSelectionOnClick
        getRowClassName={getRowClassName}
        slots={{
          noRowsOverlay: () => <EmptyState status={error?.status} title={emptyStateTitle} />,
          noResultsOverlay: () => <NoRows />,
          loadingOverlay: () => <CircularProgress />,

          footer: () => (
            <ExtendedFooter
              keepNonExistentRowsSelected={keepNonExistentRowsSelected}
              renderStartFooter={renderStartFooter}
              pagination={pagination}
              handleUserItemsSelected={handleUserItemsSelected}
            />
          ),

          ...slots,
        }}
        slotProps={{
          columnsPanel: {},
          toolbar: {},
        }}
        initialState={{
          pinnedColumns: {
            left: [GRID_CHECKBOX_SELECTION_COL_DEF.field],
            right: ['actions'],
          },
          ...initialState,
          columns: {
            ...initialState?.columns,
            columnVisibilityModel: {
              ...defaultColumnVisibilityModel,
              ...initialState?.columns?.columnVisibilityModel,
            },
          },
        }}
        keepNonExistentRowsSelected={keepNonExistentRowsSelected}
        columns={rawColumns}
        sortModel={sortModel}
        pagination={pagination}
        pageSizeOptions={pageSizeOptions}
        paginationModel={paginationModel}
        onSortModelChange={onSortModelChange}
        onPaginationModelChange={onPaginationModelChange}
        {...rest}
      />
    </>
  )
}

export default memo(RenderTable)
