import { useEffect, useState } from 'react'
import { Box, CircularProgress, Tooltip, Typography } from '@mui/material'
import { fetchAvailableSlots, type AvailableSlot } from '@shared/api/dashboardApi'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'

export interface SlotPickerProps {
  date: string
  serviceId?: string
  serviceIds?: string[]
  salonMasterId?: string
  value?: string
  onChange: (slot: AvailableSlot) => void
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function SlotPicker({ date, serviceId, serviceIds, salonMasterId, value, onChange }: SlotPickerProps) {
  const mocha = useDashboardPalette()
  const [loading, setLoading] = useState(false)
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!date) return
    let cancelled = false
    setLoading(true)
    setErr(null)
    ;(async () => {
      try {
        const res = await fetchAvailableSlots({ date, serviceId, serviceIds, salonMasterId })
        if (!cancelled) setSlots(res.slots)
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Ошибка')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [date, serviceId, JSON.stringify(serviceIds), salonMasterId])

  if (loading) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px',
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
          <Box
            key={i}
            sx={{
              height: 36,
              borderRadius: '10px',
              bgcolor: mocha.card,
              border: `1px solid ${mocha.border}`,
              opacity: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {i === 0 && <CircularProgress size={14} sx={{ color: mocha.mutedDark }} />}
          </Box>
        ))}
      </Box>
    )
  }

  if (err) {
    return <Typography sx={{ color: mocha.red, fontSize: 13 }}>Не удалось загрузить расписание.</Typography>
  }

  if (slots.length === 0) {
    return (
      <Typography sx={{ color: mocha.mutedDark, fontSize: 13 }}>
        В этот день нет свободного времени. Выберите другую дату.
      </Typography>
    )
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '6px',
      }}
    >
      {slots.map(s => {
        const isSelected = value === s.startsAt
        const label = formatTime(s.startsAt)
        const chip = (
          <Box
            key={s.startsAt + s.salonMasterId}
            component="button"
            type="button"
            onClick={() => onChange(s)}
            sx={{
              py: '9px',
              borderRadius: '10px',
              border: `1px solid ${isSelected ? mocha.accent : mocha.border}`,
              bgcolor: isSelected ? 'rgba(200,133,90,.12)' : mocha.card,
              fontSize: 12,
              fontWeight: isSelected ? 600 : 500,
              color: isSelected ? mocha.accent : mocha.muted,
              textAlign: 'center',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all .12s',
              '&:hover': {
                borderColor: mocha.borderLight,
                color: mocha.text,
              },
            }}
          >
            {label}
          </Box>
        )
        return salonMasterId ? chip : (
          <Tooltip key={s.startsAt + s.salonMasterId} title={s.masterName} arrow>
            {chip}
          </Tooltip>
        )
      })}
    </Box>
  )
}
