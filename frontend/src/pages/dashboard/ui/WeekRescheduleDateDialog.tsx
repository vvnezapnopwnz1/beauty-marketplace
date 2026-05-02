import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Button, Dialog, Typography, useTheme } from '@mui/material'
import type { DashboardAppointment } from '@entities/appointment'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import {
  CALENDAR_HOUR_END,
  CALENDAR_HOUR_START,
} from '@pages/dashboard/lib/calendarGridUtils'
import { appointmentDurationMinutes } from '@pages/dashboard/lib/dndCalendarUtils'

/** Скругления как VELA.radius в Beautica vela/calendar.jsx (RescheduleDialog / DropZone) */
const VELA_RADIUS = { sm: 6, md: 10, xl: 20 } as const

const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTH_NAMES = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function fmtTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function buildTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = CALENDAR_HOUR_START; h <= CALENDAR_HOUR_END; h++) {
    slots.push(`${pad2(h)}:00`)
    if (h < CALENDAR_HOUR_END) slots.push(`${pad2(h)}:30`)
  }
  return slots
}

type SelDate = { day: number; month: number }

type CalDay = { day: number; month: number; dim: boolean }

function buildMonthGrid(baseYear: number, baseMonth: number): CalDay[] {
  const monthStart = new Date(baseYear, baseMonth, 1)
  const startDow = (monthStart.getDay() + 6) % 7
  const daysInMonth = new Date(baseYear, baseMonth + 1, 0).getDate()
  const daysInPrev = new Date(baseYear, baseMonth, 0).getDate()
  const calDays: CalDay[] = []
  for (let i = 0; i < 42; i++) {
    const dayNum = i - startDow + 1
    if (dayNum < 1) {
      calDays.push({ day: daysInPrev + dayNum, month: baseMonth - 1, dim: true })
    } else if (dayNum > daysInMonth) {
      calDays.push({ day: dayNum - daysInMonth, month: baseMonth + 1, dim: true })
    } else {
      calDays.push({ day: dayNum, month: baseMonth, dim: false })
    }
  }
  return calDays
}

type Props = {
  open: boolean
  appointment: DashboardAppointment | null
  onClose: () => void
  onConfirm: (payload: { startsAt: string; endsAt: string }) => Promise<void>
}

