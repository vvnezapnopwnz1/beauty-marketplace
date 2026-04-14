import { useCallback, useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  Box,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
} from '@mui/material'
import {
  fetchDashboardAppointments,
  patchAppointmentStatus,
  createDashboardAppointment,
  updateDashboardAppointment,
  fetchDashboardServices,
  fetchDashboardStaff,
  staffListItemsToRows,
  type DashboardAppointment,
  type DashboardServiceRow,
  type DashboardStaffRow,
} from '@shared/api/dashboardApi'
import { mocha } from '@pages/dashboard/theme/mocha'

// ─── date filter ────────────────────────────────────────────────────────────

type DateFilter = 'today' | 'tomorrow' | 'week' | 'all'

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  today:    'Сегодня',
  tomorrow: 'Завтра',
  week:     'Эта неделя',
  all:      'Все',
}

function getDateRange(filter: DateFilter): { from?: string; to?: string } {
  const now = new Date()
  const startOf = (d: Date) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r }
  const endOf   = (d: Date) => { const r = new Date(d); r.setHours(23, 59, 59, 999); return r }

  if (filter === 'today') {
    return { from: startOf(now).toISOString(), to: endOf(now).toISOString() }
  }
  if (filter === 'tomorrow') {
    const t = new Date(now); t.setDate(t.getDate() + 1)
    return { from: startOf(t).toISOString(), to: endOf(t).toISOString() }
  }
  if (filter === 'week') {
    const mon = new Date(now)
    const d = mon.getDay()
    mon.setDate(mon.getDate() - d + (d === 0 ? -6 : 1))
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return { from: startOf(mon).toISOString(), to: endOf(sun).toISOString() }
  }
  return {}
}

function formatTime(iso: string, filter: DateFilter): string {
  const d = new Date(iso)
  if (filter === 'today' || filter === 'tomorrow') {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── status config ───────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; timeColor: string }> = {
  pending:            { label: 'Ожидает',      bg: 'rgba(255,217,61,.15)',  color: '#FFD93D', timeColor: '#FFD93D' },
  confirmed:          { label: 'Подтверждена', bg: 'rgba(107,203,119,.15)', color: '#6BCB77', timeColor: '#D8956B' },
  completed:          { label: 'Завершена',    bg: 'rgba(78,205,196,.15)',  color: '#4ECDC4', timeColor: '#D8956B' },
  cancelled_by_salon: { label: 'Отмена',       bg: 'rgba(255,107,107,.15)', color: '#FF6B6B', timeColor: '#FF6B6B' },
  no_show:            { label: 'Не пришёл',    bg: 'rgba(255,255,255,.07)', color: '#B8A896', timeColor: '#D8956B' },
}

// ─── primitives ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, bg: 'rgba(255,255,255,.07)', color: '#B8A896' }
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1.25,
        py: 0.25,
        borderRadius: '20px',
        fontSize: 11,
        fontWeight: 600,
        bgcolor: cfg.bg,
        color: cfg.color,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </Box>
  )
}

function PillBtn({
  children,
  active,
  danger,
  compact,
  onClick,
}: {
  children: ReactNode
  active?: boolean
  danger?: boolean
  compact?: boolean
  onClick?: () => void
}) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        px: compact ? '8px' : 1.5,
        py: compact ? '4px' : '6px',
        borderRadius: '6px',
        fontSize: compact ? 11 : 12,
        fontWeight: 500,
        border: 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: '.15s',
        bgcolor: danger
          ? 'rgba(255,107,107,.15)'
          : active
          ? mocha.accent
          : mocha.control,
        color: danger ? mocha.red : active ? '#fff' : mocha.muted,
        '&:hover': {
          bgcolor: danger
            ? 'rgba(255,107,107,.28)'
            : active
            ? mocha.accentDark
            : mocha.controlHover,
          color: danger ? mocha.red : mocha.text,
        },
      }}
    >
      {children}
    </Box>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

const COLS = '80px 1fr 130px 100px 130px minmax(148px, auto)'

