import { Box, Button, Typography } from '@mui/material'

export function SalonCallSidebar({ phone }: { phone?: string }) {
  if (!phone) return null
  return (
    <Box sx={{ border: '1px solid #E5DFD5', borderRadius: '16px', p: 3 }}>
      <Typography sx={{ fontSize: 18, fontWeight: 600, mb: 1 }}>Связаться с салоном</Typography>
      <Typography sx={{ fontSize: 14, mb: 2 }}>{phone}</Typography>
      <Button component="a" href={`tel:${phone}`} variant="contained" fullWidth>
        Позвонить
      </Button>
    </Box>
  )
}
