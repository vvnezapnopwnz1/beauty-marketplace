import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { formatPhone, toE164 } from '@shared/lib/formatPhone'
import { submitGuestBooking } from '@shared/api/salonApi'

interface Props {
  open: boolean
  onClose: () => void
  salonId: string
  serviceId: string
  serviceName: string
  onSuccess: () => void
}

export function GuestBookingDialog({
  open,
  onClose,
  salonId,
  serviceId,
  serviceName,
  onSuccess,
}: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = () => {
    if (!loading) {
      setError(null)
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t('guestBooking.nameRequired'))
      return
    }
    const e164 = toE164(phone)
    if (!/^\+7\d{10}$/.test(e164)) {
      setError(t('guestBooking.phoneInvalid'))
      return
    }
    setLoading(true)
    try {
      await submitGuestBooking(salonId, {
        serviceId,
        name: trimmed,
        phone: e164,
        note: note.trim() || undefined,
      })
      setName('')
      setPhone('')
      setNote('')
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('guestBooking.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs" component="form" onSubmit={handleSubmit}>
      <DialogTitle>{t('guestBooking.title')}</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {serviceName}
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={t('guestBooking.name')}
            value={name}
            onChange={e => setName(e.target.value)}
            required
            fullWidth
            autoFocus
            disabled={loading}
          />
          <TextField
            label={t('guestBooking.phone')}
            value={phone}
            onChange={e => setPhone(formatPhone(e.target.value))}
            placeholder="+7 (___) ___-__-__"
            inputMode="numeric"
            fullWidth
            disabled={loading}
          />
          <TextField
            label={t('guestBooking.note')}
            value={note}
            onChange={e => setNote(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            disabled={loading}
            helperText={t('guestBooking.noteHint')}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>{t('guestBooking.cancel')}</Button>
        <Button type="submit" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={22} color="inherit" /> : t('guestBooking.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