export function DashboardAppointments() {
  const [items, setItems]           = useState<DashboardAppointment[]>([])
  const [total, setTotal]           = useState(0)
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [search, setSearch]         = useState('')
  const [err, setErr]               = useState<string | null>(null)
  const [modal, setModal]           = useState(false)
  const [editAppt, setEditAppt]   = useState<DashboardAppointment | null>(null)
  const [services, setServices]     = useState<DashboardServiceRow[]>([])
  const [staff, setStaff]           = useState<DashboardStaffRow[]>([])
  const [form, setForm] = useState({
    serviceId: '',
    staffId: '',
    startsAt: '',
    guestName: '',
    guestPhone: '',
  })
  const [editForm, setEditForm] = useState({
    serviceId: '',
    staffId: '',
    startsAt: '',
    guestName: '',
    guestPhone: '',
    clientNote: '',
  })

  const load = useCallback(async () => {
    setErr(null)
    try {
      const { from, to } = getDateRange(dateFilter)
      const res = await fetchDashboardAppointments({ from, to, pageSize: 100 })
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }, [dateFilter])

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
          setStaff(staffListItemsToRows(st).filter(x => x.isActive))
          setForm(f => (f.serviceId ? f : { ...f, serviceId: s[0]?.id ?? '' }))
        } catch { /* ignore */ }
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

  function openEdit(a: DashboardAppointment) {
    setErr(null)
    setEditAppt(a)
    setEditForm({
      serviceId: a.serviceId,
      staffId: a.staffId ?? '',
      startsAt: toDatetimeLocalValue(a.startsAt),
      guestName: a.guestName ?? (a.clientUserId ? a.clientLabel : ''),
      guestPhone: a.guestPhone ?? a.clientPhone ?? '',
      clientNote: a.clientNote ?? '',
    })
  }

  async function submitEdit() {
    if (!editAppt) return
    try {
      if (!editAppt.clientUserId) {
        const name = editForm.guestName.trim()
        const phone = editForm.guestPhone.trim()
        if (!name) {
          setErr('Укажите имя гостя')
          return
        }
        if (!/^\+7\d{10}$/.test(phone)) {
          setErr('Телефон в формате +7XXXXXXXXXX')
          return
        }
      }
      const startsAt = new Date(editForm.startsAt).toISOString()
      await updateDashboardAppointment(editAppt.id, {
        serviceId: editForm.serviceId,
        startsAt,
        clientNote: editForm.clientNote.trim(),
        ...(editForm.staffId
          ? { staffId: editForm.staffId }
          : { clearStaffId: true }),
        ...(!editAppt.clientUserId
          ? {
              guestName: editForm.guestName.trim(),
              guestPhone: editForm.guestPhone.trim(),
            }
          : {}),
      })
      setEditAppt(null)
      void load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  const filtered = search.trim()
    ? items.filter(a => {
        const q = search.toLowerCase()
        return (
          a.clientLabel?.toLowerCase().includes(q) ||
          a.clientPhone?.toLowerCase().includes(q) ||
          a.serviceName?.toLowerCase().includes(q) ||
          a.staffName?.toLowerCase().includes(q)
        )
      })
    : items

  return (
    <Box>
      {err && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: mocha.errorBg, color: mocha.text }}>
          {err}
        </Alert>
      )}

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography sx={{ fontSize: 17, fontWeight: 600, color: mocha.text, m: 0 }}>
          Записи
        </Typography>
        <PillBtn active onClick={() => setModal(true)}>+ Создать запись</PillBtn>
      </Box>

      {/* ── Filter bar ── */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        {(Object.keys(DATE_FILTER_LABELS) as DateFilter[]).map(f => (
          <PillBtn key={f} active={dateFilter === f} onClick={() => setDateFilter(f)}>
            {DATE_FILTER_LABELS[f]}
          </PillBtn>
        ))}
        <Box sx={{ flex: 1 }} />
        <Box
          component="input"
          type="text"
          placeholder="Поиск..."
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          sx={{
            px: '12px',
            py: '6px',
            borderRadius: '6px',
            border: `1px solid ${mocha.border}`,
            bgcolor: mocha.page,
            color: mocha.text,
            fontSize: 12,
            width: 160,
            outline: 'none',
            '&::placeholder': { color: mocha.muted },
            '&:focus': { borderColor: mocha.accent },
          }}
        />
        <Typography sx={{ color: mocha.muted, fontSize: 12, ml: 0.5 }}>
          {total}
        </Typography>
      </Box>

      {/* ── Table ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Header row */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: COLS,
            gap: '12px',
            px: '14px',
            py: 1,
            fontSize: 11,
            color: mocha.muted,
            textTransform: 'uppercase',
            letterSpacing: '.5px',
            borderBottom: `1px solid ${mocha.borderSubtle}`,
          }}
        >
          <span>Время</span>
          <span>Клиент</span>
          <span>Услуга</span>
          <span>Мастер</span>
          <span>Статус</span>
          <span />
        </Box>

        {/* Empty state */}
        {filtered.length === 0 && (
          <Box sx={{ py: 5, textAlign: 'center', color: mocha.muted, fontSize: 13 }}>
            Нет записей
          </Box>
        )}

        {/* Data rows */}
        {filtered.map(a => {
          const isCancelled = a.status === 'cancelled_by_salon'
          const timeColor = STATUS_CFG[a.status]?.timeColor ?? mocha.accent

          return (
            <Box
              key={a.id}
              onDoubleClick={() => openEdit(a)}
              title="Двойной щелчок — редактировать"
              sx={{
                display: 'grid',
                gridTemplateColumns: COLS,
                gap: '12px',
                px: '14px',
                py: '10px',
                bgcolor: mocha.card,
                borderRadius: '8px',
                alignItems: 'center',
                fontSize: 13,
                opacity: isCancelled ? 0.6 : 1,
                transition: 'background .15s',
                cursor: 'pointer',
                '&:hover': { bgcolor: mocha.cardAlt },
              }}
            >
              {/* Time */}
              <Box component="span" sx={{ fontWeight: 600, color: timeColor }}>
                {formatTime(a.startsAt, dateFilter)}
              </Box>

              {/* Client */}
              <Box>
                <Box
                  component="div"
                  sx={{
                    fontWeight: 600,
                    color: mocha.text,
                    textDecoration: isCancelled ? 'line-through' : 'none',
                    lineHeight: 1.3,
                  }}
                >
                  {a.clientLabel}
                </Box>
                {a.clientPhone && (
                  <Box component="div" sx={{ fontSize: 11, color: mocha.muted, mt: 0.25 }}>
                    {a.clientPhone}
                  </Box>
                )}
              </Box>

              {/* Service */}
              <Box component="span" sx={{ color: mocha.text }}>
                {a.serviceName}
              </Box>

              {/* Staff */}
              <Box component="span" sx={{ color: mocha.muted }}>
                {a.staffName ?? '—'}
              </Box>

              {/* Status */}
              <Box>
                <StatusBadge status={a.status} />
              </Box>

              {/* Actions */}
              <Box
                sx={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}
                onDoubleClick={e => e.stopPropagation()}
              >
                {a.status === 'pending' && (
                  <>
                    <PillBtn compact active onClick={() => void setApptStatus(a.id, 'confirmed')}>✓</PillBtn>
                    <PillBtn compact danger onClick={() => void setApptStatus(a.id, 'cancelled_by_salon')}>✗</PillBtn>
                  </>
                )}
                {a.status === 'confirmed' && (
                  <>
                    <PillBtn compact active onClick={() => void setApptStatus(a.id, 'completed')}>Готово</PillBtn>
                    <PillBtn compact danger onClick={() => void setApptStatus(a.id, 'cancelled_by_salon')}>✗</PillBtn>
                  </>
                )}
                {isCancelled && (
                  <PillBtn compact onClick={() => void setApptStatus(a.id, 'pending')}>↺</PillBtn>
                )}
              </Box>
            </Box>
          )
        })}
      </Box>

      {/* ── Create dialog ── */}
      <Dialog
        open={modal}
        onClose={() => setModal(false)}
        PaperProps={{ sx: { bgcolor: mocha.dialog, color: mocha.text } }}
      >
        <DialogTitle>Новая запись</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 320, pt: 1 }}>
          <TextField
            select
            label="Услуга"
            value={form.serviceId}
            onChange={e => setForm(f => ({ ...f, serviceId: e.target.value }))}
            SelectProps={{ MenuProps: { PaperProps: { sx: { bgcolor: mocha.card } } } }}
          >
            {services.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Мастер"
            value={form.staffId}
            onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))}
            SelectProps={{ MenuProps: { PaperProps: { sx: { bgcolor: mocha.card } } } }}
          >
            <MenuItem value="">—</MenuItem>
            {staff.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.displayName}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Начало (локальное)"
            type="datetime-local"
            value={form.startsAt}
            onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Имя"
            value={form.guestName}
            onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))}
          />
          <TextField
            label="Телефон +7…"
            value={form.guestPhone}
            onChange={e => setForm(f => ({ ...f, guestPhone: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModal(false)}>Отмена</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: mocha.accent, color: mocha.onAccent }}
            onClick={() => void submitCreate()}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editAppt !== null}
        onClose={() => setEditAppt(null)}
        PaperProps={{ sx: { bgcolor: mocha.dialog, color: mocha.text } }}
      >
        <DialogTitle>Редактировать запись</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 320, pt: 1 }}>
          <TextField
            select
            label="Услуга"
            value={editForm.serviceId}
            onChange={e => setEditForm(f => ({ ...f, serviceId: e.target.value }))}
            SelectProps={{ MenuProps: { PaperProps: { sx: { bgcolor: mocha.card } } } }}
          >
            {services.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Мастер"
            value={editForm.staffId}
            onChange={e => setEditForm(f => ({ ...f, staffId: e.target.value }))}
            SelectProps={{ MenuProps: { PaperProps: { sx: { bgcolor: mocha.card } } } }}
          >
            <MenuItem value="">—</MenuItem>
            {staff.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.displayName}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Начало (локальное)"
            type="datetime-local"
            value={editForm.startsAt}
            onChange={e => setEditForm(f => ({ ...f, startsAt: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Имя"
            value={editForm.guestName}
            onChange={e => setEditForm(f => ({ ...f, guestName: e.target.value }))}
            disabled={!!editAppt?.clientUserId}
            helperText={editAppt?.clientUserId ? 'Клиент из личного кабинета' : undefined}
          />
          <TextField
            label="Телефон +7…"
            value={editForm.guestPhone}
            onChange={e => setEditForm(f => ({ ...f, guestPhone: e.target.value }))}
            disabled={!!editAppt?.clientUserId}
          />
          <TextField
            label="Комментарий"
            value={editForm.clientNote}
            onChange={e => setEditForm(f => ({ ...f, clientNote: e.target.value }))}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditAppt(null)}>Отмена</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: mocha.accent, color: mocha.onAccent }}
            onClick={() => void submitEdit()}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
