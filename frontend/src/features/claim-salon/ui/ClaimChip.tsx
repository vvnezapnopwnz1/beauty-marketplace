import { Box } from '@mui/material'
import { useNavigate } from 'react-router-dom'

import { claimSalonPath } from '@shared/config/routes'

interface ClaimChipProps {
  source: string
  externalId: string
}

export function ClaimChip({ source, externalId }: ClaimChipProps) {
  const navigate = useNavigate()

  return (
    <Box
      component="button"
      onClick={() => navigate(claimSalonPath(source, externalId))}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1.2,
        py: 0.4,
        border: '1px dashed rgba(255,255,255,0.5)',
        borderRadius: '100px',
        bgcolor: 'transparent',
        color: 'rgba(255,255,255,0.75)',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
        '&:hover': {
          borderColor: 'rgba(255,255,255,0.9)',
          color: 'white',
        },
      }}
    >
      Это ваш бизнес? →
    </Box>
  )
}
