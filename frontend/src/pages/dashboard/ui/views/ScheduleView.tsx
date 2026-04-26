import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import {
  fetchDashboardStaff,
  fetchSalonSchedule,
  fetchStaffSchedule,
  putSalonScheduleBundle,
  putStaffScheduleBundle,
  type DashboardStaffListItem,
  type SalonDateOverrideRow,
  type StaffAbsenceRow,
  type StaffWorkingHourRow,
  type WorkingHourRow,
} from '@shared/api/dashboardApi'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { ToggleSwitch } from '@pages/dashboard/ui/components/formComponents'

const FULL_DAYS = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
]
const WSG_DOW = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']

type LocalSalonDay = {
  day: number
  opens: string
  closes: string
  closed: boolean
  breakStart: string
  breakEnd: string
}
type LocalStaffDay = {
  day: number
  opens: string
  closes: string
  dayOff: boolean
  breakStart: string
  breakEnd: string
}

function time5(s: string | null | undefined): string {
  if (!s) return ''
  const p = s.slice(0, 5)
  return p.length === 5 ? p : '10:00'
}

function toHHMMSS(t: string): string {
  const p = t.trim()
  if (p.length === 5 && p.includes(':')) return `${p}:00`
  return p
}

function shortStaffLabel(name: string): string {
  const p = name.trim().split(/\s+/)
  if (p.length >= 2) return `${p[0]} ${p[1]!.charAt(0)}.`
  return name.length > 16 ? `${name.slice(0, 14)}…` : name
}

function staffInitials(name: string): string {
  const p = name.trim().split(/\s+/)
  if (p.length >= 2) return (p[0]![0]! + p[1]![0]!).toUpperCase()
  return name.slice(0, 2).toUpperCase() || '?'
}

