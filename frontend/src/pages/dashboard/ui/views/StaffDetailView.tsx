import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { useDeleteStaffMutation, useGetStaffByIdQuery } from '@entities/staff'
import { useLazyGetAppointmentsQuery, type DashboardAppointment } from '@entities/appointment'
import {
  fetchStaffSchedule,
  specializationLabel,
  type StaffWorkingHourRow,
} from '@shared/api/dashboardApi'
import { StaffFormModal } from '../modals/StaffFormModal'
import { ScheduleDrawer } from '../drawers/ScheduleDrawer'
import { AppointmentDrawer } from '../drawers/AppointmentDrawer'

const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

type StaffAppointment = DashboardAppointment & {
  serviceName?: string
}

function localDateISO(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function statusStaffLabel(s?: string): { label: string; color: 'success' | 'warning' | 'default' } {
  switch (s) {
    case 'active':
      return { label: 'Активен', color: 'success' }
    case 'pending':
      return { label: 'Ожидает', color: 'warning' }
    case 'inactive':
      return { label: 'Неактивен', color: 'default' }
    default:
      return { label: s ?? '—', color: 'default' }
  }
}

function formatScheduleRow(r: StaffWorkingHourRow): { work: string; br: string } {
  if (r.isDayOff) return { work: 'Выходной', br: '—' }
  const work = `${toHHMM(r.opensAt)}–${toHHMM(r.closesAt)}`
  const br =
    r.breakStartsAt && r.breakEndsAt ? `${toHHMM(r.breakStartsAt)}–${toHHMM(r.breakEndsAt)}` : '—'
  return { work, br }
}

function toHHMM(t: string): string {
  const m = t.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return t
  return `${m[1]!.padStart(2, '0')}:${m[2]}`
}

function mergeSevenDays(rows: StaffWorkingHourRow[]): StaffWorkingHourRow[] {
  const by = new Map<number, StaffWorkingHourRow>()
  for (const r of rows) by.set(r.dayOfWeek, r)
  const out: StaffWorkingHourRow[] = []
  for (let d = 0; d <= 6; d++) {
    const x = by.get(d)
    if (x) out.push(x)
    else
      out.push({
        id: '',
        staffId: '',
        dayOfWeek: d,
        opensAt: '10:00:00',
        closesAt: '18:00:00',
        isDayOff: true,
        breakStartsAt: null,
        breakEndsAt: null,
      })
  }
  return out
}

function apptStatusBadgeSx(status: string, muted: string, red: string): { bg: string; fg: string } {
  switch (status) {
    case 'pending':
      return { bg: 'rgba(255,217,61,.15)', fg: '#FFD93D' }
    case 'confirmed':
      return { bg: 'rgba(107,203,119,.15)', fg: '#6BCB77' }
    case 'completed':
      return { bg: 'rgba(78,205,196,.15)', fg: '#4ECDC4' }
    case 'cancelled_by_salon':
      return { bg: 'rgba(224,96,96,.15)', fg: red }
    default:
      return { bg: 'rgba(255,255,255,.07)', fg: muted }
  }
}

type StaffDetailViewProps = {
  staffId?: string
}

export function StaffDetailView(props: StaffDetailViewProps) {
  const params = useParams<{ staffId?: string; '*': string }>()
  const staffId = props.staffId ?? params.staffId ?? params['*']?.split('/')?.[0]
  const navigate = useNavigate()
  const theme = useTheme()
  const dashboard = theme.palette.dashboard
  const isLight = theme.palette.mode === 'light'
  const [scheduleRows, setScheduleRows] = useState<StaffWorkingHourRow[]>([])
  const [appts, setAppts] = useState<StaffAppointment[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deactivateBusy, setDeactivateBusy] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<StaffAppointment | null>(null)
  const [getAppointments] = useLazyGetAppointmentsQuery()
  const {
    data: staff,
    error: staffError,
    isLoading: isStaffLoading,
  } = useGetStaffByIdQuery(staffId ?? '', {
    skip: !staffId,
    refetchOnMountOrArgChange: true,
  })
  const [deleteStaff] = useDeleteStaffMutation()

  const load = useCallback(async () => {
    if (!staffId) return
    try {
      setErr(null)
      const from = localDateISO()
      const sch = await fetchStaffSchedule(staffId)
      const list = await getAppointments({
        staffId,
        from,
        pageSize: 10,
        page: 1,
        statuses: ['pending', 'confirmed'],
        sortBy: 'starts_at',
        sortDir: 'asc',
      }).unwrap()
      setScheduleRows(mergeSevenDays(sch.rows))
      setAppts(list.items as unknown as StaffAppointment[])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }, [staffId, getAppointments])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  const nameColor = isLight ? '#120F0D' : dashboard.text
  const cardText = isLight ? '#1A1612' : dashboard.text
  const cardMutedText = isLight ? '#5C5550' : dashboard.mutedDark
  const baseMutedText = isLight ? '#5C5550' : dashboard.muted
  const cardBg = isLight ? '#F2ECE5' : dashboard.card
  const cardBorder = isLight ? dashboard.borderLight : dashboard.borderHairline
  const cardShadow = isLight ? '0 2px 10px rgba(26,22,18,0.08)' : 'none'

  const tablePaper = useMemo(
    () => ({
      borderRadius: 2,
      border: `1px solid ${cardBorder}`,
      bgcolor: cardBg,
      boxShadow: cardShadow,
      overflow: 'hidden' as const,
    }),
    [cardBg, cardBorder, cardShadow],
  )

  if (!staffId) return null
  if (staffError) return <Alert severity="error">{String(staffError)}</Alert>
  if (!staff && isStaffLoading)
    return <Typography sx={{ color: dashboard.muted }}>Загрузка…</Typography>
  if (!staff) return <Typography sx={{ color: dashboard.muted }}>Мастер не найден</Typography>

  const col = staff.color || dashboard.accent
  const initials = staff.displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()

  const avatarFg = theme.palette.getContrastText(col)
  const bioText = staff.masterProfile?.bio?.trim() || staff.bio?.trim() || ''
  const statusChip = statusStaffLabel(staff.status)

  async function confirmDeactivate() {
    if (!staffId) return
    setDeactivateBusy(true)
    try {
      await deleteStaff(staffId).unwrap()
      setDeactivateOpen(false)
      navigate('/dashboard?section=staff')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setDeactivateBusy(false)
    }
  }

  return (
    staff && (
      <Box>
        {err && (
          <Alert sx={{ mb: 2 }} severity="error">
            {err}
          </Alert>
        )}

        <Stack spacing={2} sx={{ mb: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ sm: 'flex-start' }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: col,
                color: avatarFg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              {initials || '?'}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
                <Typography sx={{ fontSize: 22, fontWeight: 700, color: nameColor }}>
                  {staff.displayName}
                </Typography>
                <Chip
                  size="small"
                  label={statusChip.label}
                  color={statusChip.color}
                  variant="outlined"
                />
              </Stack>
              <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 1 }}>
                {(staff.masterProfile?.specializations ?? []).map(s => (
                  <Chip
                    key={s}
                    size="small"
                    label={specializationLabel(s)}
                    sx={{ bgcolor: dashboard.card }}
                  />
                ))}
              </Stack>
              {bioText ? (
                <Typography sx={{ color: baseMutedText, fontSize: 14, mb: 1.5 }}>
                  {bioText}
                </Typography>
              ) : null}
              <Stack direction="row" flexWrap="wrap" gap={1}>
                <Button
                  sx={{ bgcolor: dashboard.accent, color: dashboard.onAccent }}
                  onClick={() => setEditOpen(true)}
                >
                  Редактировать
                </Button>
                <Button
                  variant="outlined"
                  sx={{ borderColor: dashboard.borderLight, color: dashboard.text }}
                  onClick={() => setDeactivateOpen(true)}
                >
                  Деактивировать
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Stack>

        <Typography sx={{ color: dashboard.accent, fontWeight: 600, mb: 1 }}>Услуги</Typography>
        <TableContainer sx={{ ...tablePaper, mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: cardMutedText, fontWeight: 600 }}>Услуга</TableCell>
                <TableCell sx={{ color: cardMutedText, fontWeight: 600 }}>Базовая цена</TableCell>
                <TableCell sx={{ color: cardMutedText, fontWeight: 600 }}>
                  Цена для мастера
                </TableCell>
                <TableCell sx={{ color: cardMutedText, fontWeight: 600 }}>Длительность</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staff.services && staff.services.length > 0 ? (
                staff.services.map(s => {
                  const basePrice =
                    s.salonPriceCents != null
                      ? `${(s.salonPriceCents / 100).toLocaleString('ru-RU')} ₽`
                      : '—'
                  const hasPriceOv = s.priceOverrideCents != null
                  const effPrice = hasPriceOv
                    ? `${(s.priceOverrideCents! / 100).toLocaleString('ru-RU')} ₽`
                    : basePrice
                  const baseDur = `${s.salonDurationMinutes} мин`
                  const hasDurOv = s.durationOverrideMinutes != null
                  const effDur = hasDurOv ? `${s.durationOverrideMinutes} мин` : baseDur
                  return (
                    <TableRow key={s.serviceId}>
                      <TableCell sx={{ color: cardText, fontWeight: 500 }}>
                        {s.serviceName}
                      </TableCell>
                      <TableCell sx={{ color: cardMutedText }}>{basePrice}</TableCell>
                      <TableCell
                        sx={{
                          color: hasPriceOv ? dashboard.accent : cardText,
                          fontWeight: hasPriceOv ? 600 : 400,
                        }}
                      >
                        {effPrice}
                        {hasPriceOv && (
                          <Box
                            component="span"
                            sx={{
                              display: 'block',
                              fontSize: 11,
                              color: cardMutedText,
                              fontWeight: 400,
                            }}
                          >
                            база {basePrice}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell
                        sx={{
                          color: hasDurOv ? dashboard.accent : cardText,
                          fontWeight: hasDurOv ? 600 : 400,
                        }}
                      >
                        {effDur}
                        {hasDurOv && (
                          <Box
                            component="span"
                            sx={{
                              display: 'block',
                              fontSize: 11,
                              color: cardMutedText,
                              fontWeight: 400,
                            }}
                          >
                            база {baseDur}
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} sx={{ color: baseMutedText }}>
                    Нет услуг
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Button
          variant="outlined"
          sx={{ mb: 3, borderColor: dashboard.borderLight, color: dashboard.text }}
          onClick={() => setEditOpen(true)}
        >
          Настроить услуги
        </Button>

        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography sx={{ color: dashboard.accent, fontWeight: 600 }}>Расписание</Typography>
          <Button
            size="small"
            onClick={() => setScheduleOpen(true)}
            sx={{ color: dashboard.accent }}
          >
            Редактировать расписание
          </Button>
        </Stack>
        <TableContainer sx={{ ...tablePaper, mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: cardMutedText, fontWeight: 600 }}>День</TableCell>
                <TableCell sx={{ color: cardMutedText, fontWeight: 600 }}>Время</TableCell>
                <TableCell sx={{ color: cardMutedText, fontWeight: 600 }}>Перерыв</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scheduleRows.map((r, i) => {
                const { work, br } = formatScheduleRow(r)
                return (
                  <TableRow key={i}>
                    <TableCell sx={{ color: cardText }}>
                      {DAY_SHORT[r.dayOfWeek] ?? DAY_SHORT[i]}
                    </TableCell>
                    <TableCell sx={{ color: cardText }}>{work}</TableCell>
                    <TableCell sx={{ color: cardMutedText }}>{br}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography sx={{ color: dashboard.accent, fontWeight: 600, mb: 1 }}>
          Ближайшие записи
        </Typography>
        <TableContainer sx={tablePaper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: cardMutedText, fontWeight: 600 }}>Дата и время</TableCell>
                <TableCell sx={{ color: cardMutedText, fontWeight: 600 }}>Клиент</TableCell>
                <TableCell sx={{ color: cardMutedText, fontWeight: 600 }}>Услуга</TableCell>
                <TableCell sx={{ color: cardMutedText, fontWeight: 600 }}>Статус</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {appts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} sx={{ color: baseMutedText }}>
                    Нет предстоящих записей
                  </TableCell>
                </TableRow>
              ) : (
                appts.map(a => {
                  const st = apptStatusBadgeSx(a.status, dashboard.mutedDark, dashboard.red)
                  return (
                    <TableRow
                      key={a.id}
                      hover
                      onClick={() => setSelectedAppt(a)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: isLight ? 'rgba(0,0,0,.03)' : 'rgba(255,255,255,.04)',
                        },
                      }}
                    >
                      <TableCell sx={{ color: cardText, whiteSpace: 'nowrap' }}>
                        {new Date(a.startsAt).toLocaleString('ru-RU')}
                      </TableCell>
                      <TableCell sx={{ color: cardText }}>{a.clientLabel}</TableCell>
                      <TableCell sx={{ color: cardMutedText }}>{a.serviceName}</TableCell>
                      <TableCell>
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block',
                            px: 1,
                            py: 0.25,
                            borderRadius: '20px',
                            fontSize: 11,
                            fontWeight: 600,
                            bgcolor: st.bg,
                            color: st.fg,
                          }}
                        >
                          {a.status === 'pending'
                            ? 'Ожидает'
                            : a.status === 'confirmed'
                              ? 'Подтверждена'
                              : a.status === 'completed'
                                ? 'Завершена'
                                : a.status === 'cancelled_by_salon'
                                  ? 'Отмена'
                                  : a.status}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <StaffFormModal
          open={editOpen}
          staffId={staffId}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false)
            void load()
          }}
        />

        <ScheduleDrawer
          open={scheduleOpen}
          staffId={staffId}
          staffName={staff.displayName}
          onClose={() => setScheduleOpen(false)}
          onSaved={() => void load()}
        />

        <AppointmentDrawer
          open={selectedAppt !== null}
          appointment={selectedAppt}
          onClose={() => setSelectedAppt(null)}
          onUpdated={() => void load()}
        />

        <Dialog open={deactivateOpen} onClose={() => !deactivateBusy && setDeactivateOpen(false)}>
          <DialogTitle>Деактивировать мастера?</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 14, color: dashboard.text }}>
              Мастер будет удалён из активной команды. История записей сохранится.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeactivateOpen(false)} disabled={deactivateBusy}>
              Отмена
            </Button>
            <Button
              color="error"
              variant="contained"
              disabled={deactivateBusy}
              onClick={() => void confirmDeactivate()}
            >
              Деактивировать
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    )
  )
}
