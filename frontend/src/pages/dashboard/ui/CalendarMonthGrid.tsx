import { useMemo } from 'react'
import { Box, Typography } from '@mui/material'
import type { DashboardAppointment } from '@shared/api/dashboardApi'
import { mocha } from '@pages/dashboard/theme/mocha'
import { appointmentStatusVariant, toLocalYMD, type CalendarEventVariant } from '../lib/calendarGridUtils'

function LoadBar({ count }: { count: number }) {
  if (count === 0) return null
  const widthPct = count >= 8 ? 100 : count >= 4 ? 66 : 33
  const color = count >= 8 ? mocha.accent : count >= 4 ? mocha.yellow : mocha.green
  return (
    <Box
      sx={{
        mt: 0.25,
        mb: 0.25,
        height: 3,
        borderRadius: 2,
        bgcolor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ width: `${widthPct}%`, height: '100%', bgcolor: color, borderRadius: 2 }} />
    </Box>
  )
}

const WD = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']

const VARIANT_SX: Record<CalendarEventVariant, object> = {
  confirmed: { bgcolor: 'rgba(107,203,119,.12)', color: '#8fdf9a', borderLeft: '2px solid #6bcb77' },
  pending: { bgcolor: 'rgba(255,217,61,.1)', color: '#ffe566', borderLeft: '2px solid #ffd93d' },
  booked: { bgcolor: 'rgba(216,149,107,.14)', color: mocha.accent, borderLeft: `2px solid ${mocha.accent}` },
  blocked: { bgcolor: 'rgba(255,107,107,.08)', color: '#ff8a8a', borderLeft: '2px solid #ff6b6b' },
}

function bucketByYmd(items: DashboardAppointment[]): Map<string, DashboardAppointment[]> {
  const m = new Map<string, DashboardAppointment[]>()
  for (const a of items) {
    const ymd = toLocalYMD(new Date(a.startsAt))
    const list = m.get(ymd) ?? []
    list.push(a)
    m.set(ymd, list)
  }
  for (const [, list] of m) {
    list.sort((x, y) => new Date(x.startsAt).getTime() - new Date(y.startsAt).getTime())
  }
  return m
}

type Props = {
  matrixDays: Date[]
  items: DashboardAppointment[]
  inMonth: (d: Date) => boolean
  onPickDay: (d: Date) => void
  onEventClick: (a: DashboardAppointment) => void
}

export function CalendarMonthGrid({ matrixDays, items, inMonth, onPickDay, onEventClick }: Props) {
  const bucket = useMemo(() => bucketByYmd(items), [items])

  return (
    <Box sx={{ overflowX: 'auto', borderRadius: 1, border: `1px solid ${mocha.grid}` }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: '1px',
          bgcolor: mocha.grid,
          minWidth: { xs: 320, sm: 560 },
        }}
      >
        {WD.map(w => (
          <Box key={w} sx={{ bgcolor: mocha.gridHeader, py: 1, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: mocha.muted }}>{w}</Typography>
          </Box>
        ))}
        {matrixDays.map(day => {
          const ymd = toLocalYMD(day)
          const list = bucket.get(ymd) ?? []
          const inM = inMonth(day)
          const show = list.slice(0, 3)
          const more = list.length - show.length
          return (
            <Box
              key={ymd}
              onClick={() => {
                if (inM) onPickDay(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12, 0, 0, 0))
              }}
              sx={{
                bgcolor: inM ? mocha.cell : mocha.cellAlt,
                minHeight: { xs: 88, sm: 104 },
                p: 0.5,
                cursor: inM ? 'pointer' : 'default',
                '&:hover': inM ? { bgcolor: 'rgba(255,255,255,0.04)' } : {},
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: inM ? mocha.text : mocha.muted,
                  mb: 0,
                }}
              >
                {day.getDate()}
              </Typography>
              <LoadBar count={inM ? list.length : 0} />
              {show.map(a => {
                const v = appointmentStatusVariant(a.status)
                const t = new Date(a.startsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                return (
                  <Box
                    key={a.id}
                    onClick={e => {
                      e.stopPropagation()
                      onEventClick(a)
                    }}
                    sx={{
                      fontSize: 9,
                      py: 0.25,
                      px: 0.5,
                      borderRadius: '3px',
                      mb: 0.25,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      ...VARIANT_SX[v],
                      '&:hover': { filter: 'brightness(1.08)' },
                    }}
                    title={`${t} ${a.serviceName} · ${a.clientLabel}`}
                  >
                    {t} {a.serviceName}
                  </Box>
                )
              })}
              {more > 0 && (
                <Typography sx={{ fontSize: 9, color: mocha.muted, pl: 0.25 }}>+{more}</Typography>
              )}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
