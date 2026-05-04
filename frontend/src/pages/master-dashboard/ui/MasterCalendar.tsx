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
  useLazyGetMasterAppointmentsQuery,
  useGetMasterSalonsQuery,
  useUpdateMasterPersonalAppointmentMutation,
  type MasterAppointmentDTO,
  type MasterSalonMembershipDTO,
} from '@entities/master'
import {
  addDays,
  addMonths,
  eachDayOfWeek,
  endOfMonthExclusive,
  formatDayTitleRu,
  formatWeekTitleRu,
  isSameCalendarMonth,
  monthMatrixDates,
  startOfCalendarMonth,
  startOfWeekMonday,
  toLocalYMD,
} from '@pages/dashboard/lib/calendarGridUtils'
import { useDashboardFilterSelectSx } from '@pages/dashboard/theme/dashboardFilterSelectSx'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { CalendarWeekGrid } from '@pages/dashboard/ui/CalendarWeekGrid'
import { CalendarMonthGrid } from '@pages/dashboard/ui/CalendarMonthGrid'
import { type DashboardAppointment } from '@entities/appointment'
import { CreateMasterAppointmentDrawer } from './drawers/CreateMasterAppointmentDrawer'
import { MasterPersonalAppointmentDrawer } from './drawers/MasterPersonalAppointmentDrawer'
import { enqueueFormSnackbar } from '@shared/ui/FormSnackbar'

function toCalendarItem(a: MasterAppointmentDTO): DashboardAppointment {
  return {
    id: a.id,
    startsAt: a.startsAt,
    endsAt: a.endsAt,
    status: a.status,
    serviceNames: a.serviceName ? [a.serviceName] : [],
    serviceIds: a.serviceId ? [a.serviceId] : [],
    clientLabel: a.clientLabel,
    clientPhone: a.clientPhone,
    salonMasterId: a.salonMasterId,
  }
}

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

