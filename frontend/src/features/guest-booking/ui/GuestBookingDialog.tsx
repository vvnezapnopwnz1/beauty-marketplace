import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  TextField,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  Box,
  Divider,
  IconButton,
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { ROUTES } from '@shared/config/routes'
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

type WizardStep = 'service' | 'master' | 'slot' | 'contact' | 'success'

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

// ─── palette ─────────────────────────────────────────────────────────────────

const P = {
  accent: '#C4607A',
  accentSoft: 'rgba(196, 96, 122, 0.08)',
  accentBorder: 'rgba(196, 96, 122, 0.28)',
  accentDark: '#A84E65',
  surface: '#FAF9F7',
  card: '#FFFFFF',
  border: '#E8E3DD',
  borderSub: '#F0EBE6',
  text: '#1A1613',
  textMuted: '#7A7168',
  textSub: '#A89F97',
  success: '#4D956E',
  successSoft: 'rgba(77, 149, 110, 0.09)',
  successBorder: 'rgba(77, 149, 110, 0.22)',
} as const

// ─── wizard config ────────────────────────────────────────────────────────────

const STEPS: Array<{ key: WizardStep; label: string }> = [
  { key: 'service', label: 'Услуги' },
  { key: 'master', label: 'Мастер' },
  { key: 'slot', label: 'Время' },
  { key: 'contact', label: 'Контакты' },
]

const STEP_INDEX: Record<WizardStep, number> = {
  service: 0,
  master: 1,
  slot: 2,
  contact: 3,
  success: 4,
}

// ─── step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: WizardStep }) {
  const current = STEP_INDEX[step]
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', px: 0.5 }}>
      {STEPS.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <React.Fragment key={s.key}>
            {/* circle + label */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                  transition: 'all 0.25s',
                  bgcolor: done ? P.successSoft : active ? P.accent : 'transparent',
                  border: `2px solid ${done ? P.success : active ? P.accent : P.border}`,
                  color: done ? P.success : active ? '#fff' : P.textSub,
                }}
              >
                {done ? (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </Box>
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: active ? 700 : 400,
                  color: done ? P.success : active ? P.accent : P.textSub,
                  letterSpacing: '0.2px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
              >
                {s.label}
              </Typography>
            </Box>
            {/* connector line */}
            {i < STEPS.length - 1 && (
              <Box
                sx={{
                  flex: 1,
                  height: 2,
                  mx: '6px',
                  mt: '13px',
                  bgcolor: i < current ? P.success : P.border,
                  transition: 'background 0.3s',
                  flexShrink: 1,
                }}
              />
            )}
          </React.Fragment>
        )
      })}
    </Box>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
}

function ContextBadge({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        px: 1.5,
        py: '6px',
        bgcolor: P.successSoft,
        border: `1px solid ${P.successBorder}`,
        borderRadius: '8px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke={P.success}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <Typography sx={{ fontSize: 12, color: P.success, fontWeight: 500 }}>{children}</Typography>
    </Box>
  )
}

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: P.card, fontSize: 14 },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: P.border },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#C8C4BE' },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: P.accent,
  },
  '& .MuiInputLabel-root.Mui-focused': { color: P.accent },
  '& .MuiFormHelperText-root': { color: P.textSub },
  '& .MuiInputBase-input': { color: P.text },
} as const

// ─── main component ───────────────────────────────────────────────────────────

