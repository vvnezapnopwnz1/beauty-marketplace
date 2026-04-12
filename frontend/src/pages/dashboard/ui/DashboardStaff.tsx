import { useCallback, useEffect, useState } from 'react'
import { Box, Typography, Button, Stack, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from '@mui/material'
import {
  fetchDashboardStaff,
  createDashboardStaff,
  updateDashboardStaff,
  deleteDashboardStaff,
  putStaffSchedule,
  type DashboardStaffRow,
} from '@shared/api/dashboardApi'

export function DashboardStaff() {
  const [rows, setRows] = useState<DashboardStaffRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [schedStaff, setSchedStaff] = useState<DashboardStaffRow | null>(null)

  const load = useCallback(async () => {
    try {
      setRows(await fetchDashboardStaff())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  async function add() {
    try {
      await createDashboardStaff(name)
      setName('')
      setOpen(false)
      void load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  async function saveDefaultSchedule() {
    if (!schedStaff) return
    const payload = Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      opensAt: '10:00',
      closesAt: '18:00',
      isDayOff: false,
    }))
    try {
      await putStaffSchedule(schedStaff.id, payload)
      setSchedStaff(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  return (
    <Box>
      {err && <Alert sx={{ mb: 2 }} severity="error">{err}</Alert>}
      <Button sx={{ mb: 2, bgcolor: '#D8956B', color: '#1a0e09' }} onClick={() => setOpen(true)}>
        Добавить мастера
      </Button>
      <Stack direction="row" flexWrap="wrap" gap={2}>
        {rows.map(s => (
          <Box
            key={s.id}
            sx={{
              width: 220,
              p: 2,
              bgcolor: '#222',
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Typography sx={{ color: '#f0eae3', fontWeight: 600 }}>{s.displayName}</Typography>
            <Typography sx={{ color: '#a89e94', fontSize: 12 }}>{s.isActive ? 'активен' : 'неактивен'}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
              <Button size="small" onClick={() => setSchedStaff(s)}>
                Часы 10–18
              </Button>
              <Button
                size="small"
                onClick={() => void updateDashboardStaff(s.id, s.displayName, !s.isActive).then(load)}
              >
                {s.isActive ? 'Выкл' : 'Вкл'}
              </Button>
              <Button
                size="small"
                color="error"
                onClick={() => {
                  if (confirm('Деактивировать мастера?')) void deleteDashboardStaff(s.id).then(load)
                }}
              >
                Удалить
              </Button>
            </Stack>
          </Box>
        ))}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Новый мастер</DialogTitle>
        <DialogContent>
          <TextField label="Имя" fullWidth value={name} onChange={e => setName(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Отмена</Button>
          <Button onClick={() => void add()}>Создать</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(schedStaff)} onClose={() => setSchedStaff(null)}>
        <DialogTitle>Расписание {schedStaff?.displayName}</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#a89e94' }}>Установить для всех дней недели 10:00–18:00 (без выходных).</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSchedStaff(null)}>Отмена</Button>
          <Button onClick={() => void saveDefaultSchedule()}>Сохранить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
