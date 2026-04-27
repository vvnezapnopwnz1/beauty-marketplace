import { lighten, type Theme } from '@mui/material/styles'
import { DASHBOARD_LIGHT as L } from '@shared/theme/dashboardPalette'

/** Light Cream — основной фон тела таблицы (сетка, область скролла). */
export const LIGHT_CREAM_TABLE_SURFACE = '#F2ECE5'

/** Светлое выделение строки при hover (светлая тема). */
const LIGHT_ROW_HOVER = '#FFFFFF'

const rSm = '8px'
const rLg = '10px'

/**
 * Светлая тема таблицы: Light Cream (остальные «темы» сетки убраны).
 * Тёмная — через getDataGridDashboardSx (Warm Mocha, theme.palette.dashboard).
 */
export const lightCreamDataGridBaseSx = {
  '& .MuiDataGrid-virtualScroller ': {
    '@supports(overflow: overlay)': {
      overflow: 'overlay',
    },
    overflow: 'overlay',
    scrollbarGutter: 'auto',
    '& + div': {
      display: 'none',
    },
  },

  '& .MuiDataGrid-t-header-background-base': {
    backgroundColor: `${L.gridHeader} !important`,
    borderBottom: `1px solid ${L.border}`,
    borderRadius: `${rLg} ${rLg} 0 0`,
  },

  border: `1px solid ${L.border}`,
  borderRadius: rLg,
  backgroundColor: LIGHT_CREAM_TABLE_SURFACE,
  color: L.text,
  fontFamily: 'inherit',
  boxShadow: `0 2px 20px ${L.shadowDeep}`,
  '.MuiDataGrid-columnHeader': {
    backgroundColor: `${L.gridHeader} !important`,
    borderBottom: `1px solid ${L.border}`,
    borderRadius: `${rLg} ${rLg} 0 0`,
  },
  '.MuiDataGrid-filler--pinnedRight': {
    backgroundColor: `${L.gridHeader} !important`,
    borderLeft: `1px solid ${L.border}`,
    borderRight: `1px solid ${L.border}`,
  },
  '.MuiDataGrid-iconButtonContainer': {
    backgroundColor: `${L.gridHeader} !important`,
    borderLeft: `1px solid ${L.border}`,
    borderRight: `1px solid ${L.border}`,
  },
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: `${L.gridHeader} !important`,
    borderBottom: `1px solid ${L.border}`,
    borderRadius: `${rLg} ${rLg} 0 0`,
  },
  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: 600,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    color: `${L.muted} !important`,
  },
  '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
    outline: 'none',
  },

  '& .MuiDataGrid-row': {
    borderBottom: `1px solid ${L.borderSubtle}`,
    cursor: 'pointer',
    transition: 'background-color 0.14s ease',
    backgroundColor: `${LIGHT_CREAM_TABLE_SURFACE} !important`,
    '&:hover': { backgroundColor: `${LIGHT_ROW_HOVER} !important` },
    '&.Mui-selected': { backgroundColor: `${L.accent}14 !important` },
    '&.Mui-selected:hover': { backgroundColor: `${L.accent}24 !important` },
  },
  '& .MuiDataGrid-row:hover .MuiDataGrid-cell': {
    backgroundColor: `${LIGHT_ROW_HOVER} !important`,
  },
  '& .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell': {
    backgroundColor: `${L.accent}14 !important`,
  },
  '& .MuiDataGrid-row.Mui-selected:hover .MuiDataGrid-cell': {
    backgroundColor: `${L.accent}24 !important`,
  },
  '& .MuiDataGrid-cell': {
    color: `${L.text} !important`,
    display: 'flex',
    alignItems: 'center',
    backgroundColor: `${LIGHT_CREAM_TABLE_SURFACE} !important`,
    '&:focus, &:focus-within': { outline: 'none' },
  },

  '& .MuiDataGrid-columnSeparator': { color: L.border },
  '*': { borderColor: `${L.border} !important` },

  '& .MuiCheckbox-root': {
    color: L.borderLight,
    padding: '4px',
    '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: L.accent },
  },

  '& .MuiDataGrid-toolbarContainer': {
    padding: '8px 12px',
    borderBottom: `1px solid ${L.border}`,
    backgroundColor: L.cardAlt,
    '& .MuiButton-root': {
      color: L.muted,
      fontSize: 12,
      fontFamily: 'inherit',
      borderRadius: rSm,
      '&:hover': { backgroundColor: L.controlHover, color: L.text },
    },
  },

  '& .MuiDataGrid-footerContainer': {
    borderTop: `1px solid ${L.border}`,
    borderRadius: `0 0 ${rLg} ${rLg}`,
    overflow: 'hidden',
    '& > div': {
      backgroundColor: `${L.cardAlt} !important`,
      borderTop: 'none !important',
    },
  },
  '& .MuiTablePagination-root': { color: L.muted },
  '& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel': {
    color: L.muted,
    fontSize: 12,
    margin: 0,
  },
  '& .MuiTablePagination-select': { color: L.mutedDark, fontSize: 12 },
  '& .MuiDataGrid-footerContainer .MuiIconButton-root': {
    color: L.muted,
    borderRadius: rSm,
    '&:hover': { backgroundColor: L.controlHover, color: L.text },
    '&.Mui-disabled': { opacity: 0.35 },
  },
  '& .MuiSelect-icon': { color: L.muted },

  '& .MuiDataGrid-virtualScroller::-webkit-scrollbar': { width: '7px', height: '7px' },
  '& .MuiDataGrid-virtualScroller::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
  '& .MuiDataGrid-virtualScroller::-webkit-scrollbar-thumb': {
    backgroundColor: L.borderLight,
    borderRadius: '10px',
  },

  '& .MuiDataGrid-pinnedColumns--right': {
    boxShadow: `0px 4px 16px ${L.shadowDeep}`,
    backgroundColor: `${LIGHT_CREAM_TABLE_SURFACE} !important`,
  },
  '& .MuiDataGrid-pinnedColumns--right .MuiDataGrid-cell': {
    backgroundColor: `${LIGHT_CREAM_TABLE_SURFACE} !important`,
  },
  '& .MuiDataGrid-pinnedColumnHeaders--right': {
    backgroundColor: `${L.gridHeader} !important`,
  },
  '& .MuiDataGrid-pinnedColumns--left': {
    backgroundColor: `${LIGHT_CREAM_TABLE_SURFACE} !important`,
  },
  '& .MuiDataGrid-pinnedColumnHeaders--left': {
    backgroundColor: `${L.gridHeader} !important`,
  },
}