export function GuestBookingDialog({
  open,
  onClose,
  salonId,
  services,
  initialServiceId,
  onSuccess,
}: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
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
    if (!open) return
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
    if (!open || step !== 'master' || selectedServiceIds.length === 0) return
    let cancelled = false
    setMasterLoading(true)
    setMasterError(null)
    void fetchSalonMasters(salonId)
      .then(rows => {
        if (!cancelled) setMasters(rows)
      })
      .catch(() => {
        if (!cancelled) setMasterError('Не удалось загрузить список мастеров.')
      })
      .finally(() => {
        if (!cancelled) setMasterLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, step, selectedServiceIds, salonId])

  const mastersForSelection = useMemo(() => {
    if (selectedServiceIds.length === 0) return []
    return masters.filter(m =>
      selectedServiceIds.every(id => m.services.some(s => s.serviceId === id)),
    )
  }, [masters, selectedServiceIds])

  const bookingSummary = useMemo(() => {
    if (!selectedMaster || selectedServices.length === 0)
      return { lines: [] as { name: string; priceCents: number }[], totalCents: 0 }
    const lines = selectedServices.map(svc => {
      const link = selectedMaster.services.find(ms => ms.serviceId === svc.id)
      const priceCents = link?.effectivePriceCents ?? svc.priceCents
      return { name: svc.name, priceCents }
    })
    const totalCents = lines.reduce((acc, l) => acc + l.priceCents, 0)
    return { lines, totalCents }
  }, [selectedMaster, selectedServices])

  const handleClose = () => {
    if (loading) return
    if (step === 'success') {
      enqueueSnackbar(t('guestBooking.snackbarTitle'), {
        variant: 'info',
        autoHideDuration: 8000,
        action: (
          <Button
            size="small"
            sx={{ color: '#fff', fontWeight: 700, textTransform: 'none' }}
            onClick={() => navigate(ROUTES.LOGIN)}
          >
            {t('guestBooking.snackbarAction')}
          </Button>
        ),
      })
    }
    setError(null)
    resetWizard()
    onClose()
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
        if (preset) setSelectedServiceIds([preset.id])
      }
      setStep('service')
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
      onSuccess()
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('guestBooking.error'))
    } finally {
      setLoading(false)
    }
  }

  const serviceNamesShort = selectedServices.map(s => s.name).join(', ')
  const showBack = step === 'contact' || step === 'slot' || step === 'master'

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '18px',
            bgcolor: P.surface,
            boxShadow: '0 32px 80px rgba(26, 22, 19, 0.18), 0 4px 16px rgba(26, 22, 19, 0.08)',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* ── Header ── */}
      <Box sx={{ px: 3, pt: 3, pb: 2.5, borderBottom: `1px solid ${P.border}` }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mb: 2.5,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 20,
                fontWeight: 600,
                color: P.text,
                letterSpacing: '-0.3px',
                lineHeight: 1.2,
              }}
            >
              Онлайн-запись
            </Typography>
            <Typography sx={{ fontSize: 13, color: P.textMuted, mt: '3px' }}>
              {step === 'service' && 'Выберите одну или несколько услуг'}
              {step === 'master' && 'Выберите специалиста'}
              {step === 'slot' && 'Выберите удобное время'}
              {step === 'contact' && 'Введите контактные данные'}
              {step === 'success' && 'Всё готово!'}
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{
              color: P.textSub,
              '&:hover': { bgcolor: P.borderSub, color: P.textMuted },
              mt: -0.25,
              mr: -0.5,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </IconButton>
        </Box>

        {/* Step indicator */}
        <StepIndicator step={step} />
      </Box>

      {/* ── Content ── */}
      <DialogContent sx={{ px: 3, py: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* ── 1: Service ── */}
        {step === 'service' && (
          <Stack gap={1.25}>
            {bookableServices.length === 0 ? (
              <Box sx={{ py: 5, textAlign: 'center' }}>
                <Typography sx={{ color: P.textMuted, fontSize: 14 }}>
                  Нет услуг для онлайн-записи.
                </Typography>
              </Box>
            ) : (
              bookableServices.map(s => {
                const checked = selectedServiceIds.includes(s.id)
                return (
                  <Box
                    key={s.id}
                    component="button"
                    type="button"
                    onClick={() => setSelectedServiceIds(prev => toggleId(prev, s.id))}
                    sx={{
                      textAlign: 'left',
                      width: '100%',
                      p: '14px 16px',
                      borderRadius: '10px',
                      border: '1.5px solid',
                      borderColor: checked ? P.accentBorder : P.border,
                      bgcolor: checked ? P.accentSoft : P.card,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'border-color .15s, background-color .15s',
                      '&:hover': {
                        borderColor: checked ? P.accentBorder : '#D0CBC5',
                        bgcolor: checked ? P.accentSoft : '#F5F3F0',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {/* custom checkbox */}
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '5px',
                          border: '1.5px solid',
                          borderColor: checked ? P.accent : '#C8C4BE',
                          bgcolor: checked ? P.accent : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all .15s',
                        }}
                      >
                        {checked && (
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#fff"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: P.text,
                            lineHeight: 1.3,
                          }}
                        >
                          {s.name}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: P.textMuted, mt: '2px' }}>
                          {s.durationMinutes} мин
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: checked ? P.accent : P.text,
                          flexShrink: 0,
                          transition: 'color .15s',
                        }}
                      >
                        {formatPrice(s.priceCents)} ₽
                      </Typography>
                    </Box>
                  </Box>
                )
              })
            )}
          </Stack>
        )}

        {/* ── 2: Master ── */}
        {step === 'master' && selectedServices.length > 0 && (
          <Stack gap={1.25}>
            {serviceNamesShort && <ContextBadge>{serviceNamesShort}</ContextBadge>}

            {masterError && (
              <Alert severity="error" sx={{ borderRadius: '8px', fontSize: 13 }}>
                {masterError}
              </Alert>
            )}

            {masterLoading ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  py: 4,
                  justifyContent: 'center',
                }}
              >
                <CircularProgress size={20} sx={{ color: P.accent }} />
                <Typography sx={{ fontSize: 13, color: P.textMuted }}>
                  Загружаем мастеров…
                </Typography>
              </Box>
            ) : mastersForSelection.length === 0 ? (
              <Stack gap={1.5} sx={{ py: 2, alignItems: 'flex-start' }}>
                <Typography sx={{ color: P.textMuted, fontSize: 13 }}>
                  Нет мастеров для всех выбранных услуг. Измените выбор.
                </Typography>
                <Box
                  component="button"
                  type="button"
                  onClick={() => setStep('service')}
                  sx={{
                    px: 2,
                    py: '7px',
                    borderRadius: '8px',
                    border: `1px solid ${P.border}`,
                    bgcolor: 'transparent',
                    color: P.textMuted,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    '&:hover': { bgcolor: P.borderSub },
                  }}
                >
                  ← К списку услуг
                </Box>
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
                    p: '14px 16px',
                    borderRadius: '10px',
                    border: `1.5px solid ${P.border}`,
                    bgcolor: P.card,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'border-color .15s, background-color .15s',
                    '&:hover': { borderColor: P.accentBorder, bgcolor: P.accentSoft },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: P.accentSoft,
                        border: `1px solid ${P.accentBorder}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 15,
                        fontWeight: 700,
                        color: P.accent,
                        flexShrink: 0,
                      }}
                    >
                      {m.displayName.charAt(0).toUpperCase()}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 14, color: P.text }}>
                        {m.displayName}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: P.textMuted, mt: '2px' }}>
                        {m.services.length} услуг{m.services.length === 1 ? 'а' : ''}
                      </Typography>
                    </Box>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={P.textSub}
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Box>
                </Box>
              ))
            )}
          </Stack>
        )}

        {/* ── 3: Slot ── */}
        {step === 'slot' && selectedServices.length > 0 && selectedMaster && (
          <Stack gap={1.5}>
            <ContextBadge>
              {serviceNamesShort} · {selectedMaster.displayName}
            </ContextBadge>
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

        {/* ── 4: Contact ── */}
        {step === 'contact' && selectedServices.length > 0 && (
          <Stack gap={2}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: '8px', fontSize: 13 }}>
                {error}
              </Alert>
            )}

            {/* Summary card */}
            <Box
              sx={{
                bgcolor: P.card,
                border: `1px solid ${P.border}`,
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ px: 2, pt: 1.75, pb: 0.5 }}>
                <Typography
                  sx={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: P.textSub,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    mb: 1.5,
                  }}
                >
                  Ваша запись
                </Typography>

                {selectedMaster && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      pb: 1.25,
                      mb: 0.5,
                      borderBottom: `1px solid ${P.borderSub}`,
                    }}
                  >
                    <Typography sx={{ fontSize: 13, color: P.textMuted }}>Мастер</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: P.text }}>
                      {selectedMaster.displayName}
                    </Typography>
                  </Box>
                )}

                {slot && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      pb: 1.25,
                      mb: 0.5,
                      borderBottom: `1px solid ${P.borderSub}`,
                    }}
                  >
                    <Typography sx={{ fontSize: 13, color: P.textMuted }}>Дата и время</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: P.text }}>
                      {new Date(slot.startsAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                  </Box>
                )}

                {bookingSummary.lines.map((l, i) => (
                  <Box
                    key={l.name}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      pb: 1.25,
                      mb: 0.5,
                      borderBottom:
                        i < bookingSummary.lines.length - 1 ? `1px solid ${P.borderSub}` : 'none',
                    }}
                  >
                    <Typography sx={{ fontSize: 13, color: P.textMuted }}>{l.name}</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: P.text }}>
                      {formatPrice(l.priceCents)} ₽
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ borderColor: P.border }} />

              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  bgcolor: P.borderSub,
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: P.text }}>Итого</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 16, color: P.accent }}>
                  {formatPrice(bookingSummary.totalCents)} ₽
                </Typography>
              </Box>
            </Box>

            {/* Contact fields */}
            <TextField
              label={t('guestBooking.name')}
              value={name}
              onChange={e => setName(e.target.value)}
              required
              fullWidth
              size="small"
              disabled={loading}
              sx={fieldSx}
            />
            <TextField
              label={t('guestBooking.phone')}
              value={phone}
              required
              onChange={e => setPhone(formatPhone(e.target.value))}
              placeholder="+7 (___) ___-__-__"
              inputMode="numeric"
              fullWidth
              size="small"
              disabled={loading}
              sx={fieldSx}
            />
            <TextField
              label={t('guestBooking.note')}
              value={note}
              onChange={e => setNote(e.target.value)}
              multiline
              minRows={2}
              fullWidth
              size="small"
              disabled={loading}
              helperText={t('guestBooking.noteHint')}
              sx={fieldSx}
            />
          </Stack>
        )}

        {/* ── Success screen ── */}
        {step === 'success' && (
          <Stack alignItems="center" spacing={3} sx={{ py: 5, px: 2, textAlign: 'center' }}>
            <CheckCircleOutlineIcon
              sx={{
                fontSize: 72,
                color: P.success,
                animation: 'successPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                '@keyframes successPop': {
                  '0%': { transform: 'scale(0)', opacity: 0 },
                  '100%': { transform: 'scale(1)', opacity: 1 },
                },
              }}
            />
            <Box>
              <Typography sx={{ fontSize: 20, fontWeight: 700, color: P.text, mb: 1 }}>
                {t('guestBooking.successTitle')}
              </Typography>
              <Typography sx={{ fontSize: 14, color: P.textMuted, maxWidth: 320, mx: 'auto' }}>
                {t('guestBooking.successBody')}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Box
                component="button"
                onClick={handleClose}
                sx={{
                  px: 3,
                  py: '9px',
                  borderRadius: '8px',
                  border: `1px solid ${P.border}`,
                  bgcolor: 'transparent',
                  color: P.textMuted,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  '&:hover': { bgcolor: P.borderSub },
                }}
              >
                {t('guestBooking.successClose')}
              </Box>
              <Box
                component="button"
                onClick={() => {
                  navigate(ROUTES.LOGIN)
                  handleClose()
                }}
                sx={{
                  px: 3,
                  py: '9px',
                  borderRadius: '8px',
                  border: 'none',
                  bgcolor: P.accent,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  '&:hover': { bgcolor: P.accentDark },
                }}
              >
                {t('guestBooking.successLogin')}
              </Box>
            </Stack>
          </Stack>
        )}
      </DialogContent>

      {/* ── Footer ── */}
      {step !== 'success' && (
        <Box
          sx={{
            px: 3,
            py: 2,
            borderTop: `1px solid ${P.border}`,
            display: 'flex',
            gap: 1.5,
            alignItems: 'center',
            bgcolor: P.surface,
          }}
        >
          {showBack && (
            <Box
              component="button"
              type="button"
              onClick={goBack}
              disabled={loading}
              sx={{
                px: 2,
                py: '7px',
                borderRadius: '8px',
                border: `1px solid ${P.border}`,
                bgcolor: 'transparent',
                color: P.textMuted,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all .15s',
                '&:hover:not(:disabled)': { bgcolor: P.borderSub, borderColor: '#C8C4BE' },
                '&:disabled': { opacity: 0.4, cursor: 'default' },
              }}
            >
              ← Назад
            </Box>
          )}

          <Box sx={{ flex: 1 }} />

          {/* Cancel (always) */}
          <Box
            component="button"
            type="button"
            onClick={handleClose}
            disabled={loading}
            sx={{
              px: 2,
              py: '7px',
              borderRadius: '8px',
              border: 'none',
              bgcolor: 'transparent',
              color: P.textMuted,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              '&:hover:not(:disabled)': { color: P.text },
              '&:disabled': { opacity: 0.4, cursor: 'default' },
            }}
          >
            {t('guestBooking.cancel')}
          </Box>

          {/* Next (service step) */}
          {step === 'service' && (
            <Box
              component="button"
              type="button"
              disabled={selectedServiceIds.length === 0}
              onClick={() => setStep('master')}
              sx={{
                px: '20px',
                py: '8px',
                borderRadius: '8px',
                border: 'none',
                bgcolor: P.accent,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background .15s',
                '&:hover:not(:disabled)': { bgcolor: P.accentDark },
                '&:disabled': { bgcolor: P.border, color: P.textSub, cursor: 'default' },
              }}
            >
              Далее →
            </Box>
          )}

          {/* Submit (contact step) */}
          {step === 'contact' && (
            <Box
              component="button"
              type="button"
              disabled={loading || !slot}
              onClick={() => void submitBooking()}
              sx={{
                px: '20px',
                py: '8px',
                borderRadius: '8px',
                border: 'none',
                bgcolor: P.accent,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                minWidth: 160,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                transition: 'background .15s',
                '&:hover:not(:disabled)': { bgcolor: P.accentDark },
                '&:disabled': { bgcolor: P.border, color: P.textSub, cursor: 'default' },
              }}
            >
              {loading ? (
                <CircularProgress size={16} sx={{ color: 'rgba(255,255,255,0.7)' }} />
              ) : (
                t('guestBooking.submit')
              )}
            </Box>
          )}
        </Box>
      )}
    </Dialog>
  )
}
