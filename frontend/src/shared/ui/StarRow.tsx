import { Box, Stack } from '@mui/material'
import { useBrandColors } from '@shared/theme'

export function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  const COLORS = useBrandColors()
  return (
    <Stack direction="row" gap={0.3} component="span" aria-hidden>
      {[1, 2, 3, 4, 5].map(i => (
        <Box
          key={i}
          component="span"
          sx={{ color: i <= Math.round(rating) ? '#E8A020' : COLORS.borderLight, fontSize: size }}
        >
          ★
        </Box>
      ))}
    </Stack>
  )
}
