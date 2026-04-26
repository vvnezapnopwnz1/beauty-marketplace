import { Box } from '@mui/material'
import { getServiceColor } from '@shared/lib/getServiceColor'

export function InitialsAvatar({ name, size = 26 }: { name: string; size?: number }) {
  const initials = (name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
  const color = getServiceColor(name ?? '')
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: `${color}18`,
        color,
        border: `1.5px solid ${color}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 700,
        flexShrink: 0,
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      {initials}
    </Box>
  )
}
