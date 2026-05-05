import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  type SelectChangeEvent,
  Autocomplete,
  Chip,
  CircularProgress,
} from '@mui/material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { ru } from 'date-fns/locale'
import CloseIcon from '@mui/icons-material/Close'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import ContentCutIcon from '@mui/icons-material/ContentCut'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import {
  fetchDashboardServices,
  fetchDashboardStaff,
  staffListItemsToRows,
  type DashboardServiceRow,
  type DashboardStaffRow,
} from '@shared/api/dashboardApi'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { useDashboardFormStyles } from '@pages/dashboard/theme/formStyles'
import type { DashboardPalette } from '@shared/theme'
import {
  useGetAppointmentByIdQuery,
  usePatchAppointmentStatusMutation,
  useUpdateAppointmentMutation,
  type DashboardAppointment,
} from '@entities/appointment'
import { enqueueFormSnackbar } from '@shared/ui/FormSnackbar'
import { formatPhone, parseOptionalRuPhone, toRuE164 } from '@shared/lib/formatPhone'

type DrawerAppointment = DashboardAppointment & {
  serviceId?: string
  serviceName?: string
  staffName?: string | null
  guestName?: string | null
  guestPhone?: string | null
  clientUserId?: string | null
  clientNote?: string | null
  services?: { id: string; name: string; durationMinutes: number; priceCents: number }[]
  totalCents?: number | null
  totalSource?: 'calculated' | 'manual'
  calculatedTotalCents?: number
}

function statusBadgeCfg(
  pal: DashboardPalette,
): Record<string, { label: string; bg: string; color: string }> {
  return {
    pending: { label: 'Ожидает', bg: 'rgba(255,217,61,.15)', color: '#FFD93D' },
    confirmed: { label: 'Подтверждена', bg: 'rgba(107,203,119,.15)', color: '#6BCB77' },
    completed: { label: 'Завершена', bg: 'rgba(78,205,196,.15)', color: '#4ECDC4' },
    cancelled_by_salon: { label: 'Отмена', bg: 'rgba(224,96,96,.15)', color: pal.red },
    no_show: { label: 'Не пришёл', bg: 'rgba(255,255,255,.07)', color: pal.mutedDark },
  }
}

function StatusBadge({ status }: { status: string }) {
  const d = useDashboardPalette()
  const cfg = statusBadgeCfg(d)[status] ?? {
    label: status,
    bg: 'rgba(255,255,255,.07)',
    color: d.mutedDark,
  }
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1.25,
        py: 0.25,
        borderRadius: '20px',
        fontSize: 11,
        fontWeight: 600,
        bgcolor: cfg.bg,
        color: cfg.color,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </Box>
  )
}