export function WeekRescheduleDateDialog({ open, appointment, onClose, onConfirm }: Props) {
  const d = useDashboardPalette()
  const theme = useTheme()
  const displayFont =
    (typeof theme.typography.h4?.fontFamily === 'string' && theme.typography.h4.fontFamily) ||
    (typeof theme.typography.h5?.fontFamily === 'string' && theme.typography.h5.fontFamily) ||
    'Cormorant, serif'
  const uiFont =
    typeof theme.typography.fontFamily === 'string' ? theme.typography.fontFamily : 'inherit'

  const [selDate, setSelDate] = useState<SelDate | null>(null)
  const [selTime, setSelTime] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const start = appointment ? new Date(appointment.startsAt) : null
  const end = appointment ? new Date(appointment.endsAt) : null

  useEffect(() => {
    if (open && appointment) {
      setSelDate(null)
      setSelTime(null)
      setSubmitting(false)
    }
  }, [open, appointment?.id])

  const baseYear = start?.getFullYear() ?? 0
  const baseMonth = start?.getMonth() ?? 0
  const calDays = useMemo(() => buildMonthGrid(baseYear, baseMonth), [baseYear, baseMonth])
  const timeSlots = useMemo(() => buildTimeSlots(), [])

  const durationMin = useMemo(
    () => (appointment ? appointmentDurationMinutes(appointment.startsAt, appointment.endsAt) : 0),
    [appointment],
  )

  const today = useMemo(() => new Date(), [])

  const serviceLabel = appointment?.serviceNames?.length
    ? appointment.serviceNames.join(', ')
    : 'Услуга'

  const origDateStr = start
    ? start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })
    : ''

  const selDateObj =
    selDate != null ? new Date(baseYear, selDate.month, selDate.day, 0, 0, 0, 0) : null
  const selDateStr = selDateObj
    ? selDateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })
    : null

  const canConfirm = Boolean(selDate && selTime && appointment && start && end)

  /** Как `serviceColor(t, cat)` в vela — для точки в заголовке */
  const serviceAccentColor = d.other

  const handleConfirm = useCallback(async () => {
    if (!canConfirm || !appointment || !selDate || !selTime) return
    const [hh, mm] = selTime.split(':').map(Number)
    const newStart = new Date(baseYear, selDate.month, selDate.day, hh, mm, 0, 0)
    const newEnd = new Date(newStart.getTime() + durationMin * 60000)
    setSubmitting(true)
    try {
      await onConfirm({ startsAt: newStart.toISOString(), endsAt: newEnd.toISOString() })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }, [
    appointment,
    baseYear,
    canConfirm,
    durationMin,
    onClose,
    onConfirm,
    selDate,
    selTime,
  ])

  if (!appointment || !start || !end) return null

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      scroll="paper"
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(6px)',
            bgcolor: 'rgba(0,0,0,0.55)',
          },
        },
        paper: {
          sx: {
            bgcolor: d.surface,
            border: `1px solid ${d.border}`,
            borderRadius: `${VELA_RADIUS.xl}px`,
            width: 380,
            maxWidth: 'calc(100vw - 32px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            maxHeight: '90vh',
            overflowY: 'auto',
            p: '28px',
            m: 2,
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', mb: '6px' }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: serviceAccentColor }} />
        <Typography
          component="span"
          sx={{
            fontFamily: displayFont,
            fontSize: 20,
            fontWeight: 500,
            color: d.text,
            letterSpacing: '-0.4px',
          }}
        >
          Перенести запись
        </Typography>
      </Box>
      <Typography
        sx={{
          fontSize: 12,
          color: d.textMuted,
          mb: '20px',
          pl: '18px',
          fontFamily: uiFont,
        }}
      >
        {serviceLabel} · {appointment.clientLabel} · {origDateStr} {fmtTime(start)}–{fmtTime(end)}
      </Typography>

      <Typography
        sx={{
          fontSize: 10,
          color: d.textMuted,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          mb: '8px',
          fontFamily: uiFont,
        }}
      >
        Выберите дату
      </Typography>
      <Box
        sx={{
          bgcolor: d.surfaceEl,
          borderRadius: `${VELA_RADIUS.md}px`,
          p: '12px',
          mb: '16px',
          border: `1px solid ${d.borderSub}`,
        }}
      >
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 600,
            color: d.text,
            textAlign: 'center',
            mb: '10px',
            fontFamily: uiFont,
          }}
        >
          {MONTH_NAMES[baseMonth]} {baseYear}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {DAYS_SHORT.map(day => (
            <Typography
              key={day}
              sx={{
                fontSize: 10,
                fontWeight: 600,
                color: d.textMuted,
                textAlign: 'center',
                py: '4px',
                fontFamily: uiFont,
              }}
            >
              {day}
            </Typography>
          ))}
          {calDays.map((cd, i) => {
            const isOrigDay =
              !cd.dim &&
              cd.day === start.getDate() &&
              cd.month === start.getMonth() &&
              baseYear === start.getFullYear()
            const isSel = selDate && selDate.day === cd.day && selDate.month === cd.month
            const isToday =
              !cd.dim &&
              cd.day === today.getDate() &&
              cd.month === today.getMonth() &&
              baseYear === today.getFullYear()
            return (
              <Box
                key={i}
                onClick={() => !cd.dim && setSelDate({ day: cd.day, month: cd.month })}
                sx={{
                  fontSize: 12,
                  textAlign: 'center',
                  py: '6px',
                  borderRadius: `${VELA_RADIUS.sm}px`,
                  cursor: cd.dim ? 'default' : 'pointer',
                  fontFamily: uiFont,
                  bgcolor: isSel ? d.accent : isOrigDay ? `${serviceAccentColor}25` : 'transparent',
                  color: isSel ? '#fff' : cd.dim ? `${d.textMuted}60` : isToday ? d.accent : d.text,
                  fontWeight: isSel || isToday ? 700 : 400,
                  border: isOrigDay && !isSel ? `1px dashed ${serviceAccentColor}` : '1px solid transparent',
                  transition: 'all 0.12s',
                  opacity: cd.dim ? 0.35 : 1,
                  '&:hover':
                    !cd.dim && !isSel ? { bgcolor: isOrigDay ? `${serviceAccentColor}35` : d.controlHover } : {},
                }}
              >
                {cd.day}
              </Box>
            )
          })}
        </Box>
      </Box>

      <Typography
        sx={{
          fontSize: 10,
          color: d.textMuted,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          mb: '8px',
          fontFamily: uiFont,
        }}
      >
        Выберите время
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', mb: '20px' }}>
        {timeSlots.map(ts => {
          const active = selTime === ts
          return (
            <Box
              key={ts}
              onClick={() => setSelTime(ts)}
              sx={{
                py: '7px',
                px: '4px',
                textAlign: 'center',
                fontSize: 12,
                borderRadius: `${VELA_RADIUS.sm}px`,
                bgcolor: active ? d.accent : d.surfaceEl,
                color: active ? '#fff' : d.textSub,
                border: `1px solid ${active ? d.accent : d.borderSub}`,
                fontWeight: active ? 700 : 400,
                cursor: 'pointer',
                transition: 'all 0.12s',
                fontFamily: uiFont,
              }}
            >
              {ts}
            </Box>
          )
        })}
      </Box>

      {canConfirm && selDate && selTime && (
        <Box
          sx={{
            py: '10px',
            px: '14px',
            bgcolor: d.accentSoft,
            borderRadius: `${VELA_RADIUS.md}px`,
            mb: '16px',
            fontSize: 12,
            color: d.accent,
            fontWeight: 500,
            fontFamily: uiFont,
          }}
        >
          → {selDateStr}, {selTime} –{' '}
          {(() => {
            const [hh, mm] = selTime.split(':').map(Number)
            const ns = new Date(baseYear, selDate.month, selDate.day, hh, mm, 0, 0)
            const ne = new Date(ns.getTime() + durationMin * 60000)
            return fmtTime(ne)
          })()}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: '10px' }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={onClose}
          disabled={submitting}
          sx={{
            flex: 1,
            borderRadius: 100,
            borderColor: d.borderLight,
            color: d.text,
            '&:hover': { borderColor: d.textSub, bgcolor: d.accentSoft },
          }}
        >
          Отмена
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => void handleConfirm()}
          disabled={submitting}
          sx={{
            flex: 2,
            borderRadius: 100,
            opacity: canConfirm ? 1 : 0.4,
            pointerEvents: canConfirm ? 'auto' : 'none',
            bgcolor: d.accent,
            color: '#fff',
            '&:hover': { bgcolor: d.accentHov },
          }}
        >
          Перенести
        </Button>
      </Box>
    </Dialog>
  )
}
