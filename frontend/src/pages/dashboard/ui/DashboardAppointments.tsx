import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  type SelectChangeEvent,
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
import { useDashboardFormStyles } from '@pages/dashboard/theme/formStyles'
import { useDashboardListCardSurface, useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import type { DashboardPalette } from '@shared/theme'
import {
  FormField,
  PanelHeader,
  FormSection,
  PanelFooter,
  PanelBtn,
  StaffPickGrid,
  TimeSlotGrid,
  generateTimeSlots,
  type StaffPickItem,
} from '@pages/dashboard/ui/components/formComponents'

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

function todayISO(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ─── status config ───────────────────────────────────────────────────────────

function statusCfg(d: DashboardPalette): Record<string, { label: string; bg: string; color: string; timeColor: string }> {
  return {
    pending: { label: 'Ожидает', bg: 'rgba(255,217,61,.15)', color: '#FFD93D', timeColor: '#FFD93D' },
    confirmed: { label: 'Подтверждена', bg: 'rgba(107,203,119,.15)', color: '#6BCB77', timeColor: d.accent },
    completed: { label: 'Завершена', bg: 'rgba(78,205,196,.15)', color: '#4ECDC4', timeColor: d.accent },
    cancelled_by_salon: { label: 'Отмена', bg: 'rgba(224,96,96,.15)', color: d.red, timeColor: d.red },
    no_show: { label: 'Не пришёл', bg: 'rgba(255,255,255,.07)', color: d.mutedDark, timeColor: d.accent },
  }
}

// ─── primitives ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const d = useDashboardPalette()
  const cfg = statusCfg(d)[status] ?? { label: status, bg: 'rgba(255,255,255,.07)', color: d.mutedDark }
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
  const d = useDashboardPalette()
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
        fontFamily: 'inherit',
        bgcolor: danger
          ? 'rgba(224,96,96,.15)'
          : active
          ? d.accent
          : d.control,
        color: danger ? d.red : active ? '#fff' : d.mutedDark,
        '&:hover': {
          bgcolor: danger
            ? 'rgba(224,96,96,.28)'
            : active
            ? d.accentDark
            : d.controlHover,
          color: danger ? d.red : d.text,
        },
      }}
    >
      {children}
    </Box>
  )
}

function apptSelectSx(d: DashboardPalette) {
  return {
    bgcolor: d.input,
    borderRadius: '10px',
    fontSize: 13,
    color: d.text,
    width: '100%',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: d.inputBorder, top: 0 },
    '& .MuiOutlinedInput-notchedOutline legend': { display: 'none' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: d.borderLight },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: d.borderFocus },
    '& .MuiSelect-select': { py: '9px', px: '12px' },
    '& .MuiSvgIcon-root': { color: d.mutedDark },
  }
}

function menuItemSx(d: DashboardPalette) {
  return { fontSize: 13, color: d.text, '&:hover': { bgcolor: d.card } }
}

// иконка записи
function ApptIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#6BCB77" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="3"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

const COLS = '80px 1fr 130px 100px 130px minmax(148px, auto)'

