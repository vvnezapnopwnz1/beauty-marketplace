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
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import {
  fetchDashboardServices,
  fetchDashboardStaff,
  patchAppointmentStatus,
  staffListItemsToRows,
  updateDashboardAppointment,
  type DashboardAppointment,
  type DashboardServiceRow,
  type DashboardStaffRow,
} from '@shared/api/dashboardApi'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { useDashboardFormStyles } from '@pages/dashboard/theme/formStyles'
import type { DashboardPalette } from '@shared/theme'

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
  const cfg = statusBadgeCfg(d)[status] ?? { label: status, bg: 'rgba(255,255,255,.07)', color: d.mutedDark }
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

function clientInitials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  if (parts[0] && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase()
  return parts[0]?.slice(0, 1).toUpperCase() ?? '?'
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function durationMinutes(startsAt: string, endsAt: string): number {
  const a = new Date(startsAt).getTime()
  const b = new Date(endsAt).getTime()
  return Math.max(0, Math.round((b - a) / 60000))
}

export type AppointmentDrawerProps = {
  open: boolean
  appointment: DashboardAppointment | null
  onClose: () => void
  onUpdated: () => void
}

export function AppointmentDrawer({ open, appointment, onClose, onUpdated }: AppointmentDrawerProps) {
  const d = useDashboardPalette()
  const { inputBaseSx, textareaSx, selectMenuSx } = useDashboardFormStyles()
  const [services, setServices] = useState<DashboardServiceRow[]>([])
  const [staff, setStaff] = useState<DashboardStaffRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [serviceId, setServiceId] = useState('')
  const [salonMasterId, setSalonMasterId] = useState<string>('')
  const [startsLocal, setStartsLocal] = useState('')
  const [clientNote, setClientNote] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')

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

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const [s, st] = await Promise.all([fetchDashboardServices(), fetchDashboardStaff()])
          setServices(s.filter(x => x.isActive))
          setStaff(staffListItemsToRows(st).filter(x => x.isActive))
        } catch {
          /* ignore */
        }
      })()
    }, 0)
    return () => window.clearTimeout(t)
  }, [open])

  const resetFromAppt = useCallback((a: DashboardAppointment | null) => {
    if (!a) {
      setServiceId('')
      setSalonMasterId('')
      setStartsLocal('')
      setClientNote('')
      setGuestName('')
      setGuestPhone('')
      return
    }
    setErr(null)
    setServiceId(a.serviceId)
    setSalonMasterId(a.salonMasterId ?? '')
    setStartsLocal(toDatetimeLocal(a.startsAt))
    setClientNote(a.clientNote ?? '')
    setGuestName(a.guestName ?? (a.clientUserId ? a.clientLabel : ''))
    setGuestPhone(a.guestPhone ?? a.clientPhone ?? '')
  }, [])

  useEffect(() => {
    if (open && appointment) resetFromAppt(appointment)
  }, [open, appointment, resetFromAppt])

  const showEditForm = appointment && (appointment.status === 'pending' || appointment.status === 'confirmed')
  const readOnlyGuest = Boolean(appointment?.clientUserId)

  async function patchStatus(status: string) {
    if (!appointment) return
    setErr(null)
    setBusy(true)
    try {
      await patchAppointmentStatus(appointment.id, status)
      onUpdated()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  async function saveChanges() {
    if (!appointment) return
    if (!readOnlyGuest) {
      const name = guestName.trim()
      const phone = guestPhone.trim()
      if (!name) {
        setErr('Укажите имя гостя')
        return
      }
      if (!/^\+7\d{10}$/.test(phone)) {
        setErr('Телефон в формате +7XXXXXXXXXX')
        return
      }
    }
    setErr(null)
    setBusy(true)
    try {
      const startsAt = new Date(startsLocal).toISOString()
      await updateDashboardAppointment(appointment.id, {
        serviceId,
        startsAt,
        clientNote: clientNote.trim(),
        ...(salonMasterId ? { salonMasterId } : { clearSalonMasterId: true }),
        ...(!readOnlyGuest ? { guestName: guestName.trim(), guestPhone: guestPhone.trim() } : {}),
      })
      onUpdated()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  const phoneDisplay = appointment?.clientPhone ?? appointment?.guestPhone ?? '—'
  const dur =
    appointment != null ? durationMinutes(appointment.startsAt, appointment.endsAt) : 0

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
            px: 2,
            py: 1.5,
            borderBottom: `1px solid ${d.borderSubtle}`,
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: d.text }}>Запись</Typography>
          <IconButton onClick={onClose} size="small" aria-label="Закрыть" sx={{ color: d.mutedDark }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 2 }}>
          {!appointment ? (
            <Typography sx={{ color: d.muted }}>Нет данных</Typography>
          ) : (
            <Stack spacing={2}>
              {err && (
                <Typography sx={{ color: d.red, fontSize: 13 }}>{err}</Typography>
              )}

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
                  <Typography sx={{ fontWeight: 700, color: d.text, fontSize: 16 }}>
                    {appointment.clientLabel}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: d.mutedDark }}>{phoneDisplay}</Typography>
                </Box>
              </Stack>

              <Box>
                <StatusBadge status={appointment.status} />
              </Box>

              <Typography sx={{ fontSize: 14, color: d.text }}>
                {new Date(appointment.startsAt).toLocaleString('ru-RU')} —{' '}
                {new Date(appointment.endsAt).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                <Box component="span" sx={{ color: d.mutedDark, ml: 1 }}>
                  ({dur} мин)
                </Box>
              </Typography>

              <Typography sx={{ fontSize: 14, color: d.text }}>
                <Box component="span" sx={{ color: d.mutedDark }}>Услуга: </Box>
                {appointment.serviceName}
              </Typography>
              <Typography sx={{ fontSize: 14, color: d.text }}>
                <Box component="span" sx={{ color: d.mutedDark }}>Мастер: </Box>
                {appointment.staffName ?? '—'}
              </Typography>

              {appointment.clientNote?.trim() && (
                <Typography sx={{ fontSize: 13, color: d.mutedDark }}>
                  Заметка: {appointment.clientNote}
                </Typography>
              )}

              <Divider sx={{ borderColor: d.borderSubtle }} />

              {showEditForm && (
                <Stack spacing={1.5}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: d.mutedDark, textTransform: 'uppercase' }}>
                    Редактирование
                  </Typography>
                  <Box>
                    <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>Мастер</Typography>
                    <Select
                      value={salonMasterId}
                      onChange={(e: SelectChangeEvent<string>) => setSalonMasterId(e.target.value)}
                      displayEmpty
                      fullWidth
                      MenuProps={selectMenuSx}
                      sx={apptSelectSx}
                    >
                      <MenuItem value="" sx={menuItemSx}>
                        Не назначен
                      </MenuItem>
                      {staff.map(s => (
                        <MenuItem key={s.id} value={s.id} sx={menuItemSx}>
                          {s.displayName}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>Услуга</Typography>
                    <Select
                      value={serviceId}
                      onChange={(e: SelectChangeEvent<string>) => setServiceId(e.target.value)}
                      fullWidth
                      MenuProps={selectMenuSx}
                      sx={apptSelectSx}
                    >
                      {services.map(s => (
                        <MenuItem key={s.id} value={s.id} sx={menuItemSx}>
                          {s.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                  <TextField
                    label="Начало"
                    type="datetime-local"
                    value={startsLocal}
                    onChange={e => setStartsLocal(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={inputBaseSx}
                  />
                  <TextField
                    label="Заметка"
                    value={clientNote}
                    onChange={e => setClientNote(e.target.value)}
                    fullWidth
                    multiline
                    minRows={2}
                    sx={textareaSx}
                  />
                  {!readOnlyGuest && (
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <TextField
                        label="Имя гостя"
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        fullWidth
                        sx={inputBaseSx}
                      />
                      <TextField
                        label="Телефон"
                        value={guestPhone}
                        onChange={e => setGuestPhone(e.target.value)}
                        fullWidth
                        placeholder="+79161234567"
                        sx={inputBaseSx}
                      />
                    </Stack>
                  )}
                </Stack>
              )}
            </Stack>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            px: 2,
            py: 1.5,
            borderTop: `1px solid ${d.borderSubtle}`,
          }}
        >
          {appointment?.status === 'pending' && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                disabled={busy}
                onClick={() => void patchStatus('confirmed')}
                sx={{ bgcolor: d.green, color: '#fff' }}
              >
                Подтвердить
              </Button>
              <Button variant="outlined" disabled={busy} onClick={() => void patchStatus('cancelled_by_salon')} sx={{ borderColor: d.red, color: d.red }}>
                Отменить
              </Button>
            </Stack>
          )}
          {appointment?.status === 'confirmed' && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                disabled={busy}
                onClick={() => void patchStatus('completed')}
                sx={{ bgcolor: d.accent, color: d.onAccent }}
              >
                Завершить
              </Button>
              <Button variant="outlined" disabled={busy} onClick={() => void patchStatus('cancelled_by_salon')} sx={{ borderColor: d.red, color: d.red }}>
                Отменить
              </Button>
            </Stack>
          )}
          {(appointment?.status === 'completed' || appointment?.status === 'cancelled_by_salon' || appointment?.status === 'no_show') && (
            <Button variant="outlined" onClick={onClose} sx={{ borderColor: d.borderLight, color: d.text }}>
              Закрыть
            </Button>
          )}
          {showEditForm && (
            <Button
              variant="contained"
              disabled={busy}
              onClick={() => void saveChanges()}
              sx={{ bgcolor: d.accent, color: d.onAccent }}
            >
              Сохранить изменения
            </Button>
          )}
        </Box>
      </Box>
    </Drawer>
  )
}
