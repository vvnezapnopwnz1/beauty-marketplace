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
  Divider,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from '@mui/material'
import {
  createDashboardAppointment,
  fetchDashboardAppointments,
  fetchDashboardServices,
  fetchDashboardStaff,
  fetchStaffSchedule,
  patchAppointmentStatus,
  staffListItemsToRows,
  type DashboardAppointment,
  type DashboardServiceRow,
  type DashboardStaffListItem,
  type DashboardStaffRow,
} from '@shared/api/dashboardApi'
import {
  addDays,
  addMonths,
  CALENDAR_DAY_COMBINED_COLUMN,
  CALENDAR_UNASSIGNED_STAFF_KEY,
  eachDayOfWeek,
  endOfMonthExclusive,
  formatDayTitleRu,
  formatWeekTitleRu,
  isSameCalendarMonth,
  monthMatrixDates,
  parseHhmmToMins,
  startOfCalendarMonth,
  startOfWeekMonday,
  toDatetimeLocalInputValue,
  toLocalYMD,
  type StaffScheduleInfo,
} from '../lib/calendarGridUtils'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import type { DashboardPalette } from '@shared/theme'
import { CalendarDayStaffGrid, type StaffColumn } from './CalendarDayStaffGrid'
import { CalendarMonthGrid } from './CalendarMonthGrid'
import { CalendarWeekGrid } from './CalendarWeekGrid'

function LegendSwatch({ color, label }: { color: string; label: string }) {
  const d = useDashboardPalette()
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        fontSize: 11,
        color: d.mutedDark,
      }}
    >
      <Box component="span" sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: color }} />
      {label}
    </Box>
  )
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function statusLabel(status: string): string {
  const s = status.toLowerCase()
  if (s === 'confirmed') return 'Подтверждена'
  if (s === 'pending') return 'Ожидает'
  if (s === 'completed') return 'Завершена'
  if (s.includes('cancel')) return 'Отменена'
  if (s === 'no_show') return 'No-show'
  return status
}

function statusColor(status: string, d: DashboardPalette): string {
  const s = status.toLowerCase()
  if (s === 'confirmed') return d.green
  if (s === 'pending') return d.yellow
  if (s === 'completed') return d.blue
  if (s.includes('cancel') || s === 'no_show') return d.red
  return d.accent
}