function darkDashboardGridSx(theme: Theme) {
  const d = theme.palette.dashboard
  const darkRowHover = lighten(theme.palette.background.default, 0.12)
  return {
    border: `1px solid ${d.border}`,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
    boxShadow: `0 8px 28px ${d.shadowDeep}`,
    '& .MuiDataGrid-t-header-background-base': {
      backgroundColor: `${d.cardAlt} !important`,
      borderBottom: `1px solid ${d.border}`,
    },
    '.MuiDataGrid-columnHeader': {
      backgroundColor: `${d.cardAlt} !important`,
      borderBottom: `1px solid ${d.border}`,
    },
    '.MuiDataGrid-filler--pinnedRight': {
      backgroundColor: `${d.cardAlt} !important`,
      borderLeft: `1px solid ${d.border}`,
      borderRight: `1px solid ${d.border}`,
    },
    '.MuiDataGrid-iconButtonContainer': {
      backgroundColor: `${d.cardAlt} !important`,
      borderLeft: `1px solid ${d.border}`,
      borderRight: `1px solid ${d.border}`,
    },
    '& .MuiDataGrid-columnHeaders': {
      backgroundColor: `${d.cardAlt} !important`,
      borderBottom: `1px solid ${d.border}`,
    },
    '& .MuiDataGrid-columnHeaderTitle': {
      color: `${d.muted} !important`,
    },
    '& .MuiDataGrid-sortIcon, & .MuiDataGrid-menuIconButton': {
      color: `${theme.palette.text.secondary} !important`,
    },
    '& .MuiDataGrid-row': {
      borderBottom: `1px solid ${d.borderSubtle}`,
      backgroundColor: `${theme.palette.background.default} !important`,
      transition: 'background-color 0.14s ease',
      '&:hover': { backgroundColor: `${darkRowHover} !important` },
      '&.Mui-selected': {
        backgroundColor: `${d.accent}29 !important`,
      },
      '&.Mui-selected:hover': {
        backgroundColor: `${d.accent}3d !important`,
      },
    },
    '& .MuiDataGrid-row:hover .MuiDataGrid-cell': {
      backgroundColor: `${darkRowHover} !important`,
    },
    '& .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell': {
      backgroundColor: `${d.accent}29 !important`,
    },
    '& .MuiDataGrid-row.Mui-selected:hover .MuiDataGrid-cell': {
      backgroundColor: `${d.accent}3d !important`,
    },
    '& .MuiDataGrid-cell': {
      color: `${theme.palette.text.primary} !important`,
      backgroundColor: `${theme.palette.background.default} !important`,
    },
    '& .MuiDataGrid-columnSeparator': { color: d.grid },
    '*': { borderColor: `${d.border} !important` },
    '& .MuiDataGrid-toolbarContainer': {
      borderBottom: `1px solid ${d.border}`,
      backgroundColor: d.cardAlt,
      '& .MuiButton-root': {
        color: d.muted,
        '&:hover': {
          backgroundColor: d.controlHover,
          color: theme.palette.text.primary,
        },
      },
    },
    '& .MuiDataGrid-footerContainer': {
      borderTop: `1px solid ${d.border}`,
      '& > div': {
        backgroundColor: `${d.cardAlt} !important`,
      },
    },
    '& .MuiTablePagination-root': { color: d.muted },
    '& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel': {
      color: d.muted,
    },
    '& .MuiTablePagination-select, & .MuiSelect-icon': { color: theme.palette.text.secondary },
    '& .MuiDataGrid-footerContainer .MuiIconButton-root': {
      color: d.muted,
      '&:hover': {
        backgroundColor: d.controlHover,
        color: theme.palette.text.primary,
      },
      '&.Mui-disabled': { opacity: 0.4 },
    },
    '& .MuiDataGrid-virtualScroller::-webkit-scrollbar-thumb': {
      backgroundColor: d.borderLight,
    },
    '& .MuiDataGrid-pinnedColumns--right': {
      boxShadow: `0 8px 28px ${d.shadowDeep}`,
      backgroundColor: `${theme.palette.background.default} !important`,
    },
    '& .MuiDataGrid-pinnedColumns--right .MuiDataGrid-cell': {
      backgroundColor: `${theme.palette.background.default} !important`,
    },
    '& .MuiDataGrid-pinnedColumnHeaders--right': {
      backgroundColor: `${d.cardAlt} !important`,
    },
    '& .MuiDataGrid-pinnedColumns--left': {
      backgroundColor: `${theme.palette.background.default} !important`,
    },
    '& .MuiDataGrid-pinnedColumnHeaders--left': {
      backgroundColor: `${d.cardAlt} !important`,
    },
  }
}

/** Таблица: Light Cream в светлой теме приложения, Warm Mocha в тёмной. */
export function getDataGridDashboardSx(theme: Theme) {
  const isDark = theme.palette.mode === 'dark'
  if (!isDark) return lightCreamDataGridBaseSx

  return {
    ...lightCreamDataGridBaseSx,
    ...darkDashboardGridSx(theme),
  }
}