function clientInitials(label: string | undefined | null): string {
  if (!label) return '?'
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  if (parts[0] && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase()
  return parts[0]?.slice(0, 1).toUpperCase() ?? '?'
}

function durationMinutes(startsAt: string, endsAt: string): number {
  const a = new Date(startsAt).getTime()
  const b = new Date(endsAt).getTime()
  return Math.max(0, Math.round((b - a) / 60000))
}

export type AppointmentDrawerProps = {
  open: boolean
  appointment?: DrawerAppointment | null
  appointmentId?: string | null
  onClose: () => void
  onUpdated?: () => void
}

export function AppointmentDrawer({
  open,
  appointment: appointmentFromProps,
  appointmentId,
  onClose,
  onUpdated,
}: AppointmentDrawerProps) {
  const d = useDashboardPalette()
  const { inputBaseSx, textareaSx, selectMenuSx } = useDashboardFormStyles()
  const [services, setServices] = useState<DashboardServiceRow[]>([])
  const [staff, setStaff] = useState<DashboardStaffRow[]>([])
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [salonMasterId, setSalonMasterId] = useState<string>('')
  const [startsLocal, setStartsLocal] = useState('')
  const [clientNote, setClientNote] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [totalCents, setTotalCents] = useState<number | null>(null)

  const resolvedAppointmentId = appointmentId ?? appointmentFromProps?.id ?? null
  const { data: appointmentDetail, isLoading: isLoadingDetail } = useGetAppointmentByIdQuery(
    resolvedAppointmentId ?? '',
    {
      skip: !resolvedAppointmentId || !open,
    },
  )
  const appointment =
    (appointmentDetail as DrawerAppointment | undefined) ?? appointmentFromProps ?? undefined

  const apptSelectSx = useMemo(
    () => ({
      bgcolor: d.input,
      borderRadius: '10px',
      fontSize: 13,
      color: d.text,
      width: '100%',
      '& .MuiOutlinedInput-notchedOutline': { borderColor: d.inputBorder, top: 0 },
      '& .MuiOutlinedInput-notchedOutline legend': { display: 'none' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: d.borderLight },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: d.borderFocus },
      '& .MuiSelect-select': { py: '9px', px: '12px' },
      '& .MuiSvgIcon-root': { color: d.mutedDark },
    }),
    [d],
  )

  const menuItemSx = { fontSize: 13, color: d.text, '&:hover': { bgcolor: d.card } }

  const resetFromAppt = useCallback((a?: DrawerAppointment) => {
    if (!a) {
      setServiceIds([])
      setSalonMasterId('')
      setStartsLocal('')
      setClientNote('')
      setGuestName('')
      setGuestPhone('')
      setTotalCents(null)
      return
    }
    // Initial sync from simple list data, will be refined by fetchAppointmentDetail
    if (a.services?.length) {
      setServiceIds(a.services.map(s => s.id))
    } else if (a.serviceId) {
      setServiceIds([a.serviceId])
    } else {
      setServiceIds([])
    }
    setSalonMasterId(a.salonMasterId ?? '')
    setStartsLocal(a.startsAt)
    setClientNote(a.clientNote ?? '')
    setGuestName(a.guestName ?? (a.clientUserId ? a.clientLabel : ''))
    setGuestPhone(formatPhone(a.guestPhone ?? a.clientPhone ?? ''))
    setTotalCents(a.totalCents ?? null)
  }, [])

  useEffect(() => {
    if (open) resetFromAppt(appointment)
  }, [open, appointment, resetFromAppt])

  useEffect(() => {
    if (!open) return
    void (async () => {
      try {
        const [svc, st] = await Promise.all([fetchDashboardServices(), fetchDashboardStaff()])
        setServices(svc.filter(x => x.isActive))
        setStaff(staffListItemsToRows(st).filter(x => x.isActive))
      } catch {
        // ignore staff/services preload errors
      }
    })()
  }, [open])

  const showEditForm = Boolean(
    appointment && (appointment.status === 'pending' || appointment.status === 'confirmed'),
  )
  const readOnlyGuest = Boolean(appointment?.clientUserId)

  async function patchStatus(status: string) {
    if (!appointment?.id) return
    setBusy(true)
    try {
      await patchAppointmentStatusMut({ id: appointment.id, status }).unwrap()
      onUpdated?.()
      onClose()
    } catch (e) {
      enqueueFormSnackbar(e instanceof Error ? e.message : 'Ошибка', 'Error')
    } finally {
      setBusy(false)
    }
  }

  async function saveChanges() {
    if (!appointment?.id) return
    if (!startsLocal) {
      enqueueFormSnackbar('Выберите дату и время', 'Error')
      return
    }
    if (serviceIds.length === 0) {
      enqueueFormSnackbar('Выберите хотя бы одну услугу', 'Error')
      return
    }
    if (!salonMasterId) {
      enqueueFormSnackbar('Выберите мастера', 'Error')
      return
    }
    if (!readOnlyGuest) {
      const guestPhoneParsed = parseOptionalRuPhone(guestPhone)
      if (guestPhoneParsed.kind === 'invalid') {
        enqueueFormSnackbar('Некорректный телефон', 'Error')
        return
      }
    }

    setInfo(null)
    setBusy(true)
    const wasConfirmed = appointment.status === 'confirmed'
    const guestPhoneNorm = toRuE164(guestPhone) ?? ''
    const prevGuestPhoneNorm =
      toRuE164(appointment.guestPhone ?? appointment.clientPhone ?? '') ?? ''
    const hasStructuralChanges =
      serviceIds.join(',') !== (appointment.serviceId ?? '') ||
      salonMasterId !== (appointment.salonMasterId ?? '') ||
      new Date(startsLocal).toISOString() !== appointment.startsAt ||
      (!readOnlyGuest &&
        (guestName.trim() !== (appointment.guestName ?? '') || guestPhoneNorm !== prevGuestPhoneNorm)) ||
      totalCents !== appointment.totalCents
    const guestPhoneParsed = !readOnlyGuest ? parseOptionalRuPhone(guestPhone) : null
    try {
      const startsAt = new Date(startsLocal).toISOString()
      await updateAppointmentMut({
        id: appointment.id,
        body: {
          serviceIds,
          startsAt,
          clientNote: clientNote.trim(),
          salonMasterId,
          ...(!readOnlyGuest && guestPhoneParsed
            ? {
                guestName: guestName.trim(),
                guestPhone: guestPhoneParsed.kind === 'valid' ? guestPhoneParsed.e164 : '',
              }
            : {}),
          totalCents: totalCents,
        },
      }).unwrap()
      if (wasConfirmed && hasStructuralChanges) {
        setInfo('Запись возвращена в статус «Ожидает» и требует повторного подтверждения')
      }
      onUpdated?.()
      onClose()
    } catch (e) {
      enqueueFormSnackbar(e instanceof Error ? e.message : 'Ошибка', 'Error')
    } finally {
      setBusy(false)
    }
  }

  const [patchAppointmentStatusMut] = usePatchAppointmentStatusMutation()
  const [updateAppointmentMut] = useUpdateAppointmentMutation()

  const phoneDisplay = appointment?.clientPhone ?? appointment?.guestPhone ?? '—'
  const dur = appointment ? durationMinutes(appointment.startsAt, appointment.endsAt) : 0

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ backdrop: { sx: { bgcolor: d.backdrop, backdropFilter: 'blur(4px)' } } }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: '440px' },
          maxWidth: '100%',
          bgcolor: d.page,
          borderLeft: `1px solid ${d.border}`,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 2,
            borderBottom: `1px solid ${d.borderSubtle}`,
            bgcolor: d.card,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: d.text, lineHeight: 1.2 }}>
              Запись
            </Typography>
            <Typography sx={{ fontSize: 12, color: d.mutedDark }}>
              Просмотр и редактирование
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="Закрыть"
            sx={{ color: d.mutedDark, bgcolor: d.control, '&:hover': { bgcolor: d.controlHover } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 3 }}>
          <Stack spacing={1}>
            {!appointment ? (
              <Typography sx={{ color: d.muted }}>Нет данных</Typography>
            ) : isLoadingDetail ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={32} sx={{ color: d.accent }} />
              </Box>
            ) : (
              <Stack spacing={3}>
                {info && <Typography sx={{ color: d.accent, fontSize: 13 }}>{info}</Typography>}

                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: `${d.accent}22`,
                      color: d.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {clientInitials(appointment.clientLabel)}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{ fontWeight: 800, color: d.text, fontSize: 18, lineHeight: 1.2 }}
                    >
                      {appointment.clientLabel}
                    </Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                      <PhoneOutlinedIcon sx={{ fontSize: 14, color: d.mutedDark }} />
                      <Typography sx={{ fontSize: 13, color: d.mutedDark }}>
                        {phoneDisplay}
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography sx={{ fontSize: 13, color: d.mutedDark }}>Статус:</Typography>
                  <StatusBadge status={appointment.status} />

                  {appointment.status === 'pending' && (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={busy}
                        onClick={() => void patchStatus('confirmed')}
                        sx={{
                          bgcolor: d.green,
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: '6px',
                          textTransform: 'none',
                          '&:hover': { bgcolor: d.green, transform: 'translateY(-1px)' },
                        }}
                      >
                        Подтвердить
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={busy}
                        onClick={() => void patchStatus('cancelled_by_salon')}
                        sx={{
                          borderColor: d.red,
                          color: d.red,
                          fontSize: 11,
                          fontWeight: 700,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: '6px',
                          textTransform: 'none',
                          '&:hover': {
                            borderColor: d.red,
                            bgcolor: `${d.red}10`,
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        Отменить
                      </Button>
                    </>
                  )}

                  {appointment.status === 'confirmed' && (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={busy}
                        onClick={() => void patchStatus('completed')}
                        sx={{
                          bgcolor: d.accent,
                          color: d.onAccent,
                          fontSize: 11,
                          fontWeight: 700,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: '6px',
                          textTransform: 'none',
                          '&:hover': { bgcolor: d.accent, transform: 'translateY(-1px)' },
                        }}
                      >
                        Завершить
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={busy}
                        onClick={() => void patchStatus('no_show')}
                        sx={{
                          borderColor: d.mutedDark,
                          color: d.mutedDark,
                          fontSize: 11,
                          fontWeight: 700,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: '6px',
                          textTransform: 'none',
                          '&:hover': {
                            borderColor: d.text,
                            bgcolor: `${d.mutedDark}14`,
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        Не пришёл
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={busy}
                        onClick={() => void patchStatus('cancelled_by_salon')}
                        sx={{
                          borderColor: d.red,
                          color: d.red,
                          fontSize: 11,
                          fontWeight: 700,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: '6px',
                          textTransform: 'none',
                          '&:hover': {
                            borderColor: d.red,
                            bgcolor: `${d.red}10`,
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        Отменить
                      </Button>
                    </>
                  )}
                </Stack>

                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <AccessTimeIcon sx={{ color: d.mutedDark, fontSize: 18 }} />
                    <Typography sx={{ fontSize: 14, color: d.text, fontWeight: 500 }}>
                      {new Date(appointment.startsAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      —{' '}
                      {new Date(appointment.endsAt).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      <Box component="span" sx={{ color: d.mutedDark, ml: 1, fontWeight: 400 }}>
                        ({dur} мин)
                      </Box>
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <ContentCutIcon sx={{ color: d.mutedDark, fontSize: 18 }} />
                    <Typography sx={{ fontSize: 14, color: d.text }}>
                      <Box component="span" sx={{ color: d.mutedDark }}>
                        Услуга:{' '}
                      </Box>
                      {services
                        .filter(s => serviceIds.includes(s.id))
                        .map(s => s.name)
                        .join(', ')}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        color: d.mutedDark,
                        fontSize: 18,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 18,
                      }}
                    >
                      ₽
                    </Box>
                    <Typography sx={{ fontSize: 14, color: d.text }}>
                      <Box component="span" sx={{ color: d.mutedDark }}>
                        Итого:{' '}
                      </Box>
                      {((appointment.totalCents ?? 0) / 100).toLocaleString('ru-RU')} ₽
                      {appointment.totalSource === 'manual' && (
                        <Box
                          component="span"
                          sx={{
                            ml: 1,
                            fontSize: 10,
                            color: d.accent,
                            bgcolor: `${d.accent}15`,
                            px: 0.5,
                            py: 0.1,
                            borderRadius: '4px',
                            fontWeight: 600,
                          }}
                        >
                          ИЗМЕНЕНО
                        </Box>
                      )}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <PersonOutlineIcon sx={{ color: d.mutedDark, fontSize: 18 }} />
                    <Typography sx={{ fontSize: 14, color: d.text }}>
                      <Box component="span" sx={{ color: d.mutedDark }}>
                        Мастер:{' '}
                      </Box>
                      {appointment.staffName ?? '—'}
                    </Typography>
                  </Stack>

                  {appointment.clientNote?.trim() && (
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <DescriptionOutlinedIcon sx={{ color: d.mutedDark, fontSize: 18, mt: 0.2 }} />
                      <Typography sx={{ fontSize: 13, color: d.mutedDark }}>Заметка:</Typography>
                      <Typography sx={{ fontSize: 13, color: d.mutedDark, lineHeight: 1.4 }}>
                        {appointment.clientNote}
                      </Typography>
                    </Stack>
                  )}
                </Stack>

                <Divider sx={{ borderColor: d.borderSubtle }} />

                {showEditForm && (
                  <Stack spacing={2}>
                    <Box>
                      <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>
                        Специалист
                      </Typography>
                      <Select
                        value={salonMasterId}
                        onChange={(e: SelectChangeEvent<string>) =>
                          setSalonMasterId(e.target.value)
                        }
                        displayEmpty
                        fullWidth
                        MenuProps={selectMenuSx}
                        sx={apptSelectSx}
                      >
                        {staff.map(s => (
                          <MenuItem key={s.id} value={s.id} sx={menuItemSx}>
                            {s.displayName}
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>

                    <Box>
                      <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>
                        Услуги
                      </Typography>
                      <Autocomplete
                        multiple
                        options={services}
                        getOptionLabel={option => option.name}
                        value={services.filter(s => serviceIds.includes(s.id))}
                        onChange={(_, newValue) => {
                          setServiceIds(newValue.map(v => v.id))
                        }}
                        renderInput={params => (
                          <TextField
                            {...params}
                            placeholder="Выберите услуги"
                            sx={inputBaseSx}
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {services.length === 0 ? (
                                    <CircularProgress color="inherit" size={20} />
                                  ) : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              variant="outlined"
                              label={option.name}
                              size="small"
                              {...getTagProps({ index })}
                              key={option.id}
                              sx={{
                                borderRadius: '6px',
                                bgcolor: `${d.accent}10`,
                                borderColor: `${d.accent}40`,
                                color: d.text,
                                fontSize: 12,
                                height: 24,
                              }}
                            />
                          ))
                        }
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            p: '4px 8px !important',
                            bgcolor: d.input,
                            borderRadius: '10px',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: d.inputBorder,
                              top: 0,
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: d.borderLight,
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: d.borderFocus,
                            },
                          },
                        }}
                      />
                    </Box>

                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography sx={{ fontSize: 12, color: d.mutedDark }}>Итого (₽)</Typography>
                        {totalCents !== null &&
                          appointment?.calculatedTotalCents !== undefined &&
                          totalCents !== appointment.calculatedTotalCents && (
                            <Typography
                              onClick={() => setTotalCents(appointment.calculatedTotalCents ?? null)}
                              sx={{
                                fontSize: 11,
                                color: d.accent,
                                cursor: 'pointer',
                                '&:hover': { textDecoration: 'underline' },
                              }}
                            >
                              Сбросить к {(appointment.calculatedTotalCents / 100).toLocaleString()} ₽
                            </Typography>
                          )}
                      </Stack>
                      <TextField
                        type="number"
                        value={totalCents !== null ? totalCents / 100 : ''}
                        onChange={e => {
                          const val = parseFloat(e.target.value)
                          setTotalCents(isNaN(val) ? null : Math.round(val * 100))
                        }}
                        placeholder={
                          appointment?.calculatedTotalCents
                            ? (appointment.calculatedTotalCents / 100).toString()
                            : '0'
                        }
                        fullWidth
                        sx={inputBaseSx}
                      />
                    </Box>

                    <Box>
                      <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>
                        Дата и время
                      </Typography>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
                        <DateTimePicker
                          value={startsLocal ? new Date(startsLocal) : null}
                          onChange={val => setStartsLocal(val ? val.toISOString() : '')}
                          ampm={false}
                          format="dd.MM.yyyy HH:mm"
                          views={['year', 'month', 'day', 'hours', 'minutes']}
                          slotProps={{
                            textField: { fullWidth: true, size: 'small', sx: inputBaseSx },
                          }}
                        />
                      </LocalizationProvider>
                    </Box>

                    <Box>
                      <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>
                        Заметка
                      </Typography>
                      <TextField
                        value={clientNote}
                        onChange={e => setClientNote(e.target.value)}
                        fullWidth
                        multiline
                        minRows={2}
                        sx={textareaSx}
                      />
                    </Box>

                    {!readOnlyGuest && (
                      <Stack spacing={2}>
                        <Box>
                          <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>
                            Имя гостя
                          </Typography>
                          <TextField
                            value={guestName}
                            onChange={e => setGuestName(e.target.value)} // Fixed from setForm
                            fullWidth
                            sx={inputBaseSx}
                          />
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>
                            Контактный телефон
                          </Typography>
                          <TextField
                            value={guestPhone}
                            onChange={e => setGuestPhone(formatPhone(e.target.value))}
                            inputMode="numeric"
                            fullWidth
                            placeholder="+7 (___) ___ - __ - __"
                            sx={inputBaseSx}
                          />
                        </Box>
                      </Stack>
                    )}
                  </Stack>
                )}
              </Stack>
            )}
          </Stack>
        </Box>

        <Box
          sx={{
            px: 3,
            py: 2,
            borderTop: `1px solid ${d.borderSubtle}`,
            bgcolor: d.card,
          }}
        >
          {showEditForm ? (
            <Button
              variant="contained"
              fullWidth
              disabled={busy}
              onClick={() => void saveChanges()}
              sx={{
                bgcolor: d.accent,
                color: d.onAccent,
                py: 1,
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: 15,
                textTransform: 'none',
                boxShadow: `0 4px 14px ${d.accent}40`,
                '&:hover': {
                  bgcolor: d.accent,
                  boxShadow: `0 6px 20px ${d.accent}60`,
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s',
              }}
            >
              {busy ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          ) : (
            <Button
              variant="outlined"
              fullWidth
              onClick={onClose}
              sx={{
                borderColor: d.borderLight,
                color: d.text,
                py: 1.25,
                borderRadius: '12px',
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              Закрыть
            </Button>
          )}
        </Box>
      </Box>
    </Drawer>
  )
}
