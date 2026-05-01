import { Box } from '@mui/material'
import { ThemePicker } from '@shared/ui/ThemePicker'

export function AppearanceSection() {
  return (
    <Box sx={{ maxWidth: 560 }}>
      <ThemePicker />
    </Box>
  )
}
