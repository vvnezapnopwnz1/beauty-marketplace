import { useCallback, useEffect, useState } from 'react'
import { Box, Typography, Button, Stack, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from '@mui/material'
import {
  fetchDashboardServices,
  createDashboardService,
  updateDashboardService,
  deleteDashboardService,
  type DashboardServiceRow,
} from '@shared/api/dashboardApi'

export function DashboardServices() {
  const [rows, setRows] = useState<DashboardServiceRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<DashboardServiceRow | null>(null)
  const [name, setName] = useState('')
  const [dur, setDur] = useState(60)
  const [price, setPrice] = useState('')

  const load = useCallback(async () => {
    try {
      setRows(await fetchDashboardServices())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  function startCreate() {
    setEdit(null)
    setName('')
    setDur(60)
    setPrice('')
    setOpen(true)
  }

  function startEdit(r: DashboardServiceRow) {
    setEdit(r)
    setName(r.name)
    setDur(r.durationMinutes)
    setPrice(r.priceCents != null ? String(r.priceCents / 100) : '')
    setOpen(true)
  }

  async function save() {
    const cents = price.trim() === '' ? null : Math.round(parseFloat(price.replace(',', '.')) * 100)
    try {
      if (edit) {
        await updateDashboardService(edit.id, {
          name,
          durationMinutes: dur,
          priceCents: cents,
          isActive: edit.isActive,
          sortOrder: edit.sortOrder,
        })
      } else {
        await createDashboardService({
          name,
          durationMinutes: dur,
          priceCents: cents,
          isActive: true,
          sortOrder: rows.length,
        })
      }
      setOpen(false)
      void load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  async function del(id: string) {
    if (!confirm('Деактивировать услугу?')) return
    try {
      await deleteDashboardService(id)
      void load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  return (
    <Box>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      <Button sx={{ mb: 2, bgcolor: '#D8956B', color: '#1a0e09' }} onClick={startCreate}>
        Добавить услугу
      </Button>
      <Stack spacing={1}>
        {rows.map(r => (
          <Box
            key={r.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: '#222',
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Box>
              <Typography sx={{ color: '#f0eae3', fontWeight: 600 }}>{r.name}</Typography>
              <Typography sx={{ color: '#a89e94', fontSize: 13 }}>
                {r.durationMinutes} мин · {r.priceCents != null ? `${(r.priceCents / 100).toFixed(0)} ₽` : 'цена не указана'}{' '}
                · {r.isActive ? 'активна' : 'выкл'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => startEdit(r)}>
                Изменить
              </Button>
              <Button size="small" color="error" onClick={() => void del(r.id)}>
                Выкл.
              </Button>
            </Stack>
          </Box>
        ))}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { bgcolor: '#1a1a1a', color: '#f0eae3' } }}>
        <DialogTitle>{edit ? 'Услуга' : 'Новая услуга'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 280 }}>
          <TextField label="Название" value={name} onChange={e => setName(e.target.value)} />
          <TextField label="Минуты" type="number" value={dur} onChange={e => setDur(Number(e.target.value))} />
          <TextField label="Цена ₽" value={price} onChange={e => setPrice(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Отмена</Button>
          <Button sx={{ bgcolor: '#D8956B' }} onClick={() => void save()}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
