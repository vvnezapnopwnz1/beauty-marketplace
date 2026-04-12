import { useCallback, useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  MenuItem,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material'
import {
  fetchDashboardAppointments,
  patchAppointmentStatus,
  createDashboardAppointment,
  fetchDashboardServices,
  fetchDashboardStaff,
  type DashboardAppointment,
  type DashboardServiceRow,
  type DashboardStaffRow,
} from '@shared/api/dashboardApi'

export function DashboardAppointments() {
  const [items, setItems] = useState<DashboardAppointment[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [services, setServices] = useState<DashboardServiceRow[]>([])
  const [staff, setStaff] = useState<DashboardStaffRow[]>([])
  const [form, setForm] = useState({
    serviceId: '',
    staffId: '',
    startsAt: '',
    guestName: '',
    guestPhone: '',
  })

  const load = useCallback(async () => {
    setErr(null)
    try {
      const res = await fetchDashboardAppointments({
        status: status || undefined,
        pageSize: 50,
      })
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }, [status])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const [s, st] = await Promise.all([fetchDashboardServices(), fetchDashboardStaff()])
          setServices(s.filter(x => x.isActive))
          setStaff(st.filter(x => x.isActive))
          setForm(f => (f.serviceId ? f : { ...f, serviceId: s[0]?.id ?? '' }))
        } catch {
          /* ignore */
        }
      })()
    }, 0)
    return () => window.clearTimeout(t)
  }, [])

  async function setApptStatus(id: string, s: string) {
    try {
      await patchAppointmentStatus(id, s)
      void load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  async function submitCreate() {
    try {
      await createDashboardAppointment({
        serviceId: form.serviceId,
        staffId: form.staffId || null,
        startsAt: new Date(form.startsAt).toISOString(),
        guestName: form.guestName,
        guestPhone: form.guestPhone,
      })
      setModal(false)
      void load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  return (
    <Box>
      {err && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: '#2a1a1a', color: '#f0eae3' }}>
          {err}
        </Alert>
      )}
      <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 2 }} alignItems="center">
        <TextField
          select
          size="small"
          label="Статус"
          value={status}
          onChange={e => setStatus(e.target.value)}
          sx={{ minWidth: 160, '& .MuiInputBase-root': { color: '#f0eae3' }, '& .MuiInputLabel-root': { color: '#a89e94' } }}
        >
          <MenuItem value="">Все</MenuItem>
          <MenuItem value="pending">pending</MenuItem>
          <MenuItem value="confirmed">confirmed</MenuItem>
          <MenuItem value="completed">completed</MenuItem>
          <MenuItem value="cancelled_by_salon">cancelled_by_salon</MenuItem>
          <MenuItem value="no_show">no_show</MenuItem>
        </TextField>
        <Button variant="contained" sx={{ bgcolor: '#D8956B', color: '#1a0e09', borderRadius: 100 }} onClick={() => setModal(true)}>
          Новая запись
        </Button>
        <Typography sx={{ color: '#a89e94', fontSize: 13 }}>Всего: {total}</Typography>
      </Stack>

      <Table size="small" sx={{ bgcolor: '#222', borderRadius: 2, '& td, & th': { color: '#f0eae3', borderColor: 'rgba(255,255,255,0.08)' } }}>
        <TableHead>
          <TableRow>
            <TableCell>Время</TableCell>
            <TableCell>Клиент</TableCell>
            <TableCell>Услуга</TableCell>
            <TableCell>Мастер</TableCell>
            <TableCell>Статус</TableCell>
            <TableCell align="right">Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map(a => (
            <TableRow key={a.id}>
              <TableCell>{new Date(a.startsAt).toLocaleString('ru-RU')}</TableCell>
              <TableCell>
                {a.clientLabel}
                {a.clientPhone ? ` · ${a.clientPhone}` : ''}
              </TableCell>
              <TableCell>{a.serviceName}</TableCell>
              <TableCell>{a.staffName ?? '—'}</TableCell>
              <TableCell>{a.status}</TableCell>
              <TableCell align="right">
                {a.status === 'pending' && (
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Button size="small" onClick={() => void setApptStatus(a.id, 'confirmed')}>
                      OK
                    </Button>
                    <Button size="small" color="error" onClick={() => void setApptStatus(a.id, 'cancelled_by_salon')}>
                      Отклонить
                    </Button>
                  </Stack>
                )}
                {a.status === 'confirmed' && (
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Button size="small" onClick={() => void setApptStatus(a.id, 'completed')}>
                      Завершить
                    </Button>
                    <Button size="small" onClick={() => void setApptStatus(a.id, 'no_show')}>
                      No-show
                    </Button>
                  </Stack>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={modal} onClose={() => setModal(false)} PaperProps={{ sx: { bgcolor: '#1a1a1a', color: '#f0eae3' } }}>
        <DialogTitle>Новая запись</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 320, pt: 1 }}>
          <TextField
            select
            label="Услуга"
            value={form.serviceId}
            onChange={e => setForm(f => ({ ...f, serviceId: e.target.value }))}
            SelectProps={{ MenuProps: { PaperProps: { sx: { bgcolor: '#222' } } } }}
          >
            {services.map(s => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Мастер"
            value={form.staffId}
            onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))}
            SelectProps={{ MenuProps: { PaperProps: { sx: { bgcolor: '#222' } } } }}
          >
            <MenuItem value="">—</MenuItem>
            {staff.map(s => (
              <MenuItem key={s.id} value={s.id}>
                {s.displayName}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Начало (локальное)"
            type="datetime-local"
            value={form.startsAt}
            onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField label="Имя" value={form.guestName} onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))} />
          <TextField label="Телефон +7…" value={form.guestPhone} onChange={e => setForm(f => ({ ...f, guestPhone: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModal(false)}>Отмена</Button>
          <Button variant="contained" sx={{ bgcolor: '#D8956B' }} onClick={() => void submitCreate()}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
