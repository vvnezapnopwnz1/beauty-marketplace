import { useCallback, useEffect, useState } from 'react'
import { Box, Typography, Stack, Button, Alert, CircularProgress } from '@mui/material'
import {
  fetchDashboardStats,
  fetchDashboardAppointments,
  patchAppointmentStatus,
  type DashboardStats,
  type DashboardAppointment,
} from '@shared/api/dashboardApi'
import { mocha } from '@pages/dashboard/theme/mocha'

const CARD = {
  bgcolor: mocha.card,
  border: `1px solid ${mocha.borderSubtle}`,
  borderRadius: '14px',
  p: 2.5,
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function DashboardOverview() {
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
        <CircularProgress sx={{ color: mocha.accent }} />
      </Box>
    )
  }

  return (
    <Box>
      {err && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: mocha.errorBg, color: mocha.text }}>
          {err}
        </Alert>
      )}

      <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
        <Box sx={{ ...CARD, flex: '1 1 200px', minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, color: mocha.muted }}>Записей сегодня</Typography>
          <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 32, color: mocha.text, fontWeight: 500 }}>
            {stats?.appointmentsToday ?? 0}
          </Typography>
          <Typography sx={{ fontSize: 12, color: mocha.green }}>
            подтверждено: {stats?.appointmentsTodayConfirmed ?? 0}
          </Typography>
        </Box>
        <Box sx={{ ...CARD, flex: '1 1 200px', minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, color: mocha.muted }}>Новых за 7 дней</Typography>
          <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 32, color: mocha.text, fontWeight: 500 }}>
            {stats?.newAppointmentsWeek ?? 0}
          </Typography>
          <Typography sx={{ fontSize: 12, color: stats && stats.weekChangePct >= 0 ? mocha.green : mocha.red }}>
            {stats ? `${stats.weekChangePct >= 0 ? '+' : ''}${stats.weekChangePct.toFixed(0)}% к прошлой неделе` : '—'}
          </Typography>
        </Box>
        <Box sx={{ ...CARD, flex: '1 1 200px', minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, color: mocha.muted }}>Загрузка (подтв./все сегодня)</Typography>
          <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 32, color: mocha.text, fontWeight: 500 }}>
            {stats ? `${stats.loadPct.toFixed(0)}%` : '0%'}
          </Typography>
        </Box>
        <Box sx={{ ...CARD, flex: '1 1 200px', minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, color: mocha.muted }}>Рейтинг</Typography>
          <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 32, color: mocha.text, fontWeight: 500 }}>
            {stats ? stats.rating.toFixed(1) : '—'}
          </Typography>
          <Typography sx={{ fontSize: 12, color: mocha.muted }}>{stats?.reviewCount ?? 0} отзывов</Typography>
        </Box>
      </Stack>

      <Typography sx={{ fontSize: 13, fontWeight: 600, color: mocha.text, mb: 1.5 }}>Быстрые действия</Typography>
      <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          size="small"
          sx={{ borderColor: mocha.yellow, color: mocha.yellow, borderRadius: 100 }}
          onClick={() => void load()}
        >
          Обновить данные
        </Button>
        <Typography sx={{ fontSize: 12, color: mocha.muted, alignSelf: 'center' }}>
          Ожидают: {stats?.pendingCount ?? 0}
        </Typography>
      </Stack>

      <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: mocha.text, mb: 2 }}>Сегодня</Typography>
      <Box sx={{ ...CARD, p: 0, overflow: 'hidden' }}>
        {today.length === 0 ? (
          <Typography sx={{ p: 3, color: mocha.muted }}>Нет записей на сегодня</Typography>
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
                borderTop: i ? `1px solid ${mocha.borderHairline}` : undefined,
              }}
            >
              <Typography sx={{ color: mocha.text, fontSize: 14 }}>{a.clientLabel}</Typography>
              <Typography sx={{ color: mocha.muted, fontSize: 13 }}>{a.serviceName}</Typography>
              <Typography sx={{ color: mocha.muted, fontSize: 12 }}>
                {new Date(a.startsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </Typography>
              <Stack direction="row" gap={0.5}>
                {a.status === 'pending' && (
                  <Button size="small" sx={{ color: mocha.green, fontSize: 11 }} onClick={() => void quickConfirm(a.id)}>
                    Подтвердить
                  </Button>
                )}
                <Typography sx={{ fontSize: 11, color: statusColor(a.status), textTransform: 'uppercase' }}>
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

function statusColor(s: string) {
  if (s === 'confirmed') return mocha.green
  if (s === 'pending') return mocha.yellow
  if (s.startsWith('cancelled')) return mocha.red
  return mocha.muted
}
