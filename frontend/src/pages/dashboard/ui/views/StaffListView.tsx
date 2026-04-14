import { useCallback, useEffect, useState } from 'react'
import { Alert, Box, Button, Grid, LinearProgress, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import {
  fetchDashboardStaff,
  fetchStaffSchedule,
  type DashboardStaffListItem,
} from '@shared/api/dashboardApi'
import { computeLiveStaffStatus } from '../../lib/staffScheduleDisplay'
import { mocha } from '@pages/dashboard/theme/mocha'
import { StaffFormModal } from '../modals/StaffFormModal'

const ACCENT = mocha.accent
const TEXT = mocha.text
const MUTED = mocha.muted
const GREEN = mocha.green
const YELLOW = mocha.yellow

function initials(name: string): string {
  const p = name.trim().split(/\s+/)
  if (p.length >= 2) return (p[0]![0]! + p[1]![0]!).toUpperCase()
  return name.slice(0, 2).toUpperCase() || '?'
}

function loadBarColor(pct: number): string {
  if (pct >= 70) return GREEN
  if (pct >= 50) return ACCENT
  return mocha.red
}

export function StaffListView() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<DashboardStaffListItem[]>([])
  const [statusByStaff, setStatusByStaff] = useState<Record<string, 'working' | 'break' | 'off'>>(
    {},
  )
  const [err, setErr] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      setErr(null)
      const list = await fetchDashboardStaff()
      setRows(list)
      const st: Record<string, 'working' | 'break' | 'off'> = {}
      await Promise.all(
        list.map(async item => {
          try {
            const bundle = await fetchStaffSchedule(item.staff.id)
            st[item.staff.id] = computeLiveStaffStatus(bundle.rows)
          } catch {
            st[item.staff.id] = 'off'
          }
        }),
      )
      setStatusByStaff(st)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  function statusLabel(s: 'working' | 'break' | 'off'): { text: string; color: string } {
    if (s === 'working') return { text: 'Работает', color: GREEN }
    if (s === 'break') return { text: 'Обед', color: YELLOW }
    return { text: 'Выходной', color: MUTED }
  }

  return (
    <Box>
      {err && (
        <Alert sx={{ mb: 2 }} severity="error">
          {err}
        </Alert>
      )}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ color: MUTED, fontSize: 13 }}>{rows.length} мастеров</Typography>
        <Button sx={{ bgcolor: ACCENT, color: mocha.onAccent }} onClick={() => setModalOpen(true)}>
          + Добавить мастера
        </Button>
      </Stack>
      <Grid container spacing={2}>
        {rows.map(item => {
          const s = item.staff
          const col = s.color || ACCENT
          const st = statusByStaff[s.id] ?? 'off'
          const sl = statusLabel(st)
          const pct = Math.round(item.loadPercentWeek)
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={s.id} sx={{ display: 'flex' }}>
              <Box
                onClick={() => navigate(`/dashboard/staff/${s.id}`)}
                sx={{
                  width: '100%',
                  // height: 338,
                  minWidth: 0,
                  borderRadius: 2,
                  border: `1px solid ${mocha.borderSubtle}`,
                  bgcolor: mocha.card,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: '0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': { borderColor: ACCENT, transform: 'translateY(-2px)' },
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ p: 2, borderBottom: `1px solid ${mocha.borderSubtle}` }}
                  alignItems="center"
                >
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        bgcolor: `${col}33`,
                        color: col,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 18,
                      }}
                    >
                      {initials(s.displayName)}
                    </Box>
                    {st === 'working' && (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 2,
                          right: 2,
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: GREEN,
                          border: `2px solid ${mocha.card}`,
                        }}
                      />
                    )}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ color: TEXT, fontWeight: 600, fontSize: 14 }} noWrap>
                      {s.displayName}
                    </Typography>
                    <Typography sx={{ color: MUTED, fontSize: 12 }} noWrap>
                      {[s.role, s.level].filter(Boolean).join(' · ') || '—'}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: sl.color }}>
                    {sl.text}
                  </Typography>
                </Stack>
                <Box sx={{ px: 2, py: 1.5, flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: MUTED,
                      textTransform: 'uppercase',
                      mb: 1,
                    }}
                  >
                    Услуги
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignContent: 'flex-start',
                      gap: 0.5,
                      minWidth: 0,
                      mb: 1,
                    }}
                  >
                    {item.connectedServices.length === 0 ? (
                      <Typography sx={{ fontSize: 12, color: MUTED }}>—</Typography>
                    ) : (
                      item.connectedServices.map(sv => (
                        <Box
                          key={sv.id}
                          sx={{
                            display: 'inline-flex',
                            px: 1,
                            py: 0.25,
                            borderRadius: '6px',
                            fontSize: 11,
                            bgcolor: mocha.input,
                            color: MUTED,
                            border: `1px solid ${mocha.inputBorder}`,
                          }}
                        >
                          {sv.name}
                        </Box>
                      ))
                    )}
                  </Box>
                  <Box sx={{ mt: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography sx={{ fontSize: 11, color: MUTED }}>Загрузка недели</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 600, color: loadBarColor(pct) }}>
                        {pct}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, pct)}
                      sx={{
                        height: 4,
                        borderRadius: 1,
                        bgcolor: mocha.grid,
                        '& .MuiLinearProgress-bar': { bgcolor: loadBarColor(pct) },
                      }}
                    />
                  </Box>
                </Box>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ p: 2, borderTop: `1px solid ${mocha.borderSubtle}`, mt: 'auto' }}
                  justifyContent="space-around"
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: TEXT }}>
                      {item.ratingAvg != null ? `${item.ratingAvg.toFixed(1)} ★` : '—'}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: MUTED, textTransform: 'uppercase' }}>
                      Рейтинг
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: TEXT }}>
                      {item.completedVisits}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: MUTED, textTransform: 'uppercase' }}>
                      Визитов
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: TEXT }}>
                      {item.revenueMonthCents > 0
                        ? `${(item.revenueMonthCents / 100).toLocaleString('ru-RU')} ₽`
                        : '—'}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: MUTED, textTransform: 'uppercase' }}>
                      Выручка/мес
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Grid>
          )
        })}
      </Grid>

      <StaffFormModal
        open={modalOpen}
        staffId={null}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false)
          void load()
        }}
      />
    </Box>
  )
}
