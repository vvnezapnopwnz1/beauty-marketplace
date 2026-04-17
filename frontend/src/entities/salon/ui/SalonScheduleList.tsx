import { Box, Stack, Typography } from '@mui/material'
import type { WorkingHourRow } from '@entities/salon'
import { isOpenNow } from '@entities/salon/lib/isOpenNow'

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function SalonScheduleList({
  workingHours,
  schedule247,
  tz,
}: {
  workingHours: WorkingHourRow[]
  schedule247?: boolean
  tz: string
}) {
  if (schedule247) {
    return <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#059669' }}>Круглосуточно</Typography>
  }
  const open = isOpenNow(workingHours, tz)
  return (
    <Stack gap={1}>
      {workingHours.map(row => (
        <Box key={row.dayOfWeek} sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 14 }}>{DAYS[row.dayOfWeek] ?? '—'}</Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
            {row.isClosed ? 'Выходной' : `${row.opensAt} - ${row.closesAt}`}
          </Typography>
        </Box>
      ))}
      <Typography sx={{ fontSize: 12, color: open ? '#059669' : '#DC2626' }}>
        {open ? 'Открыто сейчас' : 'Закрыто'}
      </Typography>
    </Stack>
  )
}
