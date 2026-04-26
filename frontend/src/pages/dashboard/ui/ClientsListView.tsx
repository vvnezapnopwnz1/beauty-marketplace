import { Box, Typography } from '@mui/material'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { ShowClientsGrid } from '@features/clients/show-clients/ui/ShowClientsGrid'

export function ClientsListView() {
  const d = useDashboardPalette()

  return (
    <Box>
      <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: d.text, mb: 2 }}>
        Клиенты
      </Typography>
      <ShowClientsGrid />
    </Box>
  )
}