export function MasterCalendar() {
  const d = useDashboardPalette()
  const { filterSelectSx, menuPaperSx, menuItemSx } = useDashboardFilterSelectSx()
  const narrow = useMediaQuery('(max-width:600px)')
  const timeColWidth = narrow ? 40 : 56

  const [mode, setMode] = useState<'week' | 'day' | 'month'>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [items, setItems] = useState<DashboardAppointment[]>([])
  const [filterSource, setFilterSource] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [detail, setDetail] = useState<MasterAppointmentDTO | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const [getMasterAppointments] = useLazyGetMasterAppointmentsQuery()
  const { data: salons = [] } = useGetMasterSalonsQuery()
  const [updateAppointment] = useUpdateMasterPersonalAppointmentMutation()

  const weekStart = useMemo(() => startOfWeekMonday(anchor), [anchor])
  const weekDays = useMemo(() => eachDayOfWeek(weekStart), [weekStart])

  const dayStart = useMemo(() => {
    const dd = new Date(anchor)
    dd.setHours(0, 0, 0, 0)
    return dd
  }, [anchor])

  const monthMatrix = useMemo(() => monthMatrixDates(anchor), [anchor])

  const isPersonalAppointment = useCallback((row: MasterAppointmentDTO): boolean => {
    return row.salonId == null || row.salonId === ''
  }, [])

  const openCreateAtSlot = useCallback((slotStart: Date) => {
    setDetail({
      id: 'new',
      startsAt: slotStart.toISOString(),
    } as MasterAppointmentDTO)
    setCreateOpen(true)
  }, [])

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
      const res = await getMasterAppointments({
        from: toLocalYMD(from),
        to: toLocalYMD(toExclusive),
        pageSize: mode === 'month' ? 500 : 400,
        source: filterSource || undefined,
      }).unwrap()
      setItems((res.items ?? []).map(toCalendarItem))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }, [anchor, mode, filterSource, getMasterAppointments])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

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
        const apt = items.find(a => a.id === update.id)
        if (!apt || !isPersonalAppointment(apt as unknown as MasterAppointmentDTO)) {
          setItems(oldItems)
          setErr('Редактирование доступно только для личных записей')
          return
        }
        await updateAppointment({
          id: update.id,
          body: {
            startsAt: update.startsAt,
            endsAt: update.endsAt,
          },
        }).unwrap()
        void load()
      } catch (e) {
        setItems(oldItems)
        // setErr(e instanceof Error ? e.message : 'Не удалось перенести запись')
        enqueueFormSnackbar(e instanceof Error ? e.message : 'Не удалось перенести запись', 'Error')
      }
    },
    [items, isPersonalAppointment, load, updateAppointment],
  )

  const title =
    mode === 'week'
      ? `Календарь — Неделя ${formatWeekTitleRu(weekStart)}`
      : mode === 'day'
        ? `Календарь — ${formatDayTitleRu(dayStart)}`
        : `Календарь — ${anchor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`

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
    '&:active': { transform: 'translateY(0)' },
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
        sx={{ fontFamily: "'Fraunces', serif", fontSize: { xs: 18, sm: 22 }, color: d.text, mb: 1 }}
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
              if (mode === 'month') setAnchor(dd => addMonths(startOfCalendarMonth(dd), -1))
              else setAnchor(dd => new Date(dd.getTime() - (mode === 'day' ? 864e5 : 7 * 864e5)))
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
              if (mode === 'month') setAnchor(dd => addMonths(startOfCalendarMonth(dd), 1))
              else setAnchor(dd => new Date(dd.getTime() + (mode === 'day' ? 864e5 : 7 * 864e5)))
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
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            sx={{ ...filterSelectSx, minWidth: { xs: 140, sm: 180 } }}
            MenuProps={{ PaperProps: { sx: menuPaperSx } }}
          >
            <MenuItem value="" sx={menuItemSx}>
              Все источники
            </MenuItem>
            <MenuItem value="personal" sx={menuItemSx}>
              Личные записи
            </MenuItem>
            {salons.map((s: MasterSalonMembershipDTO) => (
              <MenuItem key={s.salonId} value={s.salonId} sx={menuItemSx}>
                {s.salonName}
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
            onEventClick={a => setDetail(a as unknown as MasterAppointmentDTO)}
            onEmptyClick={(_day, slotStart) => openCreateAtSlot(slotStart)}
            onDayHeaderClick={dd => {
              setAnchor(dd)
              setMode('day')
            }}
            slotDurationMinutes={15}
            onAppointmentMoved={p => handleAppointmentMoved(p)}
          />
        ) : mode === 'month' ? (
          <CalendarMonthGrid
            matrixDays={monthMatrix}
            items={items}
            inMonth={dd => isSameCalendarMonth(dd, anchor)}
            onPickDay={dd => {
              setAnchor(dd)
              setMode('day')
            }}
            onEventClick={a => setDetail(a as unknown as MasterAppointmentDTO)}
          />
        ) : (
          <CalendarWeekGrid
            weekDays={[dayStart]}
            items={items.filter(a => toLocalYMD(new Date(a.startsAt)) === toLocalYMD(dayStart))}
            timeColWidth={timeColWidth}
            onEventClick={a => setDetail(a as unknown as MasterAppointmentDTO)}
            onEmptyClick={(_staffId, slotStart) => openCreateAtSlot(slotStart)}
            onDayHeaderClick={() => {}}
            slotDurationMinutes={15}
            onAppointmentMoved={p => handleAppointmentMoved(p)}
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

      <MasterPersonalAppointmentDrawer
        open={!!detail && detail.id !== 'new'}
        appointment={detail}
        onClose={() => setDetail(null)}
      />

      <CreateMasterAppointmentDrawer
        key={createOpen && detail?.id === 'new' ? `${detail.startsAt}` : 'idle'}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          void load()
        }}
        initialData={
          createOpen && detail?.id === 'new'
            ? {
                startsAt: detail.startsAt,
              }
            : undefined
        }
      />
    </Box>
  )
}