export function DashboardAppointments() {
  const d = useDashboardPalette()
  const listCard = useDashboardListCardSurface()
  const { inputBaseSx, textareaSx, panelPaperSmSx, errorAlertSx, selectMenuSx } = useDashboardFormStyles()
  const [items, setItems]           = useState<DashboardAppointment[]>([])
  const [total, setTotal]           = useState(0)
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [search, setSearch]         = useState('')
  const [err, setErr]               = useState<string | null>(null)
  const [modal, setModal]           = useState(false)
  const [editAppt, setEditAppt]     = useState<DashboardAppointment | null>(null)
  const [services, setServices]     = useState<DashboardServiceRow[]>([])
  const [staff, setStaff]           = useState<DashboardStaffRow[]>([])

  // ── create form state ──
  const [createForm, setCreateForm] = useState({
    serviceId: '',
    staffIds: [] as string[],
    date: todayISO(),
    timeSlot: '',
    guestName: '',
    guestPhone: '',
  })

  // ── edit form state ──
  const [editForm, setEditForm] = useState({
    serviceId: '',
    staffIds: [] as string[],
    date: '',
    timeSlot: '',
    guestName: '',
    guestPhone: '',
    clientNote: '',
  })

  const slots = useMemo(() => generateTimeSlots(9, 18, 30), [])

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
          setCreateForm(f => f.serviceId ? f : { ...f, serviceId: s[0]?.id ?? '' })
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
    if (!createForm.timeSlot) { setErr('Выберите время'); return }
    try {
      const startsAt = new Date(`${createForm.date}T${createForm.timeSlot}:00`).toISOString()
      await createDashboardAppointment({
        serviceId: createForm.serviceId,
        staffId: createForm.staffIds[0] ?? null,
        startsAt,
        guestName: createForm.guestName,
        guestPhone: createForm.guestPhone,
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
    const d = new Date(a.startsAt)
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`
    setEditForm({
      serviceId: a.serviceId,
      staffIds: a.staffId ? [a.staffId] : [],
      date: dateStr,
      timeSlot: timeStr,
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
        if (!name) { setErr('Укажите имя гостя'); return }
        if (!/^\+7\d{10}$/.test(phone)) { setErr('Телефон в формате +7XXXXXXXXXX'); return }
      }
      const startsAt = new Date(`${editForm.date}T${editForm.timeSlot}:00`).toISOString()
      await updateDashboardAppointment(editAppt.id, {
        serviceId: editForm.serviceId,
        startsAt,
        clientNote: editForm.clientNote.trim(),
        ...(editForm.staffIds[0]
          ? { staffId: editForm.staffIds[0] }
          : { clearStaffId: true }),
        ...(!editAppt.clientUserId
          ? { guestName: editForm.guestName.trim(), guestPhone: editForm.guestPhone.trim() }
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

  const staffPickItems: StaffPickItem[] = staff.map(s => ({
    id: s.id,
    displayName: s.displayName,
  }))

  return (
    <Box>
      {err && (
        <Alert severity="error" sx={{ ...errorAlertSx, mb: 2 }}>{err}</Alert>
      )}

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography sx={{ fontSize: 17, fontWeight: 600, color: d.text }}>Записи</Typography>
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
            px: '12px', py: '6px',
            borderRadius: '6px',
            border: `1px solid ${d.border}`,
            bgcolor: d.page,
            color: d.text,
            fontSize: 12,
            width: 160,
            outline: 'none',
            fontFamily: 'inherit',
            '&::placeholder': { color: d.muted },
            '&:focus': { borderColor: d.accent },
          }}
        />
        <Typography sx={{ color: d.muted, fontSize: 12, ml: 0.5 }}>{total}</Typography>
      </Box>

      {/* ── Table ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: COLS,
            gap: '12px',
            px: '14px',
            py: 1,
            fontSize: 11,
            color: d.muted,
            textTransform: 'uppercase',
            letterSpacing: '.5px',
            borderBottom: `1px solid ${d.borderSubtle}`,
          }}
        >
          <span>Время</span>
          <span>Клиент</span>
          <span>Услуга</span>
          <span>Мастер</span>
          <span>Статус</span>
          <span />
        </Box>

        {filtered.length === 0 && (
          <Box sx={{ py: 5, textAlign: 'center', color: d.muted, fontSize: 13 }}>
            Нет записей
          </Box>
        )}

        {filtered.map(a => {
          const isCancelled = a.status === 'cancelled_by_salon'
          const timeColor = statusCfg(d)[a.status]?.timeColor ?? d.accent
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
                bgcolor: listCard.bg,
                border: `1px solid ${listCard.border}`,
                boxShadow: listCard.shadow,
                borderRadius: '8px',
                alignItems: 'center',
                fontSize: 13,
                opacity: isCancelled ? 0.6 : 1,
                transition: 'background .15s, box-shadow .15s',
                cursor: 'pointer',
                '&:hover': { bgcolor: listCard.hoverBg },
              }}
            >
              <Box component="span" sx={{ fontWeight: 600, color: timeColor }}>
                {formatTime(a.startsAt, dateFilter)}
              </Box>
              <Box>
                <Box component="div" sx={{ fontWeight: 600, color: d.text, textDecoration: isCancelled ? 'line-through' : 'none', lineHeight: 1.3 }}>
                  {a.clientLabel}
                </Box>
                {a.clientPhone && (
                  <Box component="div" sx={{ fontSize: 11, color: d.muted, mt: 0.25 }}>{a.clientPhone}</Box>
                )}
              </Box>
              <Box component="span" sx={{ color: d.text }}>{a.serviceName}</Box>
              <Box component="span" sx={{ color: d.muted }}>{a.staffName ?? '—'}</Box>
              <Box><StatusBadge status={a.status} /></Box>
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

      {/* ═══════════════════════════════════
          ДИАЛОГ: Создать запись
      ═══════════════════════════════════ */}
      <Dialog
        open={modal}
        onClose={() => setModal(false)}
        maxWidth={false}
        scroll="paper"
        slotProps={{ backdrop: { sx: { bgcolor: d.backdrop, backdropFilter: 'blur(6px)' } } }}
        PaperProps={{ sx: panelPaperSmSx }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <PanelHeader
            icon={<ApptIcon />}
            iconColor="rgba(107,203,119,.12)"
            title="Новая запись"
            subtitle="Вручную — без онлайн-бронирования"
            onClose={() => setModal(false)}
          />

          <DialogContent sx={{ px: 0, py: 0, overflow: 'auto', flex: '1 1 auto', minHeight: 0 }}>

            {/* СЕКЦИЯ 1: Клиент */}
            <FormSection num={1} name="Клиент">
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <FormField label="Имя" required>
                    <TextField
                      value={createForm.guestName}
                      onChange={e => setCreateForm(f => ({ ...f, guestName: e.target.value }))}
                      fullWidth
                      placeholder="Имя клиента"
                      sx={inputBaseSx}
                    />
                  </FormField>
                  <FormField label="Телефон" required>
                    <TextField
                      value={createForm.guestPhone}
                      onChange={e => setCreateForm(f => ({ ...f, guestPhone: e.target.value }))}
                      fullWidth
                      placeholder="+7 916 000-00-00"
                      sx={inputBaseSx}
                    />
                  </FormField>
                </Stack>
              </Stack>
            </FormSection>

            {/* СЕКЦИЯ 2: Услуга и мастер */}
            <FormSection num={2} name="Услуга и мастер">
              <Stack spacing={1.5}>
                <FormField label="Услуга" required>
                  <Select
                    value={createForm.serviceId}
                    onChange={(e: SelectChangeEvent<string>) => setCreateForm(f => ({ ...f, serviceId: e.target.value }))}
                    displayEmpty
                    MenuProps={selectMenuSx}
                    sx={apptSelectSx(d)}
                  >
                    <MenuItem value="" disabled sx={menuItemSx(d)}>Выберите услугу…</MenuItem>
                    {services.map(s => (
                      <MenuItem key={s.id} value={s.id} sx={menuItemSx(d)}>
                        {s.name}
                        {s.durationMinutes ? ` · ${s.durationMinutes} мин` : ''}
                        {s.priceCents != null ? ` · ${s.priceCents / 100} ₽` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Мастер">
                  <StaffPickGrid
                    items={staffPickItems}
                    selected={createForm.staffIds}
                    onChange={ids => setCreateForm(f => ({ ...f, staffIds: ids.slice(-1) }))}
                    allowNone
                  />
                </FormField>
              </Stack>
            </FormSection>

            {/* СЕКЦИЯ 3: Дата и время */}
            <FormSection num={3} name="Дата и время" last>
              <Stack spacing={1.5}>
                <FormField label="Дата" required>
                  <TextField
                    value={createForm.date}
                    onChange={e => setCreateForm(f => ({ ...f, date: e.target.value, timeSlot: '' }))}
                    type="date"
                    sx={inputBaseSx}
                  />
                </FormField>

                <FormField label="Время" required hint="Запись создаётся со статусом «Ожидает»">
                  <TimeSlotGrid
                    slots={slots}
                    selected={createForm.timeSlot}
                    onChange={t => setCreateForm(f => ({ ...f, timeSlot: t }))}
                  />
                </FormField>
              </Stack>
            </FormSection>

          </DialogContent>

          <PanelFooter
            note="Запись со статусом «Ожидает»"
            actions={
              <>
                <PanelBtn variant="ghost" onClick={() => setModal(false)}>Отмена</PanelBtn>
                <PanelBtn variant="success" onClick={() => void submitCreate()}>Создать запись</PanelBtn>
              </>
            }
          />
        </Box>
      </Dialog>

      {/* ═══════════════════════════════════
          ДИАЛОГ: Редактировать запись
      ═══════════════════════════════════ */}
      <Dialog
        open={editAppt !== null}
        onClose={() => setEditAppt(null)}
        maxWidth={false}
        scroll="paper"
        slotProps={{ backdrop: { sx: { bgcolor: d.backdrop, backdropFilter: 'blur(6px)' } } }}
        PaperProps={{ sx: panelPaperSmSx }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <PanelHeader
            icon={<ApptIcon />}
            iconColor="rgba(107,203,119,.12)"
            title="Редактировать запись"
            subtitle={editAppt ? `#${editAppt.id.slice(0, 8)}` : ''}
            onClose={() => setEditAppt(null)}
          />

          <DialogContent sx={{ px: 0, py: 0, overflow: 'auto', flex: '1 1 auto', minHeight: 0 }}>

            {/* СЕКЦИЯ 1: Клиент */}
            <FormSection num={1} name="Клиент">
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <FormField label="Имя">
                    <TextField
                      value={editForm.guestName}
                      onChange={e => setEditForm(f => ({ ...f, guestName: e.target.value }))}
                      fullWidth
                      disabled={!!editAppt?.clientUserId}
                      sx={inputBaseSx}
                    />
                  </FormField>
                  <FormField label="Телефон" hint={editAppt?.clientUserId ? 'Клиент из личного кабинета' : undefined}>
                    <TextField
                      value={editForm.guestPhone}
                      onChange={e => setEditForm(f => ({ ...f, guestPhone: e.target.value }))}
                      fullWidth
                      disabled={!!editAppt?.clientUserId}
                      sx={inputBaseSx}
                    />
                  </FormField>
                </Stack>
                <FormField label="Комментарий">
                  <TextField
                    value={editForm.clientNote}
                    onChange={e => setEditForm(f => ({ ...f, clientNote: e.target.value }))}
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Пожелания, особенности…"
                    sx={textareaSx}
                  />
                </FormField>
              </Stack>
            </FormSection>

            {/* СЕКЦИЯ 2: Услуга и мастер */}
            <FormSection num={2} name="Услуга и мастер">
              <Stack spacing={1.5}>
                <FormField label="Услуга">
                  <Select
                    value={editForm.serviceId}
                    onChange={(e: SelectChangeEvent<string>) => setEditForm(f => ({ ...f, serviceId: e.target.value }))}
                    MenuProps={selectMenuSx}
                    sx={apptSelectSx(d)}
                  >
                    {services.map(s => (
                      <MenuItem key={s.id} value={s.id} sx={menuItemSx(d)}>{s.name}</MenuItem>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Мастер">
                  <StaffPickGrid
                    items={staffPickItems}
                    selected={editForm.staffIds}
                    onChange={ids => setEditForm(f => ({ ...f, staffIds: ids.slice(-1) }))}
                    allowNone
                  />
                </FormField>
              </Stack>
            </FormSection>

            {/* СЕКЦИЯ 3: Дата и время */}
            <FormSection num={3} name="Дата и время" last>
              <Stack spacing={1.5}>
                <FormField label="Дата">
                  <TextField
                    value={editForm.date}
                    onChange={e => setEditForm(f => ({ ...f, date: e.target.value, timeSlot: '' }))}
                    type="date"
                    sx={inputBaseSx}
                  />
                </FormField>

                <FormField label="Время">
                  <TimeSlotGrid
                    slots={slots}
                    selected={editForm.timeSlot}
                    onChange={t => setEditForm(f => ({ ...f, timeSlot: t }))}
                  />
                </FormField>
              </Stack>
            </FormSection>

          </DialogContent>

          <PanelFooter
            actions={
              <>
                <PanelBtn variant="ghost" onClick={() => setEditAppt(null)}>Отмена</PanelBtn>
                <PanelBtn variant="primary" onClick={() => void submitEdit()}>Сохранить</PanelBtn>
              </>
            }
          />
        </Box>
      </Dialog>

    </Box>
  )
}