function getMonday(d = new Date()): Date {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

function formatOverrideChip(o: SalonDateOverrideRow): string {
  const d = new Date(o.onDate.includes('T') ? o.onDate : `${o.onDate}T12:00:00`)
  const dm = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  return `${dm} — ${o.isClosed ? 'Выходной' : 'Особый день'}`
}

function formatAbsenceChip(a: StaffAbsenceRow): string {
  const s = new Date(a.startsOn.includes('T') ? a.startsOn : `${a.startsOn}T12:00:00`)
  const e = new Date(a.endsOn.includes('T') ? a.endsOn : `${a.endsOn}T12:00:00`)
  const sm = s.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  const em = e.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  const kind =
    a.kind === 'vacation' || a.kind === 'отпуск'
      ? 'Отпуск'
      : a.kind === 'sick' || a.kind === 'больничный'
        ? 'Больничный'
        : a.kind
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()}–${e.getDate()} ${s.toLocaleDateString('ru-RU', { month: 'long' })} — ${kind}`
  }
  return `${sm} – ${em} — ${kind}`
}

function dayDiffersFromSalon(l: LocalStaffDay, s: LocalSalonDay | undefined): boolean {
  if (!s) return false
  if (l.dayOff !== s.closed) return true
  if (l.dayOff) return false
  return l.opens !== s.opens || l.closes !== s.closes
}

/** «10–20» для круглых часов, иначе полные «10:30–20:15». */
function compactTimeRange(opens: string, closes: string): string {
  const o = opens.slice(0, 5)
  const c = closes.slice(0, 5)
  const [oh, om] = o.split(':').map(Number)
  const [ch, cm] = c.split(':').map(Number)
  if (
    !Number.isNaN(oh) &&
    !Number.isNaN(om) &&
    !Number.isNaN(ch) &&
    !Number.isNaN(cm) &&
    om === 0 &&
    cm === 0
  ) {
    return `${oh}–${ch}`
  }
  return `${o}–${c}`
}


function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const d = useDashboardPalette()
  return (
    <Box
      component="input"
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      sx={{
        background: d.input,
        border: `1px solid ${d.inputBorder}`,
        borderRadius: '6px',
        py: '5px',
        px: '10px',
        color: d.text,
        fontSize: 12,
        width: 86,
        textAlign: 'center',
        fontFamily: 'inherit',
        outline: 'none',
        boxSizing: 'border-box',
        '&:focus': { borderColor: d.accent },
      }}
    />
  )
}

export function ScheduleView() {
  const d = useDashboardPalette()
  const SWATCHES = useMemo(
    () => [d.accent, d.purple, d.blue, d.green, d.pink, d.yellow, d.red] as const,
    [d],
  )
  const mockBtn = useMemo(
    () =>
      ({
        py: '5px',
        px: '30px',
        borderRadius: '6px',
        fontSize: 12,
        bgcolor: d.control,
        border: 'none',
        color: d.mutedDark,
        cursor: 'pointer',
        fontWeight: 500,
        transition: '0.15s',
        textTransform: 'none' as const,
        minWidth: 'auto',
        lineHeight: 1.4,
        '&:hover': { bgcolor: d.controlHover, color: d.text },
      }) as const,
    [d],
  )
  const [activeTab, setActiveTab] = useState<'salon' | string>('salon')
  const [staff, setStaff] = useState<DashboardStaffListItem[]>([])
  const [staffId, setStaffId] = useState<string>('')

  const [slotMin, setSlotMin] = useState(30)
  const [salonLocal, setSalonLocal] = useState<LocalSalonDay[]>([])
  const [salonOverrides, setSalonOverrides] = useState<SalonDateOverrideRow[]>([])
  const [staffLocal, setStaffLocal] = useState<LocalStaffDay[]>([])
  const [absences, setAbsences] = useState<StaffAbsenceRow[]>([])
  const [newOv, setNewOv] = useState({ onDate: '', isClosed: true, note: '' })
  const [newAbs, setNewAbs] = useState({ startsOn: '', endsOn: '', kind: 'vacation' })
  const [showAddOv, setShowAddOv] = useState(false)
  const [showAddAbs, setShowAddAbs] = useState(false)

  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const loadSalon = useCallback(async () => {
    const data = await fetchSalonSchedule()
    setSlotMin(data.slotDurationMinutes ?? 30)
    const byDay = new Map(data.workingHours.map(r => [r.dayOfWeek, r]))
    setSalonLocal(
      FULL_DAYS.map((_, day) => {
        const r = byDay.get(day) as WorkingHourRow | undefined
        return {
          day,
          opens: time5(r?.opensAt ?? '10:00:00'),
          closes: time5(r?.closesAt ?? '18:00:00'),
          closed: r?.isClosed ?? false,
          breakStart: time5(r?.breakStartsAt ?? ''),
          breakEnd: time5(r?.breakEndsAt ?? ''),
        }
      }),
    )
    setSalonOverrides(data.dateOverrides ?? [])
  }, [])

  const loadStaffBundle = useCallback(async (id: string) => {
    const bundle = await fetchStaffSchedule(id)
    setAbsences(bundle.absences ?? [])
    const byDay = new Map(bundle.rows.map(r => [r.dayOfWeek, r]))
    setStaffLocal(
      FULL_DAYS.map((_, day) => {
        const r = byDay.get(day) as StaffWorkingHourRow | undefined
        return {
          day,
          opens: time5(r?.opensAt ?? '10:00:00'),
          closes: time5(r?.closesAt ?? '18:00:00'),
          dayOff: r?.isDayOff ?? false,
          breakStart: time5(r?.breakStartsAt ?? ''),
          breakEnd: time5(r?.breakEndsAt ?? ''),
        }
      }),
    )
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        setErr(null)
        const list = await fetchDashboardStaff()
        setStaff(list)
        setStaffId(prev => prev || (list[0]?.staff.id ?? ''))
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Ошибка')
      }
    })()
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        setErr(null)
        await loadSalon()
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Ошибка')
      }
    })()
  }, [loadSalon])

  useEffect(() => {
    if (activeTab === 'salon' || !staffId) return
    if (activeTab !== staffId) return
    void (async () => {
      try {
        setErr(null)
        await loadStaffBundle(staffId)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Ошибка')
      }
    })()
  }, [activeTab, staffId, loadStaffBundle])

  const salonByDay = useMemo(() => new Map(salonLocal.map(l => [l.day, l])), [salonLocal])

  const selectedStaff = useMemo(() => staff.find(s => s.staff.id === staffId), [staff, staffId])

  const weekMonday = useMemo(() => getMonday(), [])
  const weekTitle = useMemo(() => {
    const t = weekMonday.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    return t.charAt(0).toUpperCase() + t.slice(1)
  }, [weekMonday])

  const isSalon = activeTab === 'salon'

  async function saveSalon() {
    setMsg(null)
    try {
      await putSalonScheduleBundle({
        slotDurationMinutes: slotMin,
        workingHours: salonLocal.map(l => ({
          dayOfWeek: l.day,
          opensAt: toHHMMSS(l.opens),
          closesAt: toHHMMSS(l.closes),
          closed: l.closed,
          breakStartsAt: l.breakStart ? toHHMMSS(l.breakStart) : null,
          breakEndsAt: l.breakEnd ? toHHMMSS(l.breakEnd) : null,
        })),
        dateOverrides: salonOverrides.map(o => ({
          onDate: o.onDate.slice(0, 10),
          isClosed: o.isClosed,
          note: o.note ?? null,
        })),
      })
      setMsg('Сохранено')
      await loadSalon()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  async function saveStaff() {
    if (!staffId) return
    setMsg(null)
    try {
      await putStaffScheduleBundle(staffId, {
        rows: staffLocal.map(l => ({
          dayOfWeek: l.day,
          opensAt: toHHMMSS(l.opens),
          closesAt: toHHMMSS(l.closes),
          isDayOff: l.dayOff,
          breakStartsAt: l.breakStart ? toHHMMSS(l.breakStart) : null,
          breakEndsAt: l.breakEnd ? toHHMMSS(l.breakEnd) : null,
        })),
        absences: absences.map(a => ({
          startsOn: a.startsOn.slice(0, 10),
          endsOn: a.endsOn.slice(0, 10),
          kind: a.kind,
        })),
      })
      setMsg('Сохранено')
      await loadStaffBundle(staffId)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  function resetStaffFromSalon() {
    setStaffLocal(prev =>
      prev.map(l => {
        const s = salonByDay.get(l.day)
        if (!s) return l
        return {
          day: l.day,
          dayOff: s.closed,
          opens: s.opens,
          closes: s.closes,
          breakStart: s.breakStart,
          breakEnd: s.breakEnd,
        }
      }),
    )
  }

  function addOverride() {
    if (!newOv.onDate) return
    setSalonOverrides(o => [
      ...o,
      {
        id: crypto.randomUUID(),
        onDate: newOv.onDate,
        isClosed: newOv.isClosed,
        note: newOv.note || null,
      },
    ])
    setNewOv({ onDate: '', isClosed: true, note: '' })
    setShowAddOv(false)
  }

  function addAbsence() {
    if (!newAbs.startsOn || !newAbs.endsOn) return
    setAbsences(a => [
      ...a,
      {
        id: crypto.randomUUID(),
        startsOn: newAbs.startsOn,
        endsOn: newAbs.endsOn,
        kind: newAbs.kind,
      },
    ])
    setNewAbs({ startsOn: '', endsOn: '', kind: 'vacation' })
    setShowAddAbs(false)
  }

  const staffSwatchIdx = staff.length
    ? staff.findIndex(s => s.staff.id === staffId) % SWATCHES.length
    : 0
  const avatarBg = `${SWATCHES[staffSwatchIdx] ?? d.accent}33`
  const avatarFg = SWATCHES[staffSwatchIdx] ?? d.accent

  return (
    <Box sx={{ color: d.text, bgcolor: d.page, mt: 0 }}>
      {err && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: d.errorBg, color: d.text }}>
          {err}
        </Alert>
      )}
      {msg && (
        <Alert
          severity="success"
          sx={{ mb: 2, bgcolor: d.dialog, color: d.text }}
          onClose={() => setMsg(null)}
        >
          {msg}
        </Alert>
      )}

      {/* schedule-tabs — как в docs/beautica-dashboard-v2.html */}
      <Box
        sx={{
          display: 'flex',
          gap: '6px',
          mb: 2.5,
          borderBottom: `1px solid ${d.grid}`,
          pb: 1.5,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={() => setActiveTab('salon')}
          sx={{
            py: '7px',
            px: 2,
            borderRadius: '8px',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            border: 'none',
            bgcolor: activeTab === 'salon' ? 'rgba(216,149,107,.15)' : 'transparent',
            color: activeTab === 'salon' ? d.accent : d.mutedDark,
            transition: '0.2s',
            '&:hover': {
              color: d.text,
              bgcolor: activeTab === 'salon' ? 'rgba(216,149,107,.15)' : d.grid,
            },
          }}
        >
          🏠 Салон (общее)
        </Box>
        {staff.map(s => {
          const id = s.staff.id
          const on = activeTab === id
          return (
            <Box
              key={id}
              component="button"
              type="button"
              onClick={() => {
                setStaffId(id)
                setActiveTab(id)
              }}
              sx={{
                py: '7px',
                px: 2,
                borderRadius: '8px',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                border: 'none',
                bgcolor: on ? 'rgba(216,149,107,.15)' : 'transparent',
                color: on ? d.accent : d.mutedDark,
                transition: '0.2s',
                whiteSpace: 'nowrap',
                '&:hover': { color: d.text, bgcolor: on ? 'rgba(216,149,107,.15)' : d.grid },
              }}
            >
              {shortStaffLabel(s.staff.displayName)}
            </Box>
          )
        })}
      </Box>

      {/* SALON */}
      {isSalon && (
        <>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Рабочие часы салона</Typography>
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mt: 0.5 }}>
                Базовые часы. Мастера могут иметь свои отличные от этих часы.
              </Typography>
            </Box>
            <Button
              type="button"
              onClick={() => void saveSalon()}
              sx={{
                ...mockBtn,
                bgcolor: d.accent,
                color: d.onAccent,
                fontWeight: 600,
                '&:hover': { bgcolor: d.accentDark, color: d.onAccent },
              }}
            >
              Сохранить
            </Button>
          </Stack>

          <Box
            sx={{ bgcolor: d.card, borderRadius: '10px', p: 2, border: `1px solid ${d.grid}` }}
          >
            {salonLocal.map((l, i) => (
              <Box
                key={l.day}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  py: 1.25,
                  borderBottom: i < FULL_DAYS.length - 1 ? `1px solid ${d.input}` : 'none',
                  flexWrap: 'wrap',
                }}
              >
                <Typography
                  sx={{ fontSize: 13, color: d.text, width: 90, flexShrink: 0, fontWeight: 500 }}
                >
                  {FULL_DAYS[i]}
                </Typography>
                <ToggleSwitch
                  checked={!l.closed}
                  onChange={v =>
                    setSalonLocal(p => p.map(x => (x.day === l.day ? { ...x, closed: !v } : x)))
                  }
                />
                {!l.closed ? (
                  <>
                    <TimeInput
                      value={l.opens}
                      onChange={v =>
                        setSalonLocal(p => p.map(x => (x.day === l.day ? { ...x, opens: v } : x)))
                      }
                    />
                    <Typography sx={{ color: d.mutedDark, fontSize: 12 }}>—</Typography>
                    <TimeInput
                      value={l.closes}
                      onChange={v =>
                        setSalonLocal(p => p.map(x => (x.day === l.day ? { ...x, closes: v } : x)))
                      }
                    />
                    <Typography sx={{ fontSize: 12, color: d.mutedDark, ml: 1 }}>Обед:</Typography>
                    <TimeInput
                      value={l.breakStart}
                      onChange={v =>
                        setSalonLocal(p =>
                          p.map(x => (x.day === l.day ? { ...x, breakStart: v } : x)),
                        )
                      }
                    />
                    <Typography sx={{ color: d.mutedDark, fontSize: 12 }}>—</Typography>
                    <TimeInput
                      value={l.breakEnd}
                      onChange={v =>
                        setSalonLocal(p =>
                          p.map(x => (x.day === l.day ? { ...x, breakEnd: v } : x)),
                        )
                      }
                    />
                  </>
                ) : (
                  <Typography sx={{ fontSize: 12, color: d.red, ml: 0.5 }}>Выходной</Typography>
                )}
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
              Праздники и особые дни
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
              {salonOverrides.map(o => (
                <Box
                  key={o.id}
                  sx={{
                    py: '6px',
                    px: '12px',
                    borderRadius: '8px',
                    bgcolor: 'rgba(255,107,107,.1)',
                    border: '1px solid rgba(255,107,107,.2)',
                    fontSize: 12,
                    color: d.red,
                  }}
                >
                  {formatOverrideChip(o)}
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setSalonOverrides(x => x.filter(y => y.id !== o.id))}
                    sx={{
                      ml: 1,
                      border: 'none',
                      background: 'none',
                      color: d.mutedDark,
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    ×
                  </Box>
                </Box>
              ))}
              {!showAddOv ? (
                <Button type="button" onClick={() => setShowAddOv(true)} sx={mockBtn}>
                  + Добавить
                </Button>
              ) : (
                <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                  <Box
                    component="input"
                    type="date"
                    value={newOv.onDate}
                    onChange={e => setNewOv(v => ({ ...v, onDate: e.target.value }))}
                    sx={{
                      background: d.input,
                      border: `1px solid ${d.inputBorder}`,
                      borderRadius: 1,
                      p: 1,
                      color: d.text,
                      fontSize: 12,
                    }}
                  />
                  <Button
                    type="button"
                    size="small"
                    onClick={() => setNewOv(v => ({ ...v, isClosed: !v.isClosed }))}
                    sx={mockBtn}
                  >
                    {newOv.isClosed ? 'Закрыто' : 'Открыто'}
                  </Button>
                  <Button
                    type="button"
                    onClick={addOverride}
                    sx={{
                      ...mockBtn,
                      bgcolor: d.accent,
                      color: d.onAccent,
                      '&:hover': { bgcolor: d.accentDark },
                    }}
                  >
                    OK
                  </Button>
                  <Button type="button" onClick={() => setShowAddOv(false)} sx={mockBtn}>
                    Отмена
                  </Button>
                </Stack>
              )}
            </Stack>
          </Box>

          <Box sx={{ mt: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>
              Длительность слота записи
            </Typography>
            <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 1.25 }}>
              Минимальный интервал между записями на одного мастера
            </Typography>
            <Stack direction="row" gap={1}>
              {([15, 30, 60] as const).map(m => (
                <Button
                  key={m}
                  type="button"
                  onClick={() => setSlotMin(m)}
                  sx={{
                    ...mockBtn,
                    bgcolor: slotMin === m ? d.accent : d.control,
                    color: slotMin === m ? d.onAccent : d.mutedDark,
                    fontWeight: slotMin === m ? 600 : 500,
                    '&:hover': {
                      bgcolor: slotMin === m ? d.accentDark : d.controlHover,
                      color: d.onAccent,
                    },
                  }}
                >
                  {m} мин
                </Button>
              ))}
            </Stack>
          </Box>
        </>
      )}

      {/* STAFF */}
      {!isSalon && staffId && selectedStaff && (
        <>
          <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: avatarBg,
                color: avatarFg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {staffInitials(selectedStaff.staff.displayName)}
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                {selectedStaff.staff.displayName} — Индивидуальное расписание
              </Typography>
              <Typography sx={{ fontSize: 12, color: d.mutedDark }}>
                Отличия от базового расписания салона выделены
              </Typography>
            </Box>
            <Button type="button" onClick={resetStaffFromSalon} sx={mockBtn}>
              Сбросить к базовому
            </Button>
            <Button
              type="button"
              onClick={() => void saveStaff()}
              sx={{
                ...mockBtn,
                bgcolor: d.accent,
                color: d.onAccent,
                fontWeight: 600,
                '&:hover': { bgcolor: d.accentDark, color: d.onAccent },
              }}
            >
              Сохранить
            </Button>
          </Stack>

          <Box
            sx={{ bgcolor: d.card, borderRadius: '10px', p: 2, border: `1px solid ${d.grid}` }}
          >
            {staffLocal.map((l, i) => {
              const s = salonByDay.get(l.day)
              const showDiff = dayDiffersFromSalon(l, s)
              return (
                <Box
                  key={l.day}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    py: 1.25,
                    borderBottom: i < FULL_DAYS.length - 1 ? `1px solid ${d.input}` : 'none',
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography
                    sx={{ fontSize: 13, color: d.text, width: 90, flexShrink: 0, fontWeight: 500 }}
                  >
                    {FULL_DAYS[i]}
                  </Typography>
                  <ToggleSwitch
                    checked={!l.dayOff}
                    onChange={v =>
                      setStaffLocal(p => p.map(x => (x.day === l.day ? { ...x, dayOff: !v } : x)))
                    }
                  />
                  {!l.dayOff ? (
                    <>
                      <TimeInput
                        value={l.opens}
                        onChange={v =>
                          setStaffLocal(p => p.map(x => (x.day === l.day ? { ...x, opens: v } : x)))
                        }
                      />
                      <Typography sx={{ color: d.mutedDark, fontSize: 12 }}>—</Typography>
                      <TimeInput
                        value={l.closes}
                        onChange={v =>
                          setStaffLocal(p =>
                            p.map(x => (x.day === l.day ? { ...x, closes: v } : x)),
                          )
                        }
                      />
                      {showDiff && (
                        <Typography sx={{ fontSize: 11, color: d.yellow, ml: 1 }} component="span">
                          ≠ салон
                        </Typography>
                      )}
                    </>
                  ) : (
                    <Typography sx={{ fontSize: 12, color: d.red, ml: 0.5 }}>Выходной</Typography>
                  )}
                </Box>
              )
            })}
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
              Отпуск / Больничный / Особые дни
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
              {absences.map(a => (
                <Box
                  key={a.id}
                  sx={{
                    py: '6px',
                    px: '12px',
                    borderRadius: '8px',
                    bgcolor: 'rgba(78,205,196,.1)',
                    border: '1px solid rgba(78,205,196,.2)',
                    fontSize: 12,
                    color: d.blue,
                  }}
                >
                  {formatAbsenceChip(a)}
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setAbsences(x => x.filter(y => y.id !== a.id))}
                    sx={{
                      ml: 1,
                      border: 'none',
                      background: 'none',
                      color: d.mutedDark,
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    ×
                  </Box>
                </Box>
              ))}
              {!showAddAbs ? (
                <Button type="button" onClick={() => setShowAddAbs(true)} sx={mockBtn}>
                  + Добавить отсутствие
                </Button>
              ) : (
                <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                  <Box
                    component="input"
                    type="date"
                    value={newAbs.startsOn}
                    onChange={e => setNewAbs(v => ({ ...v, startsOn: e.target.value }))}
                    sx={{
                      background: d.input,
                      border: `1px solid ${d.inputBorder}`,
                      borderRadius: 1,
                      p: 1,
                      color: d.text,
                      fontSize: 12,
                    }}
                  />
                  <Box
                    component="input"
                    type="date"
                    value={newAbs.endsOn}
                    onChange={e => setNewAbs(v => ({ ...v, endsOn: e.target.value }))}
                    sx={{
                      background: d.input,
                      border: `1px solid ${d.inputBorder}`,
                      borderRadius: 1,
                      p: 1,
                      color: d.text,
                      fontSize: 12,
                    }}
                  />
                  <Box
                    component="input"
                    value={newAbs.kind}
                    onChange={e => setNewAbs(v => ({ ...v, kind: e.target.value }))}
                    placeholder="vacation / sick"
                    sx={{
                      background: d.input,
                      border: `1px solid ${d.inputBorder}`,
                      borderRadius: 1,
                      p: 1,
                      color: d.text,
                      fontSize: 12,
                      width: 120,
                    }}
                  />
                  <Button
                    type="button"
                    onClick={addAbsence}
                    sx={{ ...mockBtn, bgcolor: d.accent, color: d.onAccent }}
                  >
                    OK
                  </Button>
                  <Button type="button" onClick={() => setShowAddAbs(false)} sx={mockBtn}>
                    Отмена
                  </Button>
                </Stack>
              )}
            </Stack>
          </Box>

          {/* week-schedule-grid */}
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
              Обзор недели — {weekTitle}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '100px repeat(7, 1fr)',
                gap: '1px',
                bgcolor: d.grid,
                borderRadius: '10px',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  bgcolor: d.dialog,
                  py: 1.25,
                  px: 1,
                  fontSize: 11,
                  fontWeight: 600,
                  textAlign: 'center',
                  color: d.mutedDark,
                }}
              >
                Мастер
              </Box>
              {WSG_DOW.map((dow, j) => {
                const cell = new Date(weekMonday)
                cell.setDate(cell.getDate() + j)
                const today = new Date()
                const isToday = cell.toDateString() === today.toDateString()
                return (
                  <Box
                    key={dow}
                    sx={{
                      bgcolor: d.dialog,
                      py: 1.25,
                      px: 1,
                      fontSize: 11,
                      fontWeight: 600,
                      textAlign: 'center',
                      color: isToday ? d.accent : d.mutedDark,
                    }}
                  >
                    {dow} {cell.getDate()}
                  </Box>
                )
              })}

              <Box
                sx={{
                  bgcolor: d.timeColumn,
                  py: 1.25,
                  px: 1.5,
                  fontSize: 11,
                  fontWeight: 600,
                  color: d.accent,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {shortStaffLabel(selectedStaff.staff.displayName)}
              </Box>
              {staffLocal.map((l, j) => {
                const cell = new Date(weekMonday)
                cell.setDate(cell.getDate() + j)
                const today = new Date()
                const isToday = cell.toDateString() === today.toDateString()
                return (
                  <Box
                    key={l.day}
                    sx={{
                      bgcolor: d.card,
                      p: 1,
                      minHeight: 56,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...(isToday ? { bgcolor: 'rgba(107,203,119,.06)' } : {}),
                      ...(l.dayOff ? { bgcolor: 'rgba(255,107,107,.04)' } : {}),
                    }}
                  >
                    {l.dayOff ? (
                      <Box
                        sx={{
                          bgcolor: 'rgba(255,107,107,.08)',
                          border: '1px solid rgba(255,107,107,.2)',
                          borderRadius: '6px',
                          py: 0.5,
                          px: 1,
                          fontSize: 10,
                          color: d.red,
                          textAlign: 'center',
                          width: '100%',
                        }}
                      >
                        Вых.
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          bgcolor: 'rgba(107,203,119,.12)',
                          border: '1px solid rgba(107,203,119,.3)',
                          borderRadius: '6px',
                          py: 0.5,
                          px: 1,
                          fontSize: 10,
                          color: d.green,
                          textAlign: 'center',
                          width: '100%',
                        }}
                      >
                        {compactTimeRange(l.opens, l.closes)}
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Box>
          </Box>
        </>
      )}

      {!isSalon && !staff.length && (
        <Typography sx={{ color: d.mutedDark, fontSize: 13 }}>
          Добавьте мастеров в разделе «Мастера».
        </Typography>
      )}
    </Box>
  )
}
