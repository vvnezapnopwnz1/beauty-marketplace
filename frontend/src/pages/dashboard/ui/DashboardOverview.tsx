import { useCallback, useEffect, useState } from 'react'
import { Box, Typography, Stack, Button, Alert, CircularProgress, useTheme } from '@mui/material'
import {
  fetchDashboardStats,
  fetchDashboardAppointments,
  patchAppointmentStatus,
  type DashboardStats,
  type DashboardAppointment,
} from '@shared/api/dashboardApi'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function DashboardOverview() {
  const theme = useTheme()
  const dashboard = theme.palette.dashboard
  const isLight = theme.palette.mode === 'light'
  const titleColor = isLight ? '#1A1612' : dashboard.text
  const mutedColor = isLight ? '#5C5550' : dashboard.muted
  const cardBg = isLight ? '#F2ECE5' : dashboard.card
  const cardBorder = isLight ? dashboard.borderLight : dashboard.borderSubtle
  const cardShadow = isLight ? '0 2px 10px rgba(26,22,18,0.08)' : 'none'
  const rowBorder = isLight ? dashboard.borderLight : dashboard.borderHairline
  const actionOutlineColor = isLight ? '#C4703F' : dashboard.yellow

  const cardSx = {
    bgcolor: cardBg,
    border: `1px solid ${cardBorder}`,
    borderRadius: '14px',
    boxShadow: cardShadow,
    p: 2.5,
  }

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [today, setToday] = useState<DashboardAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const d = todayISO()
      const [st, ap] = await Promise.all([
        fetchDashboardStats('week'),
        fetchDashboardAppointments({ from: d, to: d, pageSize: 50 }),
      ])
      setStats(st)
      setToday(ap.items)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  async function quickConfirm(id: string) {
    try {
      await patchAppointmentStatus(id, 'confirmed')
      void load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: dashboard.accent }} />
      </Box>
    )
  }

  return (
    <Box>
      {err && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: dashboard.errorBg, color: dashboard.text }}>
          {err}
        </Alert>
      )}

      <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
        <Box sx={{ ...cardSx, flex: '1 1 200px', minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, color: mutedColor }}>Записей сегодня</Typography>
          <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 32, color: titleColor, fontWeight: 500 }}>
            {stats?.appointmentsToday ?? 0}
          </Typography>
          <Typography sx={{ fontSize: 12, color: dashboard.green }}>
            подтверждено: {stats?.appointmentsTodayConfirmed ?? 0}
          </Typography>
        </Box>
        <Box sx={{ ...cardSx, flex: '1 1 200px', minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, color: mutedColor }}>Новых за 7 дней</Typography>
          <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 32, color: titleColor, fontWeight: 500 }}>
            {stats?.newAppointmentsWeek ?? 0}
          </Typography>
          <Typography sx={{ fontSize: 12, color: stats && stats.weekChangePct >= 0 ? dashboard.green : dashboard.red }}>
            {stats ? `${stats.weekChangePct >= 0 ? '+' : ''}${stats.weekChangePct.toFixed(0)}% к прошлой неделе` : '—'}
          </Typography>
        </Box>
        <Box sx={{ ...cardSx, flex: '1 1 200px', minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, color: mutedColor }}>Загрузка (подтв./все сегодня)</Typography>
          <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 32, color: titleColor, fontWeight: 500 }}>
            {stats ? `${stats.loadPct.toFixed(0)}%` : '0%'}
          </Typography>
        </Box>
        <Box sx={{ ...cardSx, flex: '1 1 200px', minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, color: mutedColor }}>Рейтинг</Typography>
          <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 32, color: titleColor, fontWeight: 500 }}>
            {stats ? stats.rating.toFixed(1) : '—'}
          </Typography>
          <Typography sx={{ fontSize: 12, color: mutedColor }}>{stats?.reviewCount ?? 0} отзывов</Typography>
        </Box>
      </Stack>

      <Typography sx={{ fontSize: 13, fontWeight: 600, color: titleColor, mb: 1.5 }}>Быстрые действия</Typography>
      <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          size="small"
          sx={{ borderColor: actionOutlineColor, color: actionOutlineColor, borderRadius: 100 }}
          onClick={() => void load()}
        >
          Обновить данные
        </Button>
        <Typography sx={{ fontSize: 12, color: mutedColor, alignSelf: 'center' }}>
          Ожидают: {stats?.pendingCount ?? 0}
        </Typography>
      </Stack>

      <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: titleColor, mb: 2 }}>Сегодня</Typography>
      <Box sx={{ ...cardSx, p: 0, overflow: 'hidden' }}>
        {today.length === 0 ? (
          <Typography sx={{ p: 3, color: mutedColor }}>Нет записей на сегодня</Typography>
        ) : (
          today.map((a, i) => (
            <Box
              key={a.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr auto auto',
                gap: 1,
                alignItems: 'center',
                px: 2,
                py: 1.5,
                borderTop: i ? `1px solid ${rowBorder}` : undefined,
              }}
            >
              <Typography sx={{ color: titleColor, fontSize: 14 }}>{a.clientLabel}</Typography>
              <Typography sx={{ color: mutedColor, fontSize: 13 }}>{a.serviceName}</Typography>
              <Typography sx={{ color: mutedColor, fontSize: 12 }}>
                {new Date(a.startsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </Typography>
              <Stack direction="row" gap={0.5}>
                {a.status === 'pending' && (
                  <Button size="small" sx={{ color: dashboard.green, fontSize: 11 }} onClick={() => void quickConfirm(a.id)}>
                    Подтвердить
                  </Button>
                )}
                <Typography sx={{ fontSize: 11, color: statusColor(a.status, dashboard), textTransform: 'uppercase' }}>
                  {a.status}
                </Typography>
              </Stack>
            </Box>
          ))
        )}
      </Box>
    </Box>
  )
}

function statusColor(s: string, dashboard: { green: string; yellow: string; red: string; muted: string }) {
  if (s === 'confirmed') return dashboard.green
  if (s === 'pending') return dashboard.yellow
  if (s.startsWith('cancelled')) return dashboard.red
  return dashboard.muted
}
