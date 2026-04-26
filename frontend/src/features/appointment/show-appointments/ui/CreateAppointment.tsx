import { Box } from '@mui/material'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'

interface CreateAppointmentBtnProps {
  onClick: () => void
}

export default function CreateAppointmentBtn({ onClick }: CreateAppointmentBtnProps) {
  const d = useDashboardPalette()
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        px: '14px',
        py: '7px',
        borderRadius: 14,
        fontSize: 12,
        fontWeight: 600,
        border: 'none',
        cursor: 'pointer',
        bgcolor: d.accent,
        color: d.onAccent,
        fontFamily: 'inherit',
        transition: 'background 0.15s',
        '&:hover': { bgcolor: d.accentDark },
      }}
    >
      ＋ Создать запись
    </Box>
  )
}
