import { Box, Button, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'

import { claimStatusPath } from '@shared/config/routes'

interface ClaimSuccessScreenProps {
  source: string
  externalId: string
}

export function ClaimSuccessScreen({ source, externalId }: ClaimSuccessScreenProps) {
  const navigate = useNavigate()

  return (
    <Box sx={{ textAlign: 'center', py: 6, px: 3, maxWidth: 480, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontFamily: "'Fraunces', serif", mb: 2 }}>
        Заявка принята!
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Мы проверим ваши данные в течение 1-3 рабочих дней и сообщим о решении.
      </Typography>
      <Button variant="outlined" onClick={() => navigate(claimStatusPath(source, externalId))}>
        Проверить статус заявки
      </Button>
    </Box>
  )
}
