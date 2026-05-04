import type { SxProps, Theme } from '@mui/material/styles'
import type { DashboardPalette } from '@shared/theme'
import { useDashboardPalette } from './useDashboardPalette'

const R_SM = '8px'
const R_MD = '14px'

/** Compact dashboard Select (filters). Must be derived from live palette — not module-level `V.*` (frozen at first import). */
export function dashboardFilterSelectSx(d: DashboardPalette): {
  filterSelectSx: SxProps<Theme>
  menuPaperSx: SxProps<Theme>
  menuItemSx: SxProps<Theme>
} {
  return {
    filterSelectSx: {
      bgcolor: d.surface,
      borderRadius: R_SM,
      fontSize: 12,
      color: d.text,
      height: '33px',
      minWidth: 130,
      '& .MuiOutlinedInput-notchedOutline': { borderColor: d.border, top: 0 },
      '& .MuiOutlinedInput-notchedOutline legend': { display: 'none' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: d.accent },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: d.accent, borderWidth: '1.5px' },
      '& .MuiSelect-select': { py: 0, px: '10px', color: d.text },
      '& .MuiSvgIcon-root': { color: d.textMuted },
    },
    menuPaperSx: {
      bgcolor: d.surface,
      color: d.text,
      border: `1px solid ${d.border}`,
      borderRadius: R_MD,
      boxShadow: '0 8px 24px rgba(212,84,122,0.10)',
    },
    menuItemSx: {
      fontSize: 13,
      color: d.text,
      '&:hover': { bgcolor: d.surfaceEl },
      '&.Mui-selected': { bgcolor: d.surfaceHi, color: d.accent },
      '&.Mui-selected:hover': { bgcolor: d.surfaceHi },
    },
  }
}

export function useDashboardFilterSelectSx(): ReturnType<typeof dashboardFilterSelectSx> {
  const d = useDashboardPalette()
  return dashboardFilterSelectSx(d)
}
