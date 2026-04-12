import { useCallback, useEffect, useState } from 'react'
import { Box, Typography, Stack, ToggleButton, ToggleButtonGroup, Button, Alert } from '@mui/material'
import { fetchDashboardAppointments, type DashboardAppointment } from '@shared/api/dashboardApi'

function startOfWeek(d: Date) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function DashboardCalendar() {
  const [mode, setMode] = useState<'week' | 'day'>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [items, setItems] = useState<DashboardAppointment[]>([])
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    let from: Date
    let to: Date
    if (mode === 'day') {
      from = new Date(anchor)
      from.setHours(0, 0, 0, 0)
      to = new Date(from)
      to.setDate(to.getDate() + 1)
    } else {
      from = startOfWeek(anchor)
      to = new Date(from)
      to.setDate(to.getDate() + 7)
    }
    try {
      const res = await fetchDashboardAppointments({ from: toYMD(from), to: toYMD(to), pageSize: 200 })
      setItems(res.items)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }, [anchor, mode])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  return (
    <Box>
      {err && <Alert sx={{ mb: 2 }} severity="error">{err}</Alert>}
      <Stack direction="row" flexWrap="wrap" gap={2} alignItems="center" sx={{ mb: 2 }}>
        <ToggleButtonGroup value={mode} exclusive onChange={(_, v) => v && setMode(v)} size="small" sx={{ '& .MuiToggleButton-root': { color: '#f0eae3' } }}>
          <ToggleButton value="day">День</ToggleButton>
          <ToggleButton value="week">Неделя</ToggleButton>
        </ToggleButtonGroup>
        <Button size="small" onClick={() => setAnchor(d => new Date(d.getTime() - (mode === 'day' ? 864e5 : 7 * 864e5)))}>
          ←
        </Button>
        <Button size="small" onClick={() => setAnchor(new Date())}>
          Сегодня
        </Button>
        <Button size="small" onClick={() => setAnchor(d => new Date(d.getTime() + (mode === 'day' ? 864e5 : 7 * 864e5)))}>
          →
        </Button>
      </Stack>
      <Typography sx={{ color: '#a89e94', mb: 2 }}>
        {mode === 'day' ? toYMD(anchor) : `${toYMD(startOfWeek(anchor))} — …`}
      </Typography>
      <Stack spacing={1}>
        {items.length === 0 ? (
          <Typography sx={{ color: '#a89e94' }}>Нет записей в диапазоне</Typography>
        ) : (
          items.map(a => (
            <Box key={a.id} sx={{ p: 1.5, bgcolor: '#222', borderRadius: 1, border: '1px solid rgba(255,255,255,0.06)' }}>
              <Typography sx={{ color: '#f0eae3', fontSize: 14 }}>
                {new Date(a.startsAt).toLocaleString('ru-RU')} — {a.clientLabel} — {a.serviceName}{' '}
                <Box component="span" sx={{ color: '#D8956B', fontSize: 12 }}>{a.status}</Box>
              </Typography>
            </Box>
          ))
        )}
      </Stack>
    </Box>
  )
}
