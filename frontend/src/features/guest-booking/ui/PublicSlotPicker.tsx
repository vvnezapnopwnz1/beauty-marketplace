import { useEffect, useMemo, useState } from 'react'
import { Box, CircularProgress, Stack, Typography } from '@mui/material'
import { fetchPublicSlots, type PublicAvailableSlot } from '@shared/api/salonApi'

export interface PublicSlotPickerProps {
  salonId: string
  serviceId?: string
  /** Combined slot query for several services (comma-separated on the API). */
  serviceIds?: string[]
  masterProfileId?: string
  /** Use when the master has no public master_profiles row; mutually exclusive with masterProfileId on the API. */
  salonMasterId?: string
  value?: string
  onChange: (slot: PublicAvailableSlot) => void
}

const DAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function iso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function PublicSlotPicker({
  salonId,
  serviceId,
  serviceIds,
  masterProfileId,
  salonMasterId,
  value,
  onChange,
}: PublicSlotPickerProps) {
  const dates = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(now.getDate() + i)
      return d
    })
  }, [])

  const [date, setDate] = useState<string>(iso(dates[0]!))
  const [loading, setLoading] = useState(false)
  const [slots, setSlots] = useState<PublicAvailableSlot[]>([])
  const [err, setErr] = useState<string | null>(null)

  const serviceIdsKey = useMemo(() => (serviceIds?.length ? serviceIds.join(',') : ''), [serviceIds])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErr(null)
    ;(async () => {
      try {
        const res = await fetchPublicSlots(salonId, {
          date,
          serviceIds: serviceIds?.length ? serviceIds : undefined,
          serviceId: serviceIds?.length ? undefined : serviceId,
          masterProfileId,
          salonMasterId,
        })
        if (!cancelled) setSlots(res.slots)
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [salonId, date, serviceId, serviceIds, serviceIdsKey, masterProfileId, salonMasterId])

  const showMasterLabels = !masterProfileId && !salonMasterId

  return (
    <Stack gap={1.5}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>Выберите время</Typography>
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
        {dates.map(d => {
          const v = iso(d)
          const selected = date === v
          return (
            <Box
              key={v}
              component="button"
              type="button"
              onClick={() => setDate(v)}
              sx={{
                minWidth: 48,
                height: 56,
                borderRadius: '12px',
                border: '1px solid',
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: selected ? 'primary.main' : 'background.paper',
                color: selected ? 'primary.contrastText' : 'text.primary',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontFamily: 'inherit',
                flexShrink: 0,
                transition: 'all .12s',
              }}
            >
              <Box sx={{ fontSize: 11, opacity: 0.75 }}>{DAY_SHORT[d.getDay()]}</Box>
              <Box sx={{ fontSize: 16, fontWeight: 600 }}>{d.getDate()}</Box>
            </Box>
          )
        })}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="caption" color="text.secondary">Загружаем расписание…</Typography>
        </Box>
      ) : err ? (
        <Typography variant="body2" color="error">Не удалось загрузить расписание.</Typography>
      ) : slots.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          В этот день нет свободного времени. Выберите другую дату.
        </Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: 1 }}>
          {slots.map(s => {
            const selected = value === s.startsAt
            return (
              <Box
                key={s.startsAt + s.salonMasterId}
                component="button"
                type="button"
                onClick={() => onChange(s)}
                sx={{
                  py: 0.75,
                  px: 1,
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: selected ? 'primary.main' : 'divider',
                  bgcolor: selected ? 'primary.main' : 'background.paper',
                  color: selected ? 'primary.contrastText' : 'text.primary',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.25,
                }}
              >
                <Box sx={{ fontSize: 13, fontWeight: 600 }}>{formatTime(s.startsAt)}</Box>
                {showMasterLabels && (
                  <Box sx={{ fontSize: 10, opacity: 0.75 }}>{s.masterName}</Box>
                )}
              </Box>
            )
          })}
        </Box>
      )}
    </Stack>
  )
}
