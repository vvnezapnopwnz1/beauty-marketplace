import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'

import { fetchMyClaimStatus, type ClaimStatus } from '@shared/api/claimApi'
import { ROUTES, salonPath } from '@shared/config/routes'
import { NavBar } from '@shared/ui/NavBar'

const STATUS_TEXT: Record<ClaimStatus, string> = {
  pending: 'На рассмотрении',
  approved: 'Одобрена',
  rejected: 'Отклонена',
  duplicate: 'Дубликат',
}

const STATUS_HINT: Record<ClaimStatus, string> = {
  pending: 'Заявка проверяется модератором. Обычно это занимает 1-3 рабочих дня.',
  approved: 'Заявка одобрена. Можно переходить в кабинет салона.',
  rejected: 'Заявка отклонена. Проверьте причину и при необходимости отправьте новую заявку.',
  duplicate: 'На этот салон уже есть одобренная заявка.',
}

export function ClaimStatusPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const source = params.get('source') ?? '2gis'
  const externalId = params.get('externalId') ?? ''
  const missingExternalId = !externalId

  const [loading, setLoading] = useState(!missingExternalId)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<ClaimStatus | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [salonId, setSalonId] = useState<string | null>(null)

  useEffect(() => {
    if (missingExternalId) return
    void fetchMyClaimStatus(source, externalId)
      .then((res) => {
        if (!res) {
          setError('Активная заявка не найдена.')
          return
        }
        setStatus(res.status)
        setRejectionReason(res.rejectionReason ?? null)
        setSalonId(res.salonId ?? null)
      })
      .catch(() => setError('Не удалось загрузить статус заявки. Попробуйте позже.'))
      .finally(() => setLoading(false))
  }, [externalId, missingExternalId, source])

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <NavBar />
      <Box sx={{ maxWidth: 560, mx: 'auto', px: 2, py: 5 }}>
        <Typography variant="h5" sx={{ fontFamily: "'Fraunces', serif", mb: 1 }}>
          Статус заявки
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Проверка прав на бизнес из 2GIS
        </Typography>

        {loading && <CircularProgress />}

        {missingExternalId && <Alert severity="error">Не указан externalId салона.</Alert>}
        {!missingExternalId && !loading && error && <Alert severity="error">{error}</Alert>}

        {!missingExternalId && !loading && !error && status && (
          <Stack gap={2}>
            <Alert severity={status === 'approved' ? 'success' : status === 'pending' ? 'info' : 'warning'}>
              <Typography fontWeight={700}>{STATUS_TEXT[status]}</Typography>
              <Typography variant="body2">{STATUS_HINT[status]}</Typography>
            </Alert>

            {rejectionReason && (
              <Alert severity="warning">
                <Typography variant="body2">
                  <strong>Причина:</strong> {rejectionReason}
                </Typography>
              </Alert>
            )}

            <Stack direction="row" gap={1.5}>
              {status === 'approved' && salonId ? (
                <Button variant="contained" onClick={() => navigate(salonPath(salonId))}>
                  Открыть салон
                </Button>
              ) : (
                <Button variant="contained" onClick={() => navigate(ROUTES.JOIN)}>
                  Найти другой салон
                </Button>
              )}
              <Button variant="outlined" onClick={() => navigate(ROUTES.HOME)}>
                На главную
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
    </Box>
  )
}
