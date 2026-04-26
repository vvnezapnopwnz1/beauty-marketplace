import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import { fetchPlaceByExternalId } from '@shared/api/placesApi'
import { submitClaim, type ClaimRelation } from '@shared/api/claimApi'
import { claimStatusPath } from '@shared/config/routes'
import { NavBar } from '@shared/ui/NavBar'
import { ClaimSuccessScreen } from './ClaimSuccessScreen'

export function ClaimSalonPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const source = params.get('source') ?? '2gis'
  const externalId = params.get('externalId') ?? ''

  const [placeLoading, setPlaceLoading] = useState(true)
  const [place, setPlace] = useState<{
    name: string
    address?: string
    phone?: string
    photoUrl?: string
  } | null>(null)
  const [relation, setRelation] = useState<ClaimRelation>('owner')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!externalId) {
      setPlaceLoading(false)
      return
    }
    fetchPlaceByExternalId(externalId)
      .then((p) =>
        setPlace({
          name: p.name,
          address: p.address,
          phone: p.contacts?.find((c) => c.type === 'phone')?.value,
          photoUrl: p.photoUrls?.[0],
        }),
      )
      .catch(() => setError('Не удалось загрузить данные салона'))
      .finally(() => setPlaceLoading(false))
  }, [externalId])

  if (!externalId) {
    return (
      <Box>
        <NavBar />
        <Box sx={{ p: 4 }}>
          <Alert severity="error">Не указан externalId салона.</Alert>
        </Box>
      </Box>
    )
  }

  if (success) {
    return (
      <Box minHeight="100vh" bgcolor="background.default">
        <NavBar />
        <ClaimSuccessScreen source={source} externalId={externalId} />
      </Box>
    )
  }

  const handleSubmit = async () => {
    if (!place) return
    setSubmitting(true)
    setError(null)
    try {
      await submitClaim({
        source,
        externalId,
        relationType: relation,
        comment: comment.trim() || undefined,
        snapshotName: place.name,
        snapshotAddress: place.address,
        snapshotPhone: place.phone,
        snapshotPhoto: place.photoUrl,
      })
      setSuccess(true)
    } catch (err: unknown) {
      const e = err as { body?: { error?: string } }
      if (e?.body?.error === 'already_claimed') {
        setError('Этот салон уже зарегистрирован на платформе.')
      } else if (e?.body?.error === 'claim_already_submitted') {
        navigate(claimStatusPath(source, externalId))
      } else {
        setError('Не удалось отправить заявку. Попробуйте позже.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <NavBar />
      <Box sx={{ maxWidth: 560, mx: 'auto', px: 2, py: 5 }}>
        <Typography variant="h5" sx={{ fontFamily: "'Fraunces', serif", mb: 1 }}>
          Заявить права на салон
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Заполните форму - мы проверим и свяжемся с вами в течение 1-3 дней.
        </Typography>

        {placeLoading && <CircularProgress />}

        {!placeLoading && place && (
          <Stack gap={2.5}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography fontWeight={600}>{place.name}</Typography>
              {place.address && (
                <Typography variant="body2" color="text.secondary">
                  {place.address}
                </Typography>
              )}
              {place.phone && (
                <Typography variant="body2" color="text.secondary">
                  {place.phone}
                </Typography>
              )}
            </Box>

            <FormControl fullWidth size="small">
              <InputLabel>Ваша роль</InputLabel>
              <Select
                value={relation}
                label="Ваша роль"
                onChange={(e) => setRelation(e.target.value as ClaimRelation)}
              >
                <MenuItem value="owner">Владелец</MenuItem>
                <MenuItem value="manager">Управляющий</MenuItem>
                <MenuItem value="representative">Представитель</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Комментарий (необязательно)"
              multiline
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Расскажите, как связаны с этим бизнесом"
            />

            {error && <Alert severity="error">{error}</Alert>}

            <Stack direction="row" gap={1.5}>
              <Button
                variant="contained"
                disabled={submitting}
                onClick={handleSubmit}
                sx={{ flex: 1 }}
              >
                {submitting ? <CircularProgress size={20} /> : 'Отправить заявку'}
              </Button>
              <Button variant="outlined" onClick={() => navigate(-1)}>
                Отмена
              </Button>
            </Stack>
          </Stack>
        )}

        {!placeLoading && !place && !error && <Alert severity="warning">Салон не найден.</Alert>}
        {error && !place && <Alert severity="error">{error}</Alert>}
      </Box>
    </Box>
  )
}
