import { ReactNode } from 'react'
import { Box } from '@mui/material'
import { V } from '@shared/theme/palettes'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'

interface PillChipProps {
  children: ReactNode
  active?: boolean
  onClick?: () => void
}

export function PillChip({ children, active, onClick }: PillChipProps) {
  const d = useDashboardPalette()
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        px: '12px',
        py: '5px',
        borderRadius: V.rSm,
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        border: 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s',
        fontFamily: 'inherit',
        bgcolor: active ? d.accent : 'transparent',
        color: active ? d.onAccent : d.mutedDark,
        '&:hover': {
          bgcolor: active ? d.accentDark : V.surfaceHi,
          color: active ? '#fff' : V.text,
        },
      }}
    >
      {children}
    </Box>
  )
}
