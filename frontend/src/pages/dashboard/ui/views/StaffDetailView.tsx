import { useCallback, useEffect, useState } from 'react'
import { Alert, Box, Button, LinearProgress, Stack, Typography, useTheme } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchDashboardAppointments,
  fetchStaffDetail,
  fetchStaffMetrics,
  type DashboardAppointment,
  type DashboardStaffFull,
  type StaffMetrics,
} from '@shared/api/dashboardApi'
import { StaffFormModal } from '../modals/StaffFormModal'

export function StaffDetailView() {
  const { staffId } = useParams<{ staffId: string }>()
  const navigate = useNavigate()
  const theme = useTheme()
  const dashboard = theme.palette.dashboard
  const isLight = theme.palette.mode === 'light'
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
  if (!staff) return <Typography sx={{ color: dashboard.muted }}>Загрузка…</Typography>

  const col = staff.color || dashboard.accent
  const nameColor = isLight ? '#120F0D' : dashboard.text
  const cardText = isLight ? '#1A1612' : dashboard.text
  const cardMutedText = isLight ? '#5C5550' : dashboard.mutedDark
  const baseMutedText = isLight ? '#5C5550' : dashboard.muted
  const cardBg = isLight ? '#F2ECE5' : dashboard.card
  const cardBorder = isLight ? dashboard.borderLight : dashboard.borderHairline
  const cardShadow = isLight ? '0 2px 10px rgba(26,22,18,0.08)' : 'none'
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
      <Button sx={{ mb: 2, color: baseMutedText }} onClick={() => navigate('/dashboard?section=staff')}>
        ← К списку мастеров
      </Button>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        alignItems={{ md: 'flex-start' }}
        sx={{ mb: 3 }}
      >
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
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: nameColor }}>
            {staff.displayName}
          </Typography>
          <Typography sx={{ color: baseMutedText }}>
            {[staff.role, staff.level].filter(Boolean).join(' · ') || '—'}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
            <Button
              sx={{ bgcolor: dashboard.accent, color: dashboard.onAccent }}
              onClick={() => setEditOpen(true)}
            >
              Редактировать
            </Button>
            <Button
              variant="outlined"
              sx={{ borderColor: dashboard.borderLight, color: dashboard.text }}
              onClick={() => navigate('/dashboard?section=schedule')}
            >
              Расписание
            </Button>
          </Stack>
        </Box>
        {metrics && (
          <Box
            sx={{
              maxWidth: 480,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 1,
            }}
          >
            {[
              { l: 'Рейтинг', v: metrics.rating != null ? `${metrics.rating.toFixed(1)} ★` : '—' },
              { l: 'Визитов', v: String(metrics.totalVisits) },
              {
                l: 'Выручка/мес',
                v: metrics.revenueMonthCents
                  ? `${(metrics.revenueMonthCents / 100).toLocaleString('ru-RU')} ₽`
                  : '—',
              },
              { l: 'Загрузка', v: `${Math.round(metrics.loadPercent)}%` },
            ].map(x => (
              <Box key={x.l}>
                <Box
                  sx={{
                    bgcolor: cardBg,
                    borderRadius: 1,
                    p: 1.5,
                    border: `1px solid ${cardBorder}`,
                    boxShadow: cardShadow,
                  }}
                >
                  <Typography sx={{ fontSize: 10, color: cardMutedText, textTransform: 'uppercase' }}>
                    {x.l}
                  </Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 700, color: cardText }}>{x.v}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Stack>

      {metrics && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, metrics.loadPercent)}
            sx={{
              height: 6,
              borderRadius: 1,
              bgcolor: dashboard.grid,
              '& .MuiLinearProgress-bar': { bgcolor: dashboard.green },
            }}
          />
        </Box>
      )}

      <Stack spacing={2} sx={{ mb: 3 }}>
        <Typography sx={{ color: dashboard.accent, fontWeight: 600 }}>Контакты</Typography>
        <Typography sx={{ color: dashboard.text, fontSize: 14 }}>
          {staff.phone || '—'} · {staff.telegramUsername ? `@${staff.telegramUsername}` : '—'} ·{' '}
          {staff.joinedAt ? String(staff.joinedAt).slice(0, 10) : '—'}
        </Typography>
        <Typography sx={{ color: dashboard.accent, fontWeight: 600 }}>Специализация</Typography>
        <Typography sx={{ color: baseMutedText, fontSize: 14 }}>{staff.bio || '—'}</Typography>
      </Stack>

      <Typography sx={{ color: dashboard.accent, fontWeight: 600, mb: 1 }}>Ближайшие записи</Typography>
      <Stack spacing={1}>
        {appts.length === 0 ? (
          <Typography sx={{ color: baseMutedText }}>Нет предстоящих записей</Typography>
        ) : (
          appts.map(a => (
            <Box
              key={a.id}
              sx={{
                p: 1.5,
                bgcolor: cardBg,
                borderRadius: 1,
                border: `1px solid ${cardBorder}`,
                boxShadow: cardShadow,
              }}
            >
              <Typography sx={{ color: cardText, fontWeight: 600 }}>
                {new Date(a.startsAt).toLocaleString('ru-RU')} — {a.clientLabel}
              </Typography>
              <Typography sx={{ color: cardMutedText, fontSize: 13 }}>
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
