import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import {
  fetchDashboardServices,
  fetchDashboardStaff,
  fetchSalonSchedule,
  fetchStaffSchedule,
  staffListItemsToRows,
  type DashboardServiceRow,
  type DashboardStaffListItem,
  type DashboardStaffRow,
} from '@shared/api/dashboardApi'
import { useLazyGetAppointmentsQuery, useUpdateAppointmentMutation } from '@entities/appointment'
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
  toLocalYMD,
  type StaffScheduleInfo,
} from '../lib/calendarGridUtils'
import { useDashboardFilterSelectSx } from '@pages/dashboard/theme/dashboardFilterSelectSx'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { CalendarDayStaffGrid, type StaffColumn } from './CalendarDayStaffGrid'
import { CalendarMonthGrid } from './CalendarMonthGrid'
import { CalendarWeekGrid } from './CalendarWeekGrid'
import { AppointmentDrawer } from '@pages/dashboard/ui/drawers/AppointmentDrawer'
import { CreateAppointmentDrawer } from '@pages/dashboard/ui/drawers/CreateAppointmentDrawer'

import { type DashboardAppointment } from '@entities/appointment'

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

export function DashboardCalendar() {
  const d = useDashboardPalette()
  const { filterSelectSx, menuPaperSx, menuItemSx } = useDashboardFilterSelectSx()
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

  const [staffSchedules, setStaffSchedules] = useState<Map<string, StaffScheduleInfo>>(new Map())
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(15)
  const [getAppointments] = useLazyGetAppointmentsQuery()
  const [updateAppointment] = useUpdateAppointmentMutation()

  const weekStart = useMemo(() => startOfWeekMonday(anchor), [anchor])
  const weekDays = useMemo(() => eachDayOfWeek(weekStart), [weekStart])

  const dayStart = useMemo(() => {
    const d = new Date(anchor)
    d.setHours(0, 0, 0, 0)
    return d
  }, [anchor])

  const hasUnassignedOnDay = useMemo(() => {
    const ymd = toLocalYMD(dayStart)
    return items.some(a => toLocalYMD(new Date(a.startsAt)) === ymd && !a.salonMasterId?.trim())
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
      const res = await getAppointments({
        from: toLocalYMD(from),
        to: toLocalYMD(toExclusive),
        pageSize: mode === 'month' ? 500 : 400,
        staffId: filterStaffId || undefined,
        serviceId: filterServiceId || undefined,
      }).unwrap()
      setItems(res.items as unknown as DashboardAppointment[])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }, [anchor, mode, filterStaffId, filterServiceId, getAppointments])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const [s, st, salonSched] = await Promise.all([
            fetchDashboardServices(),
            fetchDashboardStaff(),
            fetchSalonSchedule().catch(() => null),
          ])
          setServices(s.filter(x => x.isActive))
          setStaff(staffListItemsToRows(st))
          setStaffListItems(st)
          if (salonSched?.slotDurationMinutes)
            setSlotDurationMinutes(salonSched.slotDurationMinutes)
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
    setDetail({
      id: 'new',
      startsAt: slotStart.toISOString(),
      salonMasterId: staffIdPref ?? undefined,
    } as unknown as DashboardAppointment)
    setCreateOpen(true)
  }

  const handleAppointmentMoved = useCallback(
    async (update: {
      id: string
      startsAt: string
      endsAt: string
      salonMasterId?: string
      clearSalonMasterId?: boolean
    }) => {
      setErr(null)
      const oldItems = [...items]

      // 1. Optimistic Update
      setItems(prev =>
        prev.map(apt => {
          if (apt.id !== update.id) return apt
          return {
            ...apt,
            startsAt: update.startsAt,
            endsAt: update.endsAt,
            salonMasterId: update.clearSalonMasterId
              ? undefined
              : (update.salonMasterId ?? apt.salonMasterId),
          }
        }),
      )

      try {
        await updateAppointment({
          id: update.id,
          body: {
            startsAt: update.startsAt,
            endsAt: update.endsAt,
            ...(update.clearSalonMasterId
              ? { clearSalonMasterId: true }
              : update.salonMasterId
                ? { salonMasterId: update.salonMasterId }
                : {}),
          },
        }).unwrap()
        void load()
      } catch (e) {
        // 2. Rollback on failure
        setItems(oldItems)
        setErr(e instanceof Error ? e.message : 'Не удалось перенести запись')
      }
    },
    [items, load, updateAppointment],
  )

  const mockBtnSx = {
    px: 1.5,
    py: 0.75,
    minWidth: 0,
    fontSize: 13,
    fontWeight: 500,
    borderRadius: '8px',
    textTransform: 'none' as const,
    bgcolor: d.control,
    color: d.text,
    border: `1px solid ${d.border}`,
    transition: 'all 0.2s',
    '&:hover': {
      bgcolor: d.controlHover,
      borderColor: d.borderLight,
      transform: 'translateY(-1px)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  }

  const calendarViewportSx = {
    mt: 0.5,
    maxHeight: { xs: '60vh', md: '68vh' },
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden',
    borderRadius: 1.5,
    border: `1px solid ${d.grid}`,
    bgcolor: d.card,
  }

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
            sx={{ ...mockBtnSx, p: 0.5 }}
            onClick={() => {
              if (mode === 'month') setAnchor(d => addMonths(startOfCalendarMonth(d), -1))
              else setAnchor(d => new Date(d.getTime() - (mode === 'day' ? 864e5 : 7 * 864e5)))
            }}
          >
            <ChevronLeftIcon fontSize="small" />
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
            <ToggleButton value="day">День</ToggleButton>
            <ToggleButton value="week">Неделя</ToggleButton>
            <ToggleButton value="month">Месяц</ToggleButton>
          </ToggleButtonGroup>
          <Button
            size="small"
            sx={{ ...mockBtnSx, p: 0.5 }}
            onClick={() => {
              if (mode === 'month') setAnchor(d => addMonths(startOfCalendarMonth(d), 1))
              else setAnchor(d => new Date(d.getTime() + (mode === 'day' ? 864e5 : 7 * 864e5)))
            }}
          >
            <ChevronRightIcon fontSize="small" />
          </Button>
          <Button
            size="small"
            startIcon={<CalendarTodayIcon sx={{ fontSize: '14px !important' }} />}
            sx={{
              ...mockBtnSx,
              bgcolor: d.accent,
              color: d.onAccent,
              borderColor: 'transparent',
              '&:hover': {
                bgcolor: '#e4a882',
                color: d.onAccent,
                boxShadow: `0 4px 12px ${d.accent}40`,
              },
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
          <Select
            displayEmpty
            size="small"
            value={filterStaffId}
            onChange={e => setFilterStaffId(e.target.value)}
            sx={[filterSelectSx, { minWidth: { xs: 140, sm: 160 } }]}
            MenuProps={{ PaperProps: { sx: menuPaperSx } }}
          >
            <MenuItem value="" sx={menuItemSx}>Все мастера</MenuItem>
            {staff
              .filter(s => s.isActive)
              .map(s => (
                <MenuItem key={s.id} value={s.id} sx={menuItemSx}>
                  {s.displayName}
                </MenuItem>
              ))}
          </Select>
          <Select
            displayEmpty
            size="small"
            value={filterServiceId}
            onChange={e => setFilterServiceId(e.target.value)}
            sx={[filterSelectSx, { minWidth: { xs: 140, sm: 180 } }]}
            MenuProps={{ PaperProps: { sx: menuPaperSx } }}
          >
            <MenuItem value="" sx={menuItemSx}>Все услуги</MenuItem>
            {services.map(s => (
              <MenuItem key={s.id} value={s.id} sx={menuItemSx}>
                {s.name}
              </MenuItem>
            ))}
          </Select>
        </Stack>
      </Stack>

      <Box sx={calendarViewportSx}>
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
            slotDurationMinutes={slotDurationMinutes}
            onAppointmentMoved={p => handleAppointmentMoved(p)}
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
            slotDurationMinutes={slotDurationMinutes}
            onAppointmentMoved={p => handleAppointmentMoved(p)}
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
      </Box>

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

      <AppointmentDrawer
        open={!!detail && detail.id !== 'new'}
        appointment={detail}
        onClose={() => setDetail(null)}
        onUpdated={() => void load()}
      />

      <CreateAppointmentDrawer
        key={
          createOpen && detail?.id === 'new'
            ? `${detail.startsAt}\u0000${detail.salonMasterId ?? ''}`
            : 'idle'
        }
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initialData={
          createOpen && detail?.id === 'new'
            ? {
                startsAt: detail.startsAt,
                staffId: detail.salonMasterId ?? undefined,
              }
            : undefined
        }
      />
    </Box>
  )
}
