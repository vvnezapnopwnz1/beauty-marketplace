import { useCallback, useEffect, useState } from 'react'
import { Alert, Box, Button, Grid, LinearProgress, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import {
  fetchDashboardStaff,
  fetchStaffSchedule,
  type DashboardStaffListItem,
} from '@shared/api/dashboardApi'
import { computeLiveStaffStatus } from '../../lib/staffScheduleDisplay'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import type { DashboardPalette } from '@shared/theme'
import { StaffFormModal } from '../modals/StaffFormModal'

function initials(name: string): string {
  const p = name.trim().split(/\s+/)
  if (p.length >= 2) return (p[0]![0]! + p[1]![0]!).toUpperCase()
  return name.slice(0, 2).toUpperCase() || '?'
}

function loadBarColor(pct: number, d: DashboardPalette): string {
  if (pct >= 70) return d.green
  if (pct >= 50) return d.accent
  return d.red
}

export function StaffListView() {
  const d = useDashboardPalette()
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
    if (s === 'working') return { text: 'Работает', color: d.green }
    if (s === 'break') return { text: 'Обед', color: d.yellow }
    return { text: 'Выходной', color: d.mutedDark }
  }

  return (
    <Box>
      {err && (
        <Alert sx={{ mb: 2 }} severity="error">
          {err}
        </Alert>
      )}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ color: d.mutedDark, fontSize: 13 }}>{rows.length} мастеров</Typography>
        <Button sx={{ bgcolor: d.accent, color: d.onAccent }} onClick={() => setModalOpen(true)}>
          + Добавить мастера
        </Button>
      </Stack>
      <Grid container spacing={2}>
        {rows.map(item => {
          const s = item.staff
          const col = s.color || d.accent
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
                  border: `1px solid ${d.borderSubtle}`,
                  bgcolor: d.card,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: '0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': { borderColor: d.accent, transform: 'translateY(-2px)' },
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ p: 2, borderBottom: `1px solid ${d.borderSubtle}` }}
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
                          bgcolor: d.green,
                          border: `2px solid ${d.card}`,
                        }}
                      />
                    )}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ color: d.text, fontWeight: 600, fontSize: 14 }} noWrap>
                      {s.displayName}
                    </Typography>
                    <Typography sx={{ color: d.mutedDark, fontSize: 12 }} noWrap>
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
                      color: d.mutedDark,
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
                      <Typography sx={{ fontSize: 12, color: d.mutedDark }}>—</Typography>
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
                            bgcolor: d.input,
                            color: d.mutedDark,
                            border: `1px solid ${d.inputBorder}`,
                          }}
                        >
                          {sv.name}
                        </Box>
                      ))
                    )}
                  </Box>
                  <Box sx={{ mt: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography sx={{ fontSize: 11, color: d.mutedDark }}>Загрузка недели</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 600, color: loadBarColor(pct, d) }}>
                        {pct}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, pct)}
                      sx={{
                        height: 4,
                        borderRadius: 1,
                        bgcolor: d.grid,
                        '& .MuiLinearProgress-bar': { bgcolor: loadBarColor(pct, d) },
                      }}
                    />
                  </Box>
                </Box>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ p: 2, borderTop: `1px solid ${d.borderSubtle}`, mt: 'auto' }}
                  justifyContent="space-around"
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: d.text }}>
                      {item.ratingAvg != null ? `${item.ratingAvg.toFixed(1)} ★` : '—'}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: d.mutedDark, textTransform: 'uppercase' }}>
                      Рейтинг
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: d.text }}>
                      {item.completedVisits}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: d.mutedDark, textTransform: 'uppercase' }}>
                      Визитов
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: d.text }}>
                      {item.revenueMonthCents > 0
                        ? `${(item.revenueMonthCents / 100).toLocaleString('ru-RU')} ₽`
                        : '—'}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: d.mutedDark, textTransform: 'uppercase' }}>
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
