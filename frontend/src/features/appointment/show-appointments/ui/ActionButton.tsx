import { Box } from '@mui/material'
import { V } from '@shared/theme/palettes'

interface ActionBtnProps {
  label: string
  color: string
  bg: string
  disabled?: boolean
  onClick?: () => void
}

export default function ActionBtn({ label, color, bg, disabled, onClick }: ActionBtnProps) {
  return (
    <Box
      component="button"
      onClick={disabled ? undefined : onClick}
      sx={{
        px: '10px',
        py: '4px',
        borderRadius: V.rSm,
        fontSize: 11,
        fontWeight: 600,
        border: `1px solid ${disabled ? 'transparent' : `${color}55`}`,
        bgcolor: 'transparent',
        color: disabled ? `${color}50` : color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
        transition: 'all 0.12s',
        opacity: disabled ? 0.45 : 1,
        '&:hover': disabled ? {} : { bgcolor: bg, borderColor: color },
      }}
    >
      {label}
    </Box>
  )
}
