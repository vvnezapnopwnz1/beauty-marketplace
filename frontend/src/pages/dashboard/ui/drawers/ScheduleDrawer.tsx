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
            px: 2,
            py: 1.5,
            borderBottom: `1px solid ${d.borderSubtle}`,
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: d.text, pr: 1 }}>
            Расписание — {staffName}
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Закрыть" sx={{ color: d.mutedDark }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 2 }}>
          {err && (
            <Typography sx={{ color: d.red, fontSize: 13, mb: 2 }}>{err}</Typography>
          )}
          {loading ? (
            <Typography sx={{ color: d.muted }}>Загрузка…</Typography>
          ) : (
            <Stack spacing={2.5}>
              {days.map((row, i) => (
                <Box
                  key={row.dayOfWeek}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${d.border}`,
                    bgcolor: d.card,
                  }}
                >
                  <Typography sx={{ fontWeight: 600, color: d.text, mb: 1 }}>
                    {DAY_LABELS[i]}
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={row.isDayOff}
                        onChange={(_, c) => updateDay(i, { isDayOff: c })}
                        size="small"
                        sx={{ color: d.mutedDark }}
                      />
                    }
                    label={<Typography sx={{ fontSize: 14, color: d.text }}>Выходной</Typography>}
                  />
                  {!row.isDayOff && (
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                          label="Начало"
                          type="time"
                          value={row.opensAt}
                          onChange={e => updateDay(i, { opensAt: e.target.value })}
                          size="small"
                          InputLabelProps={{ shrink: true }}
                          sx={{ ...inputBaseSx, flex: 1 }}
                        />
                        <TextField
                          label="Конец"
                          type="time"
                          value={row.closesAt}
                          onChange={e => updateDay(i, { closesAt: e.target.value })}
                          size="small"
                          InputLabelProps={{ shrink: true }}
                          sx={{ ...inputBaseSx, flex: 1 }}
                        />
                      </Stack>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={row.breakEnabled}
                            onChange={(_, c) => updateDay(i, { breakEnabled: c })}
                            size="small"
                            sx={{ color: d.mutedDark }}
                          />
                        }
                        label={<Typography sx={{ fontSize: 14, color: d.text }}>Перерыв</Typography>}
                      />
                      {row.breakEnabled && (
                        <Stack direction="row" spacing={1}>
                          <TextField
                            label="Перерыв с"
                            type="time"
                            value={row.breakStartsAt}
                            onChange={e => updateDay(i, { breakStartsAt: e.target.value })}
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            sx={{ ...inputBaseSx, flex: 1 }}
                          />
                          <TextField
                            label="до"
                            type="time"
                            value={row.breakEndsAt}
                            onChange={e => updateDay(i, { breakEndsAt: e.target.value })}
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            sx={{ ...inputBaseSx, flex: 1 }}
                          />
                        </Stack>
                      )}
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
            gap: 1,
            justifyContent: 'flex-end',
            px: 2,
            py: 1.5,
            borderTop: `1px solid ${d.borderSubtle}`,
          }}
        >
          <Button variant="outlined" onClick={onClose} sx={{ borderColor: d.borderLight, color: d.text }}>
            Отмена
          </Button>
          <Button
            variant="contained"
            disabled={loading || saving || !staffId}
            onClick={() => void handleSave()}
            sx={{ bgcolor: d.accent, color: d.onAccent }}
          >
            Сохранить
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}
