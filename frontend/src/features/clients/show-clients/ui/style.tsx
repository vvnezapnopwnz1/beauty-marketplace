import { V } from '@shared/theme/palettes'

export const showClientsGridSx = {
  '& .MuiDataGrid-virtualScroller': {
    '@supports(overflow: overlay)': { overflow: 'overlay' },
    overflow: 'overlay',
    scrollbarGutter: 'auto',
    '& + div': { display: 'none' },
  },
  border: `1px solid ${V.border}`,
  borderRadius: V.rLg,
  backgroundColor: V.surface,
  color: V.text,
  fontFamily: 'inherit',
  boxShadow: '0 2px 20px rgba(212,84,122,0.07)',
  '.MuiDataGrid-columnHeader': {
    backgroundColor: `${V.surfaceEl} !important`,
    borderBottom: `1px solid ${V.border}`,
    borderRadius: `${V.rLg} ${V.rLg} 0 0`,
  },
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: `${V.surfaceEl} !important`,
    borderBottom: `1px solid ${V.border}`,
    borderRadius: `${V.rLg} ${V.rLg} 0 0`,
  },
  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: 600,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    color: `${V.textMuted} !important`,
  },
  '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
    outline: 'none',
  },
  '& .MuiDataGrid-row': {
    borderBottom: `1px solid ${V.borderSub}`,
    cursor: 'pointer',
    transition: 'background 0.12s',
    backgroundColor: `${V.surface} !important`,
    '&:hover': { backgroundColor: `${V.surfaceEl} !important` },
    '&.Mui-selected': { backgroundColor: `${V.accent}09 !important` },
    '&.Mui-selected:hover': { backgroundColor: `${V.accent}14 !important` },
  },
  '& .MuiDataGrid-cell': {
    color: `${V.text} !important`,
    display: 'flex',
    alignItems: 'center',
    backgroundColor: `${V.surface} !important`,
    '&:focus, &:focus-within': { outline: 'none' },
  },
  '& .MuiDataGrid-columnSeparator': { color: V.border },
  '*': { borderColor: `${V.border} !important` },
  '& .MuiCheckbox-root': {
    color: V.border,
    padding: '4px',
    '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: V.accent },
  },
  '& .MuiDataGrid-toolbarContainer': {
    padding: '8px 12px',
    borderBottom: `1px solid ${V.border}`,
    backgroundColor: V.surfaceEl,
    '& .MuiButton-root': {
      color: V.textMuted,
      fontSize: 12,
      fontFamily: 'inherit',
      borderRadius: V.rSm,
      '&:hover': { backgroundColor: V.surfaceHi, color: V.text },
    },
  },
  '& .MuiDataGrid-footerContainer': {
    borderTop: `1px solid ${V.border}`,
    borderRadius: `0 0 ${V.rLg} ${V.rLg}`,
    overflow: 'hidden',
    '& > div': {
      backgroundColor: `${V.surfaceEl} !important`,
      borderTop: 'none !important',
    },
  },
  '& .MuiTablePagination-root': { color: V.textMuted },
  '& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel': {
    color: V.textMuted,
    fontSize: 12,
    margin: 0,
  },
  '& .MuiTablePagination-select': { color: V.textSub, fontSize: 12 },
  '& .MuiDataGrid-footerContainer .MuiIconButton-root': {
    color: V.textMuted,
    borderRadius: V.rSm,
    '&:hover': { backgroundColor: V.surfaceHi, color: V.text },
    '&.Mui-disabled': { opacity: 0.35 },
  },
  '& .MuiSelect-icon': { color: V.textMuted },
  '& .MuiDataGrid-virtualScroller::-webkit-scrollbar': { width: '7px', height: '7px' },
  '& .MuiDataGrid-virtualScroller::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
  '& .MuiDataGrid-virtualScroller::-webkit-scrollbar-thumb': {
    backgroundColor: V.border,
    borderRadius: '10px',
  },
  '& .MuiDataGrid-pinnedColumns--right': {
    boxShadow: `0px 4px 16px rgba(212,84,122,0.08)`,
    backgroundColor: `${V.surface} !important`,
  },
  '& .MuiDataGrid-pinnedColumns--right .MuiDataGrid-cell': {
    backgroundColor: `${V.surface} !important`,
  },
  '& .MuiDataGrid-pinnedColumnHeaders--right': {
    backgroundColor: `${V.surfaceEl} !important`,
  },
}
