import { useCallback, useEffect, useState } from 'react'
import { Alert, Box, Button, Grid, LinearProgress, Stack, Typography } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchDashboardAppointments,
  fetchStaffDetail,
  fetchStaffMetrics,
  type DashboardAppointment,
  type DashboardStaffFull,
  type StaffMetrics,
} from '@shared/api/dashboardApi'
import { mocha } from '@pages/dashboard/theme/mocha'
import { StaffFormModal } from '../modals/StaffFormModal'

const ACCENT = mocha.accent
const TEXT = mocha.text
const MUTED = mocha.muted
const GREEN = mocha.green

export function StaffDetailView() {
  const { staffId } = useParams<{ staffId: string }>()
  const navigate = useNavigate()
  const [staff, setStaff] = useState<DashboardStaffFull | null>(null)
  const [metrics, setMetrics] = useState<StaffMetrics | null>(null)
  const [appts, setAppts] = useState<DashboardAppointment[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const load = useCallback(async () => {
    if (!staffId) return
    try {
      setErr(null)
      const today = new Date()
      const from = today.toISOString().slice(0, 10)
      const [st, met, list] = await Promise.all([
        fetchStaffDetail(staffId),
        fetchStaffMetrics(staffId),
        fetchDashboardAppointments({ staffId, pageSize: 20, from }),
      ])
      setStaff(st)
      setMetrics(met)
      const upcoming = list.items.filter(a => new Date(a.startsAt) >= today)
      upcoming.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
      setAppts(upcoming.slice(0, 5))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }, [staffId])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  if (!staffId) return null
  if (err && !staff) return <Alert severity="error">{err}</Alert>
  if (!staff) return <Typography sx={{ color: MUTED }}>Загрузка…</Typography>

  const col = staff.color || ACCENT
  const initials = staff.displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()

  return (
    <Box>
      {err && (
        <Alert sx={{ mb: 2 }} severity="error">
          {err}
        </Alert>
      )}
      <Button sx={{ mb: 2, color: MUTED }} onClick={() => navigate('/dashboard?section=staff')}>
        ← К списку мастеров
      </Button>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'flex-start' }} sx={{ mb: 3 }}>
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            bgcolor: `${col}33`,
            color: col,
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
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: TEXT }}>{staff.displayName}</Typography>
          <Typography sx={{ color: MUTED }}>{[staff.role, staff.level].filter(Boolean).join(' · ') || '—'}</Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
            <Button sx={{ bgcolor: ACCENT, color: mocha.onAccent }} onClick={() => setEditOpen(true)}>
              Редактировать
            </Button>
            <Button
              variant="outlined"
              sx={{ borderColor: mocha.borderLight, color: TEXT }}
              onClick={() => navigate('/dashboard?section=schedule')}
            >
              Расписание
            </Button>
          </Stack>
        </Box>
        {metrics && (
          <Grid container spacing={1} sx={{ maxWidth: 480 }}>
            {[
              { l: 'Рейтинг', v: metrics.rating != null ? `${metrics.rating.toFixed(1)} ★` : '—' },
              { l: 'Визитов', v: String(metrics.totalVisits) },
              { l: 'Выручка/мес', v: metrics.revenueMonthCents ? `${(metrics.revenueMonthCents / 100).toLocaleString('ru-RU')} ₽` : '—' },
              { l: 'Загрузка', v: `${Math.round(metrics.loadPercent)}%` },
            ].map(x => (
              <Grid item xs={6} key={x.l}>
                <Box sx={{ bgcolor: mocha.card, borderRadius: 1, p: 1.5, border: `1px solid ${mocha.borderHairline}` }}>
                  <Typography sx={{ fontSize: 10, color: MUTED, textTransform: 'uppercase' }}>{x.l}</Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 700, color: TEXT }}>{x.v}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>

      {metrics && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, metrics.loadPercent)}
            sx={{ height: 6, borderRadius: 1, bgcolor: mocha.grid, '& .MuiLinearProgress-bar': { bgcolor: GREEN } }}
          />
        </Box>
      )}

      <Stack spacing={2} sx={{ mb: 3 }}>
        <Typography sx={{ color: ACCENT, fontWeight: 600 }}>Контакты</Typography>
        <Typography sx={{ color: TEXT, fontSize: 14 }}>
          {staff.phone || '—'} · {staff.telegramUsername ? `@${staff.telegramUsername}` : '—'} ·{' '}
          {staff.joinedAt ? String(staff.joinedAt).slice(0, 10) : '—'}
        </Typography>
        <Typography sx={{ color: ACCENT, fontWeight: 600 }}>Специализация</Typography>
        <Typography sx={{ color: MUTED, fontSize: 14 }}>{staff.bio || '—'}</Typography>
      </Stack>

      <Typography sx={{ color: ACCENT, fontWeight: 600, mb: 1 }}>Ближайшие записи</Typography>
      <Stack spacing={1}>
        {appts.length === 0 ? (
          <Typography sx={{ color: MUTED }}>Нет предстоящих записей</Typography>
        ) : (
          appts.map(a => (
            <Box key={a.id} sx={{ p: 1.5, bgcolor: mocha.card, borderRadius: 1, border: `1px solid ${mocha.borderHairline}` }}>
              <Typography sx={{ color: TEXT, fontWeight: 600 }}>
                {new Date(a.startsAt).toLocaleString('ru-RU')} — {a.clientLabel}
              </Typography>
              <Typography sx={{ color: MUTED, fontSize: 13 }}>
                {a.serviceName} · {a.status}
              </Typography>
            </Box>
          ))
        )}
      </Stack>

      <StaffFormModal
        open={editOpen}
        staffId={staffId}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false)
          void load()
        }}
      />
    </Box>
  )
}
