import { useCallback, useEffect, useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  Drawer,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import {
  fetchStaffSchedule,
  putStaffScheduleBundle,
  type StaffWorkingHourRow,
} from '@shared/api/dashboardApi'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { useDashboardFormStyles } from '@pages/dashboard/theme/formStyles'

const DAY_LABELS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

function toHHMM(t: string | undefined | null): string {
  if (!t) return '10:00'
  const m = t.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return '10:00'
  return `${m[1]!.padStart(2, '0')}:${m[2]}`
}

type DayDraft = {
  dayOfWeek: number
  isDayOff: boolean
  opensAt: string
  closesAt: string
  breakEnabled: boolean
  breakStartsAt: string
  breakEndsAt: string
}

function rowsToDrafts(rows: StaffWorkingHourRow[]): DayDraft[] {
  const byDay = new Map<number, StaffWorkingHourRow>()
  for (const r of rows) {
    byDay.set(r.dayOfWeek, r)
  }
  const out: DayDraft[] = []
  for (let d = 0; d <= 6; d++) {
    const r = byDay.get(d)
    if (r) {
      const br = r.breakStartsAt && r.breakEndsAt
      out.push({
        dayOfWeek: d,
        isDayOff: r.isDayOff,
        opensAt: toHHMM(r.opensAt),
        closesAt: toHHMM(r.closesAt),
        breakEnabled: Boolean(br),
        breakStartsAt: r.breakStartsAt ? toHHMM(r.breakStartsAt) : '13:00',
        breakEndsAt: r.breakEndsAt ? toHHMM(r.breakEndsAt) : '14:00',
      })
    } else {
      out.push({
        dayOfWeek: d,
        isDayOff: true,
        opensAt: '10:00',
        closesAt: '18:00',
        breakEnabled: false,
        breakStartsAt: '13:00',
        breakEndsAt: '14:00',
      })
    }
  }
  return out
}

function timeToApi(s: string): string {
  const [h, m] = s.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '10:00:00'
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

export type ScheduleDrawerProps = {
  open: boolean
  staffId: string | null
  staffName: string
  onClose: () => void
  onSaved: () => void
}

export function ScheduleDrawer({ open, staffId, staffName, onClose, onSaved }: ScheduleDrawerProps) {
  const d = useDashboardPalette()
  const { inputBaseSx } = useDashboardFormStyles()
  const [days, setDays] = useState<DayDraft[]>(() => rowsToDrafts([]))
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!staffId) return
    setErr(null)
    setLoading(true)
    try {
      const bundle = await fetchStaffSchedule(staffId)
      setDays(rowsToDrafts(bundle.rows))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [staffId])

  useEffect(() => {
    if (open && staffId) void load()
  }, [open, staffId, load])

  async function handleSave() {
    if (!staffId) return
    for (const x of days) {
      if (!x.isDayOff && x.breakEnabled) {
        if (!x.breakStartsAt || !x.breakEndsAt) {
          setErr('Укажите время перерыва или снимите «Перерыв»')
          return
        }
      }
    }
    setErr(null)
    setSaving(true)
    try {
      await putStaffScheduleBundle(staffId, {
        rows: days.map(x => ({
          dayOfWeek: x.dayOfWeek,
          isDayOff: x.isDayOff,
          opensAt: x.isDayOff ? '10:00:00' : timeToApi(x.opensAt),
          closesAt: x.isDayOff ? '18:00:00' : timeToApi(x.closesAt),
          breakStartsAt:
            !x.isDayOff && x.breakEnabled ? timeToApi(x.breakStartsAt) : null,
          breakEndsAt: !x.isDayOff && x.breakEnabled ? timeToApi(x.breakEndsAt) : null,
        })),
      })
      onSaved()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  function updateDay(i: number, patch: Partial<DayDraft>) {
    setDays(prev => prev.map((row, j) => (j === i ? { ...row, ...patch } : row)))
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ backdrop: { sx: { bgcolor: d.backdrop, backdropFilter: 'blur(4px)' } } }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: '440px' },
          maxWidth: '100%',
          bgcolor: d.page,
          borderLeft: `1px solid ${d.border}`,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 2,
            borderBottom: `1px solid ${d.borderSubtle}`,
            bgcolor: d.card,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: d.text, lineHeight: 1.2 }}>
              Расписание
            </Typography>
            <Typography sx={{ fontSize: 12, color: d.mutedDark }}>
              {staffName}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label="Закрыть" sx={{ color: d.mutedDark, bgcolor: d.control, '&:hover': { bgcolor: d.controlHover } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 3 }}>
          {err && (
            <Box sx={{ bgcolor: `${d.red}15`, color: d.red, px: 2, py: 1.5, borderRadius: '12px', fontSize: 13, border: `1px solid ${d.red}30`, mb: 2 }}>
              {err}
            </Box>
          )}
          {loading ? (
            <Typography sx={{ color: d.muted, textAlign: 'center', py: 4 }}>Загрузка…</Typography>
          ) : (
            <Stack spacing={2}>
              {days.map((row, i) => (
                <Box
                  key={row.dayOfWeek}
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    border: `1px solid ${d.borderSubtle}`,
                    bgcolor: d.card,
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: d.borderLight, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontWeight: 700, color: d.text, fontSize: 15 }}>
                      {DAY_LABELS[i]}
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={row.isDayOff}
                          onChange={(_, c) => updateDay(i, { isDayOff: c })}
                          size="small"
                          sx={{ color: d.mutedDark, '&.Mui-checked': { color: d.accent } }}
                        />
                      }
                      label={<Typography sx={{ fontSize: 13, fontWeight: 500, color: d.mutedDark }}>Выходной</Typography>}
                      sx={{ m: 0 }}
                    />
                  </Stack>

                  {!row.isDayOff && (
                    <Stack spacing={2} sx={{ mt: 1 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: 11, color: d.mutedDark, mb: 0.5, ml: 0.5 }}>НАЧАЛО</Typography>
                          <TextField
                            type="time"
                            value={row.opensAt}
                            onChange={e => updateDay(i, { opensAt: e.target.value })}
                            size="small"
                            fullWidth
                            sx={inputBaseSx}
                          />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: 11, color: d.mutedDark, mb: 0.5, ml: 0.5 }}>КОНЕЦ</Typography>
                          <TextField
                            type="time"
                            value={row.closesAt}
                            onChange={e => updateDay(i, { closesAt: e.target.value })}
                            size="small"
                            fullWidth
                            sx={inputBaseSx}
                          />
                        </Box>
                      </Stack>
                      
                      <Box>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={row.breakEnabled}
                              onChange={(_, c) => updateDay(i, { breakEnabled: c })}
                              size="small"
                              sx={{ color: d.mutedDark, '&.Mui-checked': { color: d.accent } }}
                            />
                          }
                          label={<Typography sx={{ fontSize: 13, fontWeight: 500, color: d.text }}>Обеденный перерыв</Typography>}
                        />
                        {row.breakEnabled && (
                          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography sx={{ fontSize: 11, color: d.mutedDark, mb: 0.5, ml: 0.5 }}>С</Typography>
                              <TextField
                                type="time"
                                value={row.breakStartsAt}
                                onChange={e => updateDay(i, { breakStartsAt: e.target.value })}
                                size="small"
                                fullWidth
                                sx={inputBaseSx}
                              />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography sx={{ fontSize: 11, color: d.mutedDark, mb: 0.5, ml: 0.5 }}>ДО</Typography>
                              <TextField
                                type="time"
                                value={row.breakEndsAt}
                                onChange={e => updateDay(i, { breakEndsAt: e.target.value })}
                                size="small"
                                fullWidth
                                sx={inputBaseSx}
                              />
                            </Box>
                          </Stack>
                        )}
                      </Box>
                    </Stack>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            px: 3,
            py: 3,
            borderTop: `1px solid ${d.borderSubtle}`,
            bgcolor: d.card,
          }}
        >
          <Button
            variant="contained"
            fullWidth
            disabled={loading || saving || !staffId}
            onClick={() => void handleSave()}
            sx={{
              bgcolor: d.accent,
              color: d.onAccent,
              py: 1.5,
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: 15,
              textTransform: 'none',
              boxShadow: `0 4px 14px ${d.accent}40`,
              '&:hover': {
                bgcolor: d.accent,
                boxShadow: `0 6px 20px ${d.accent}60`,
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s',
            }}
          >
            {saving ? 'Сохранение...' : 'Сохранить расписание'}
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={onClose}
            sx={{
              borderColor: d.borderLight,
              color: d.text,
              py: 1.25,
              borderRadius: '12px',
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            Отмена
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}
