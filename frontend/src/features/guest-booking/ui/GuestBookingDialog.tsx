import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
  Box,
  Checkbox,
  Paper,
  Divider,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { formatPhone, toE164 } from '@shared/lib/formatPhone'
import {
  fetchSalonMasters,
  submitGuestBooking,
  type PublicAvailableSlot,
  type SalonMasterPublic,
} from '@shared/api/salonApi'
import { formatPrice } from '@entities/salon'
import { PublicSlotPicker } from './PublicSlotPicker'

/** Service line with stable id (required for booking flow). */
export interface GuestBookingServiceLine {
  id: string
  name: string
  durationMinutes: number
  priceCents: number
}

type WizardStep = 'service' | 'master' | 'slot' | 'contact'

interface Props {
  open: boolean
  onClose: () => void
  salonId: string
  /** Salon services (only entries with id are shown). */
  services: GuestBookingServiceLine[]
  /** If set, wizard skips service selection and starts at master step. */
  initialServiceId?: string | null
  onSuccess: () => void
}

function toggleId(ids: string[], id: string): string[] {
  if (ids.includes(id)) {
    return ids.filter(x => x !== id)
  }
  return [...ids, id]
}

export function GuestBookingDialog({
  open,
  onClose,
  salonId,
  services,
  initialServiceId,
  onSuccess,
}: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState<WizardStep>('service')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [selectedMaster, setSelectedMaster] = useState<SalonMasterPublic | null>(null)
  const [masters, setMasters] = useState<SalonMasterPublic[]>([])
  const [masterLoading, setMasterLoading] = useState(false)
  const [masterError, setMasterError] = useState<string | null>(null)
  const [slot, setSlot] = useState<PublicAvailableSlot | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bookableServices = useMemo(() => services.filter(s => Boolean(s.id)), [services])

  const selectedServices = useMemo(
    () => bookableServices.filter(s => selectedServiceIds.includes(s.id)),
    [bookableServices, selectedServiceIds],
  )

  const resetWizard = useCallback(() => {
    setStep('service')
    setSelectedServiceIds([])
    setSelectedMaster(null)
    setMasters([])
    setMasterLoading(false)
    setMasterError(null)
    setSlot(null)
    setName('')
    setPhone('')
    setNote('')
    setError(null)
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }
    const preset =
      initialServiceId != null && initialServiceId !== ''
        ? bookableServices.find(s => s.id === initialServiceId)
        : undefined
    if (preset) {
      setSelectedServiceIds([preset.id])
      setStep('master')
    } else {
      setSelectedServiceIds([])
      setStep('service')
    }
    setSelectedMaster(null)
    setMasters([])
    setMasterError(null)
    setSlot(null)
    setName('')
    setPhone('')
    setNote('')
    setError(null)
  }, [open, initialServiceId, bookableServices])

  useEffect(() => {
    if (!open || step !== 'master' || selectedServiceIds.length === 0) {
      return
    }
    let cancelled = false
    setMasterLoading(true)
    setMasterError(null)
    void fetchSalonMasters(salonId)
      .then(rows => {
        if (!cancelled) {
          setMasters(rows)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMasterError('Не удалось загрузить список мастеров.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMasterLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, step, selectedServiceIds, salonId])

  const mastersForSelection = useMemo(() => {
    if (selectedServiceIds.length === 0) {
      return []
    }
    return masters.filter(m => selectedServiceIds.every(id => m.services.some(s => s.serviceId === id)))
  }, [masters, selectedServiceIds])

  const bookingSummary = useMemo(() => {
    if (!selectedMaster || selectedServices.length === 0) {
      return { lines: [] as { name: string; priceCents: number }[], totalCents: 0 }
    }
    const lines = selectedServices.map(svc => {
      const link = selectedMaster.services.find(ms => ms.serviceId === svc.id)
      const priceCents = link?.effectivePriceCents ?? svc.priceCents
      return { name: svc.name, priceCents }
    })
    const totalCents = lines.reduce((acc, l) => acc + l.priceCents, 0)
    return { lines, totalCents }
  }, [selectedMaster, selectedServices])

  const handleClose = () => {
    if (!loading) {
      setError(null)
      resetWizard()
      onClose()
    }
  }

  const goBack = () => {
    setError(null)
    if (step === 'contact') {
      setStep('slot')
      return
    }
    if (step === 'slot') {
      setSlot(null)
      setStep('master')
      return
    }
    if (step === 'master') {
      setSelectedMaster(null)
      if (initialServiceId != null && initialServiceId !== '') {
        const preset = bookableServices.find(s => s.id === initialServiceId)
        if (preset) {
          setSelectedServiceIds([preset.id])
        }
      }
      setStep('service')
      return
    }
  }

  const submitBooking = async () => {
    setError(null)
    if (selectedServiceIds.length === 0) {
      setError('Выберите хотя бы одну услугу')
      return
    }
    if (!slot) {
      setError('Выберите время')
      return
    }
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
      const primaryId = selectedServiceIds[0]!
      await submitGuestBooking(salonId, {
        serviceId: primaryId,
        serviceIds: selectedServiceIds.length > 1 ? selectedServiceIds : undefined,
        name: trimmed,
        phone: e164,
        note: note.trim() || undefined,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        salonMasterId: slot.salonMasterId,
      })
      resetWizard()
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('guestBooking.error'))
    } finally {
      setLoading(false)
    }
  }

  const stepTitle = (() => {
    switch (step) {
      case 'service':
        return 'Выберите услуги'
      case 'master':
        return 'Выберите мастера'
      case 'slot':
        return 'Выберите время'
      case 'contact':
        return 'Контакты'
      default:
        return t('guestBooking.title')
    }
  })()

  const showBack = step === 'contact' || step === 'slot' || step === 'master'

  const serviceNamesShort = selectedServices.map(s => s.name).join(', ')

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('guestBooking.title')}</DialogTitle>
      <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 0.5 }}>
        {stepTitle}
      </Typography>
      <DialogContent>
        {step === 'service' && (
          <Stack gap={1.5} sx={{ pt: 1 }}>
            {bookableServices.length === 0 ? (
              <Typography color="text.secondary">Нет услуг для онлайн-записи.</Typography>
            ) : (
              bookableServices.map(s => {
                const checked = selectedServiceIds.includes(s.id)
                return (
                  <Box
                    key={s.id}
                    component="button"
                    type="button"
                    onClick={() => {
                      setSelectedServiceIds(prev => toggleId(prev, s.id))
                    }}
                    sx={{
                      textAlign: 'left',
                      width: '100%',
                      p: 2,
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: checked ? 'primary.main' : 'divider',
                      bgcolor: checked ? 'action.selected' : 'background.paper',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'border-color .12s, background-color .12s',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                    }}
                  >
                    <Stack direction="row" alignItems="flex-start" gap={1.5}>
                      <Checkbox checked={checked} tabIndex={-1} sx={{ p: 0, mt: -0.25, pointerEvents: 'none' }} />
                      <Box flex={1}>
                        <Typography fontWeight={600}>{s.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {s.durationMinutes} мин
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                )
              })
            )}
          </Stack>
        )}

        {step === 'master' && selectedServices.length > 0 && (
          <Stack gap={1.5} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Услуги: {serviceNamesShort}
            </Typography>
            {masterError && <Alert severity="error">{masterError}</Alert>}
            {masterLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Загружаем мастеров…
                </Typography>
              </Box>
            ) : mastersForSelection.length === 0 ? (
              <Stack gap={1}>
                <Typography color="text.secondary">
                  Нет мастеров, которые выполняют все выбранные услуги. Измените выбор.
                </Typography>
                <Button variant="outlined" onClick={() => setStep('service')}>
                  К списку услуг
                </Button>
              </Stack>
            ) : (
              mastersForSelection.map(m => (
                <Box
                  key={m.id}
                  component="button"
                  type="button"
                  onClick={() => {
                    setSelectedMaster(m)
                    setSlot(null)
                    setStep('slot')
                  }}
                  sx={{
                    textAlign: 'left',
                    width: '100%',
                    p: 2,
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                  }}
                >
                  <Typography fontWeight={600}>{m.displayName}</Typography>
                </Box>
              ))
            )}
          </Stack>
        )}

        {step === 'slot' && selectedServices.length > 0 && selectedMaster && (
          <Stack gap={1.5} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {serviceNamesShort} · {selectedMaster.displayName}
            </Typography>
            <PublicSlotPicker
              salonId={salonId}
              serviceIds={selectedServiceIds.length > 1 ? selectedServiceIds : undefined}
              serviceId={selectedServiceIds.length === 1 ? selectedServiceIds[0] : undefined}
              masterProfileId={selectedMaster.masterProfile?.id}
              salonMasterId={selectedMaster.masterProfile?.id ? undefined : selectedMaster.id}
              value={slot?.startsAt}
              onChange={s => {
                setSlot(s)
                setStep('contact')
              }}
            />
          </Stack>
        )}

        {step === 'contact' && selectedServices.length > 0 && (
          <Stack gap={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Ваша запись
              </Typography>
              {selectedMaster && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {selectedMaster.displayName}
                  {slot ? ` · ${new Date(slot.startsAt).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
                </Typography>
              )}
              <Stack gap={0.75} sx={{ mt: 1 }}>
                {bookingSummary.lines.map(l => (
                  <Stack key={l.name} direction="row" justifyContent="space-between" alignItems="baseline">
                    <Typography variant="body2">{l.name}</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatPrice(l.priceCents)} ₽
                    </Typography>
                  </Stack>
                ))}
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={700}>Итого</Typography>
                <Typography fontWeight={700}>{formatPrice(bookingSummary.totalCents)} ₽</Typography>
              </Stack>
            </Paper>

            <TextField
              label={t('guestBooking.name')}
              value={name}
              onChange={e => setName(e.target.value)}
              required
              fullWidth
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
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        {showBack && (
          <Button onClick={goBack} disabled={loading}>
            Назад
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        {step === 'service' && (
          <Button
            type="button"
            variant="contained"
            disabled={selectedServiceIds.length === 0}
            onClick={() => setStep('master')}
          >
            Далее
          </Button>
        )}
        <Button onClick={handleClose} disabled={loading}>
          {t('guestBooking.cancel')}
        </Button>
        {step === 'contact' && (
          <Button
            type="button"
            variant="contained"
            disabled={loading || !slot}
            onClick={() => void submitBooking()}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : t('guestBooking.submit')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