function formatDuration(startsAt: string, endsAt: string): string {
  const mins = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000)
  if (mins < 60) return `${mins} мин`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`
}

export function DashboardCalendar() {
  const d = useDashboardPalette()
  const narrow = useMediaQuery('(max-width:600px)')
  const timeColWidth = narrow ? 40 : 56

  const [mode, setMode] = useState<'week' | 'day' | 'month'>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [items, setItems] = useState<DashboardAppointment[]>([])
  const [staff, setStaff] = useState<DashboardStaffRow[]>([])
  const [staffListItems, setStaffListItems] = useState<DashboardStaffListItem[]>([])
  const [services, setServices] = useState<DashboardServiceRow[]>([])
  const [filterStaffId, setFilterStaffId] = useState('')
  const [filterServiceId, setFilterServiceId] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [detail, setDetail] = useState<DashboardAppointment | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({
    serviceId: '',
    staffId: '',
    startsAt: '',
    guestName: '',
    guestPhone: '',
  })
  const [staffSchedules, setStaffSchedules] = useState<Map<string, StaffScheduleInfo>>(new Map())

  const weekStart = useMemo(() => startOfWeekMonday(anchor), [anchor])
  const weekDays = useMemo(() => eachDayOfWeek(weekStart), [weekStart])

  const dayStart = useMemo(() => {
    const d = new Date(anchor)
    d.setHours(0, 0, 0, 0)
    return d
  }, [anchor])

  const hasUnassignedOnDay = useMemo(() => {
    const ymd = toLocalYMD(dayStart)
    return items.some(a => toLocalYMD(new Date(a.startsAt)) === ymd && !a.staffId?.trim())
  }, [items, dayStart])

  const monthMatrix = useMemo(() => monthMatrixDates(anchor), [anchor])

  const staffColumns: StaffColumn[] = useMemo(() => {
    const active = staff.filter(s => s.isActive)
    if (active.length === 0) {
      return [{ id: CALENDAR_DAY_COMBINED_COLUMN, label: 'Записи' }]
    }
    const cols: StaffColumn[] = []
    if (hasUnassignedOnDay) cols.push({ id: CALENDAR_UNASSIGNED_STAFF_KEY, label: 'Без мастера' })
    active.forEach(s => {
      const full = staffListItems.find(i => i.staff.id === s.id)?.staff
      cols.push({ id: s.id, label: s.displayName, color: full?.color ?? null })
    })
    return cols
  }, [staff, hasUnassignedOnDay, staffListItems])

  const load = useCallback(async () => {
    setErr(null)
    let from: Date
    let toExclusive: Date
    if (mode === 'day') {
      from = new Date(anchor)
      from.setHours(0, 0, 0, 0)
      toExclusive = addDays(from, 1)
    } else if (mode === 'month') {
      from = startOfCalendarMonth(anchor)
      toExclusive = endOfMonthExclusive(anchor)
    } else {
      from = startOfWeekMonday(anchor)
      toExclusive = addDays(from, 7)
    }
    try {
      const res = await fetchDashboardAppointments({
        from: toLocalYMD(from),
        to: toLocalYMD(toExclusive),
        pageSize: mode === 'month' ? 500 : 400,
        staffId: filterStaffId || undefined,
        serviceId: filterServiceId || undefined,
      })
      setItems(res.items)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }, [anchor, mode, filterStaffId, filterServiceId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const [s, st] = await Promise.all([fetchDashboardServices(), fetchDashboardStaff()])
          setServices(s.filter(x => x.isActive))
          setStaff(staffListItemsToRows(st))
          setStaffListItems(st)
          setForm(f => (f.serviceId ? f : { ...f, serviceId: s.find(x => x.isActive)?.id ?? '' }))
        } catch {
          /* ignore */
        }
      })()
    }, 0)
    return () => window.clearTimeout(t)
  }, [])

  // Load staff schedules when in day mode
  useEffect(() => {
    if (mode !== 'day') return
    const active = staffListItems.filter(i => i.staff.isActive)
    if (active.length === 0) return
    // JS getDay(): 0=Sun, 1=Mon...6=Sat
    const dow = dayStart.getDay()
    void (async () => {
      const schedMap = new Map<string, StaffScheduleInfo>()
      await Promise.all(
        active.map(async item => {
          try {
            const data = await fetchStaffSchedule(item.staff.id)
            const row = data.rows.find(r => r.dayOfWeek === dow)
            if (row) {
              schedMap.set(item.staff.id, {
                opensMins: parseHhmmToMins(row.opensAt) ?? 0,
                closesMins: parseHhmmToMins(row.closesAt) ?? 24 * 60,
                isOff: row.isDayOff,
                breakStartsAt: row.breakStartsAt,
                breakEndsAt: row.breakEndsAt,
              })
            }
          } catch {
            /* ignore per-staff errors */
          }
        }),
      )
      setStaffSchedules(schedMap)
    })()
  }, [mode, dayStart, staffListItems])

  const title =
    mode === 'week'
      ? `Календарь — Неделя ${formatWeekTitleRu(weekStart)}`
      : mode === 'day'
        ? `Календарь — ${formatDayTitleRu(dayStart)}`
        : `Календарь — ${anchor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`

  function openCreateAtSlot(slotStart: Date, staffIdPref: string | null) {
    setForm(f => ({
      ...f,
      startsAt: toDatetimeLocalInputValue(slotStart),
      staffId: staffIdPref ?? '',
      serviceId: f.serviceId || services[0]?.id || '',
    }))
    setCreateOpen(true)
  }

  async function submitCreate() {
    try {
      await createDashboardAppointment({
        serviceId: form.serviceId,
        staffId: form.staffId || null,
        startsAt: new Date(form.startsAt).toISOString(),
        guestName: form.guestName,
        guestPhone: form.guestPhone,
      })
      setCreateOpen(false)
      void load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  async function setApptStatus(id: string, s: string) {
    try {
      await patchAppointmentStatus(id, s)
      setDetail(cur => (cur && cur.id === id ? { ...cur, status: s } : cur))
      void load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  const mockBtnSx = {
    px: 1.5,
    py: 0.5,
    minWidth: 0,
    fontSize: 12,
    borderRadius: '6px',
    textTransform: 'none' as const,
    bgcolor: d.control,
    color: d.muted,
    border: 'none',
    '&:hover': { bgcolor: d.controlHover, color: d.text },
  }

  // Detail dialog: find staff color for avatar
  const detailStaffColor = useMemo(() => {
    if (!detail?.staffId) return null
    return staffListItems.find(i => i.staff.id === detail.staffId)?.staff.color ?? null
  }, [detail, staffListItems])

  return (
    <Box>
      {err && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: d.errorBg, color: d.text }}>
          {err}
        </Alert>
      )}

      <Typography
        sx={{
          fontFamily: "'Fraunces', serif",
          fontSize: { xs: 18, sm: 22 },
          color: d.text,
          mb: 1,
        }}
      >
        {title}
      </Typography>

      <Stack
        direction="row"
        flexWrap="wrap"
        alignItems="center"
        justifyContent="space-between"
        gap={1.5}
        sx={{ mb: 1.25, columnGap: 2, rowGap: 1 }}
      >
        <Stack
          direction="row"
          flexWrap="wrap"
          gap={1}
          alignItems="center"
          sx={{ flex: '1 1 auto', minWidth: 0 }}
        >
          <Button
            size="small"
            sx={mockBtnSx}
            onClick={() => {
              if (mode === 'month') setAnchor(d => addMonths(startOfCalendarMonth(d), -1))
              else setAnchor(d => new Date(d.getTime() - (mode === 'day' ? 864e5 : 7 * 864e5)))
            }}
          >
            ‹
          </Button>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => v && setMode(v)}
            size="small"
            sx={{
              gap: 1,
              '& .MuiToggleButton-root': {
                ...mockBtnSx,
                border: '1px solid transparent',
                px: 1.25,
              },
              '& .Mui-selected': {
                bgcolor: `${d.accent} !important`,
                color: `${d.onAccent} !important`,
              },
            }}
          >
            <ToggleButton value="week">Неделя</ToggleButton>
            <ToggleButton value="day">День</ToggleButton>
            <ToggleButton value="month">Месяц</ToggleButton>
          </ToggleButtonGroup>
          <Button
            size="small"
            sx={mockBtnSx}
            onClick={() => {
              if (mode === 'month') setAnchor(d => addMonths(startOfCalendarMonth(d), 1))
              else setAnchor(d => new Date(d.getTime() + (mode === 'day' ? 864e5 : 7 * 864e5)))
            }}
          >
            ›
          </Button>
          <Button
            size="small"
            sx={{
              ...mockBtnSx,
              bgcolor: d.accent,
              color: d.onAccent,
              '&:hover': { bgcolor: '#e4a882', color: d.onAccent },
            }}
            onClick={() => setAnchor(new Date())}
          >
            Сегодня
          </Button>
        </Stack>
        <Stack
          direction="row"
          flexWrap="wrap"
          gap={1.5}
          alignItems="center"
          sx={{ flex: '0 1 auto' }}
        >
          <TextField
            select
            size="small"
            label="Мастер"
            value={filterStaffId}
            onChange={e => setFilterStaffId(e.target.value)}
            sx={{
              minWidth: { xs: 140, sm: 160 },
              '& .MuiInputBase-root': { color: d.text },
              '& label': { color: d.muted },
            }}
            SelectProps={{ MenuProps: { PaperProps: { sx: { bgcolor: d.card } } } }}
          >
            <MenuItem value="">Все</MenuItem>
            {staff
              .filter(s => s.isActive)
              .map(s => (
                <MenuItem key={s.id} value={s.id}>
                  {s.displayName}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Услуга"
            value={filterServiceId}
            onChange={e => setFilterServiceId(e.target.value)}
            sx={{
              minWidth: { xs: 140, sm: 180 },
              '& .MuiInputBase-root': { color: d.text },
              '& label': { color: d.muted },
            }}
            SelectProps={{ MenuProps: { PaperProps: { sx: { bgcolor: d.card } } } }}
          >
            <MenuItem value="">Все</MenuItem>
            {services.map(s => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Stack>

      {mode === 'week' ? (
        <CalendarWeekGrid
          weekDays={weekDays}
          items={items}
          timeColWidth={timeColWidth}
          onEventClick={a => setDetail(a)}
          onEmptyClick={(_day, slotStart) => openCreateAtSlot(slotStart, null)}
          onDayHeaderClick={d => {
            setAnchor(d)
            setMode('day')
          }}
        />
      ) : mode === 'day' ? (
        <CalendarDayStaffGrid
          day={dayStart}
          staffColumns={staffColumns}
          items={items}
          timeColWidth={timeColWidth}
          onEventClick={a => setDetail(a)}
          onEmptyClick={(staffId, slotStart) => openCreateAtSlot(slotStart, staffId)}
          staffSchedules={staffSchedules}
        />
      ) : (
        <CalendarMonthGrid
          matrixDays={monthMatrix}
          items={items}
          inMonth={d => isSameCalendarMonth(d, anchor)}
          onPickDay={d => {
            setAnchor(d)
            setMode('day')
          }}
          onEventClick={a => setDetail(a)}
        />
      )}

      <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mt: 1 }}>
        <LegendSwatch color="#6bcb77" label="Подтверждена" />
        <LegendSwatch color="#ffd93d" label="Ожидает" />
        <LegendSwatch color={d.accent} label="Прочее" />
        <LegendSwatch color="#ff6b6b" label="Отмена / no-show" />
      </Stack>

      <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: d.muted }}>
        {mode === 'month'
          ? 'Клик по дню — перейти в режим «День». Клик по записи — карточка.'
          : mode === 'week'
            ? 'Клик по заголовку дня — перейти в режим «День». Пустая ячейка — новая запись.'
            : 'Пустая ячейка — новая запись.'}
      </Typography>

      {/* Detail dialog — enhanced (Task 8) */}
      <Dialog
        open={!!detail}
        onClose={() => setDetail(null)}
        PaperProps={{ sx: { bgcolor: d.dialog, color: d.text, minWidth: 320 } }}
      >
        {detail && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                {/* Client avatar */}
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: detailStaffColor
                      ? `${detailStaffColor}25`
                      : `${d.accent}20`,
                    border: `2px solid ${detailStaffColor ?? d.accent}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: detailStaffColor ?? d.accent,
                    }}
                  >
                    {getInitials(detail.clientLabel)}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: d.text, lineHeight: 1.3 }}>
                    {detail.clientLabel}
                  </Typography>
                  {detail.clientPhone && (
                    <Typography sx={{ fontSize: 12, color: d.muted, lineHeight: 1.3 }}>
                      {detail.clientPhone}
                    </Typography>
                  )}
                </Box>
                <Chip
                  label={statusLabel(detail.status)}
                  size="small"
                  sx={{
                    bgcolor: `${statusColor(detail.status, d)}20`,
                    color: statusColor(detail.status, d),
                    border: `1px solid ${statusColor(detail.status, d)}40`,
                    fontSize: 11,
                    height: 22,
                    flexShrink: 0,
                  }}
                />
              </Stack>
            </DialogTitle>

            <Divider sx={{ borderColor: d.border }} />

            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, pt: 1.5 }}>
              {/* Service */}
              <Stack direction="row" justifyContent="space-between" gap={1}>
                <Box>
                  <Typography sx={{ fontSize: 10, color: d.muted, mb: 0.25 }}>Услуга</Typography>
                  <Typography sx={{ fontSize: 13, color: d.text }}>{detail.serviceName}</Typography>
                </Box>
                {detail.staffName && (
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: 10, color: d.muted, mb: 0.25 }}>Мастер</Typography>
                    <Typography sx={{ fontSize: 13, color: d.text }}>{detail.staffName}</Typography>
                  </Box>
                )}
              </Stack>

              {/* Date & time */}
              <Stack direction="row" justifyContent="space-between" gap={1}>
                <Box>
                  <Typography sx={{ fontSize: 10, color: d.muted, mb: 0.25 }}>Дата и время</Typography>
                  <Typography sx={{ fontSize: 13, color: d.text }}>
                    {new Date(detail.startsAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    {new Date(detail.startsAt).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' – '}
                    {new Date(detail.endsAt).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: 10, color: d.muted, mb: 0.25 }}>
                    Длительность
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: d.text }}>
                    {formatDuration(detail.startsAt, detail.endsAt)}
                  </Typography>
                </Box>
              </Stack>

              {/* Client note */}
              {detail.clientNote && (
                <Box
                  sx={{
                    p: 1,
                    bgcolor: `${d.accent}0d`,
                    borderRadius: 1,
                    border: `1px solid ${d.accent}20`,
                  }}
                >
                  <Typography sx={{ fontSize: 10, color: d.muted, mb: 0.25 }}>Заметка</Typography>
                  <Typography sx={{ fontSize: 12, color: d.text }}>{detail.clientNote}</Typography>
                </Box>
              )}

              {/* Actions by status */}
              {detail.status === 'pending' && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button
                    size="small"
                    variant="contained"
                    sx={{ bgcolor: d.green, color: '#0a1f0d', '&:hover': { bgcolor: '#5ab365' } }}
                    onClick={() => void setApptStatus(detail.id, 'confirmed')}
                  >
                    Подтвердить
                  </Button>
                  <Button
                    size="small"
                    sx={{ color: d.red, borderColor: `${d.red}50` }}
                    variant="outlined"
                    onClick={() => void setApptStatus(detail.id, 'cancelled_by_salon')}
                  >
                    Отклонить
                  </Button>
                </Stack>
              )}
              {detail.status === 'confirmed' && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button
                    size="small"
                    variant="contained"
                    sx={{ bgcolor: d.accent, color: d.onAccent, '&:hover': { bgcolor: '#e4a882' } }}
                    onClick={() => void setApptStatus(detail.id, 'completed')}
                  >
                    Завершить
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ color: d.muted, borderColor: `${d.muted}40` }}
                    onClick={() => void setApptStatus(detail.id, 'no_show')}
                  >
                    No-show
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ color: d.red, borderColor: `${d.red}50` }}
                    onClick={() => void setApptStatus(detail.id, 'cancelled_by_salon')}
                  >
                    Отменить
                  </Button>
                </Stack>
              )}
            </DialogContent>

            <DialogActions sx={{ pt: 0 }}>
              <Button onClick={() => setDetail(null)} sx={{ color: d.muted }}>
                Закрыть
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        PaperProps={{ sx: { bgcolor: d.dialog, color: d.text } }}
      >
        <DialogTitle>Новая запись</DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 320, pt: 1 }}
        >
          <TextField
            select
            label="Услуга"
            value={form.serviceId}
            onChange={e => setForm(f => ({ ...f, serviceId: e.target.value }))}
            SelectProps={{ MenuProps: { PaperProps: { sx: { bgcolor: d.card } } } }}
            sx={{
              '& .MuiInputBase-root': { color: d.text },
              '& label': { color: d.muted },
            }}
          >
            {services.map(s => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Мастер"
            value={form.staffId}
            onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))}
            SelectProps={{ MenuProps: { PaperProps: { sx: { bgcolor: d.card } } } }}
            sx={{
              '& .MuiInputBase-root': { color: d.text },
              '& label': { color: d.muted },
            }}
          >
            <MenuItem value="">—</MenuItem>
            {staff
              .filter(s => s.isActive)
              .map(s => (
                <MenuItem key={s.id} value={s.id}>
                  {s.displayName}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            label="Начало (локальное)"
            type="datetime-local"
            value={form.startsAt}
            onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{
              '& .MuiInputBase-root': { color: d.text },
              '& label': { color: d.muted },
            }}
          />
          <TextField
            label="Имя"
            value={form.guestName}
            onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))}
            sx={{
              '& .MuiInputBase-root': { color: d.text },
              '& label': { color: d.muted },
            }}
          />
          <TextField
            label="Телефон +7…"
            value={form.guestPhone}
            onChange={e => setForm(f => ({ ...f, guestPhone: e.target.value }))}
            sx={{
              '& .MuiInputBase-root': { color: d.text },
              '& label': { color: d.muted },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: d.muted }}>
            Отмена
          </Button>
          <Button
            variant="contained"
            sx={{ bgcolor: d.accent, color: d.onAccent }}
            onClick={() => void submitCreate()}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
