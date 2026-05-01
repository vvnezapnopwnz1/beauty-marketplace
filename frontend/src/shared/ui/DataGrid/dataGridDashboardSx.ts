import { lighten, type Theme } from '@mui/material/styles'

/** @deprecated kept for legacy call sites */
export const LIGHT_CREAM_TABLE_SURFACE = '#F2ECE5'

const rSm = '8px'
const rLg = '10px'

function baseDashboardGridSx(theme: Theme) {
  const d = theme.palette.dashboard
  const rowHover = d.cellAlt

  return {
    '& .MuiDataGrid-virtualScroller ': {
      '@supports(overflow: overlay)': { overflow: 'overlay' },
      overflow: 'overlay',
      scrollbarGutter: 'auto',
      '& + div': { display: 'none' },
    },

    '& .MuiDataGrid-t-header-background-base': {
      backgroundColor: `${d.gridHeader} !important`,
      borderBottom: `1px solid ${d.border}`,
      borderRadius: `${rLg} ${rLg} 0 0`,
    },

    border: `1px solid ${d.border}`,
    borderRadius: rLg,
    backgroundColor: d.bg,
    color: d.text,
    fontFamily: 'inherit',
    boxShadow: `0 2px 20px ${d.shadowDeep}`,

    '.MuiDataGrid-columnHeader': {
      backgroundColor: `${d.gridHeader} !important`,
      borderBottom: `1px solid ${d.border}`,
      borderRadius: `${rLg} ${rLg} 0 0`,
    },
    '.MuiDataGrid-filler--pinnedRight': {
      backgroundColor: `${d.gridHeader} !important`,
      borderLeft: `1px solid ${d.border}`,
      borderRight: `1px solid ${d.border}`,
    },
    '.MuiDataGrid-iconButtonContainer': {
      backgroundColor: `${d.gridHeader} !important`,
      borderLeft: `1px solid ${d.border}`,
      borderRight: `1px solid ${d.border}`,
    },
    '& .MuiDataGrid-columnHeaders': {
      backgroundColor: `${d.gridHeader} !important`,
      borderBottom: `1px solid ${d.border}`,
      borderRadius: `${rLg} ${rLg} 0 0`,
    },
    '& .MuiDataGrid-columnHeaderTitle': {
      fontWeight: 600,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.6px',
      color: `${d.muted} !important`,
    },
    '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
      outline: 'none',
    },

    '& .MuiDataGrid-row': {
      borderBottom: `1px solid ${d.borderSubtle}`,
      cursor: 'pointer',
      transition: 'background-color 0.14s ease',
      backgroundColor: `${d.cell} !important`,
      '&:hover': { backgroundColor: `${rowHover} !important` },
      '&.Mui-selected': { backgroundColor: `${d.accent}14 !important` },
      '&.Mui-selected:hover': { backgroundColor: `${d.accent}24 !important` },
    },
    '& .MuiDataGrid-row:hover .MuiDataGrid-cell': {
      backgroundColor: `${rowHover} !important`,
    },
    '& .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell': {
      backgroundColor: `${d.accent}14 !important`,
    },
    '& .MuiDataGrid-row.Mui-selected:hover .MuiDataGrid-cell': {
      backgroundColor: `${d.accent}24 !important`,
    },
    '& .MuiDataGrid-cell': {
      color: `${d.text} !important`,
      display: 'flex',
      alignItems: 'center',
      backgroundColor: `${d.cell} !important`,
      '&:focus, &:focus-within': { outline: 'none' },
    },

    '& .MuiDataGrid-columnSeparator': { color: d.border },
    '*': { borderColor: `${d.border} !important` },

    '& .MuiCheckbox-root': {
      color: d.borderLight,
      padding: '4px',
      '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: d.accent },
    },

    '& .MuiDataGrid-toolbarContainer': {
      padding: '8px 12px',
      borderBottom: `1px solid ${d.border}`,
      backgroundColor: d.cardAlt,
      '& .MuiButton-root': {
        color: d.muted,
        fontSize: 12,
        fontFamily: 'inherit',
        borderRadius: rSm,
        '&:hover': { backgroundColor: d.controlHover, color: d.text },
      },
    },

    '& .MuiDataGrid-footerContainer': {
      borderTop: `1px solid ${d.border}`,
      borderRadius: `0 0 ${rLg} ${rLg}`,
      overflow: 'hidden',
      '& > div': {
        backgroundColor: `${d.cardAlt} !important`,
        borderTop: 'none !important',
      },
    },
    '& .MuiTablePagination-root': { color: d.muted },
    '& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel': {
      color: d.muted,
      fontSize: 12,
      margin: 0,
    },
    '& .MuiTablePagination-select': { color: d.mutedDark, fontSize: 12 },
    '& .MuiDataGrid-footerContainer .MuiIconButton-root': {
      color: d.muted,
      borderRadius: rSm,
      '&:hover': { backgroundColor: d.controlHover, color: d.text },
      '&.Mui-disabled': { opacity: 0.35 },
    },
    '& .MuiSelect-icon': { color: d.muted },

    '& .MuiDataGrid-virtualScroller::-webkit-scrollbar': { width: '7px', height: '7px' },
    '& .MuiDataGrid-virtualScroller::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
    '& .MuiDataGrid-virtualScroller::-webkit-scrollbar-thumb': {
      backgroundColor: d.borderLight,
      borderRadius: '10px',
    },

    '& .MuiDataGrid-pinnedColumns--right': {
      boxShadow: `0px 4px 16px ${d.shadowDeep}`,
      backgroundColor: `${d.cell} !important`,
    },
    '& .MuiDataGrid-pinnedColumns--right .MuiDataGrid-cell': {
      backgroundColor: `${d.cell} !important`,
    },
    '& .MuiDataGrid-pinnedColumnHeaders--right': {
      backgroundColor: `${d.gridHeader} !important`,
    },
    '& .MuiDataGrid-pinnedColumns--left': {
      backgroundColor: `${d.cell} !important`,
    },
    '& .MuiDataGrid-pinnedColumnHeaders--left': {
      backgroundColor: `${d.gridHeader} !important`,
    },
  }
}

function darkOverrideSx(theme: Theme) {
  const d = theme.palette.dashboard
  const darkRowHover = lighten(theme.palette.background.default, 0.12)
  return {
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
    boxShadow: `0 8px 28px ${d.shadowDeep}`,
    '& .MuiDataGrid-row': {
      backgroundColor: `${theme.palette.background.default} !important`,
      '&:hover': { backgroundColor: `${darkRowHover} !important` },
      '&.Mui-selected': { backgroundColor: `${d.accent}29 !important` },
      '&.Mui-selected:hover': { backgroundColor: `${d.accent}3d !important` },
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
    '& .MuiDataGrid-sortIcon, & .MuiDataGrid-menuIconButton': {
      color: `${theme.palette.text.secondary} !important`,
    },
    '& .MuiTablePagination-select, & .MuiSelect-icon': { color: theme.palette.text.secondary },
  }
}

/** Returns DataGrid sx styles themed to the active palette. */
export function getDataGridDashboardSx(theme: Theme) {
  const base = baseDashboardGridSx(theme)
  if (theme.palette.dashboard.dark) {
    return { ...base, ...darkOverrideSx(theme) }
  }
  return base
}

/** @deprecated use getDataGridDashboardSx */
export const lightCreamDataGridBaseSx = {}
