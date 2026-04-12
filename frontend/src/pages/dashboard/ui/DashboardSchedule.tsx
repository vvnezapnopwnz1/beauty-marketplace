import { useCallback, useEffect, useState } from 'react'
import { Box, Typography, Button, Stack, TextField, Alert } from '@mui/material'
import { fetchSalonSchedule, putSalonSchedule, type WorkingHourRow } from '@shared/api/dashboardApi'

const LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function DashboardSchedule() {
  const [rows, setRows] = useState<WorkingHourRow[]>([])
  const [local, setLocal] = useState<{ day: number; opens: string; closes: string; closed: boolean }[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchSalonSchedule()
      setRows(data)
      const byDay = new Map(data.map(r => [r.dayOfWeek, r]))
      setLocal(
        LABELS.map((_, day) => {
          const r = byDay.get(day)
          return {
            day,
            opens: r?.opensAt?.slice(0, 5) ?? '10:00',
            closes: r?.closesAt?.slice(0, 5) ?? '18:00',
            closed: r?.isClosed ?? false,
          }
        }),
      )
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  async function save() {
    setMsg(null)
    try {
      await putSalonSchedule(
        local.map(l => ({
          dayOfWeek: l.day,
          opensAt: l.opens + ':00',
          closesAt: l.closes + ':00',
          closed: l.closed,
        })),
      )
      setMsg('Сохранено')
      void load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  return (
    <Box>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
      <Stack spacing={2}>
        {local.map((l, i) => (
          <Stack key={l.day} direction="row" alignItems="center" spacing={2} flexWrap="wrap">
            <Typography sx={{ width: 36, color: '#f0eae3' }}>{LABELS[i]}</Typography>
            <Button size="small" variant={l.closed ? 'contained' : 'outlined'} onClick={() => setLocal(p => p.map(x => (x.day === l.day ? { ...x, closed: !x.closed } : x)))}>
              {l.closed ? 'Выходной' : 'Рабочий'}
            </Button>
            {!l.closed && (
              <>
                <TextField size="small" label="От" type="time" value={l.opens} onChange={e => setLocal(p => p.map(x => (x.day === l.day ? { ...x, opens: e.target.value } : x)))} InputLabelProps={{ shrink: true }} />
                <TextField size="small" label="До" type="time" value={l.closes} onChange={e => setLocal(p => p.map(x => (x.day === l.day ? { ...x, closes: e.target.value } : x)))} InputLabelProps={{ shrink: true }} />
              </>
            )}
          </Stack>
        ))}
      </Stack>
      <Button sx={{ mt: 3, bgcolor: '#D8956B', color: '#1a0e09' }} onClick={() => void save()}>
        Сохранить расписание салона
      </Button>
      <Typography sx={{ mt: 2, fontSize: 12, color: '#a89e94' }}>Записей в БД: {rows.length}</Typography>
    </Box>
  )
}
