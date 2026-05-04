import { ChangeEvent, JSX, useRef, useState } from 'react'
import { addDays, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns'
import { Box, Button, GlobalStyles, MenuItem, Popover, Select, SelectChangeEvent } from '@mui/material'
import { DateRangeCalendar } from '@mui/x-date-pickers-pro'
import { useDashboardFilterSelectSx } from '@pages/dashboard/theme/dashboardFilterSelectSx'
import { V } from '@shared/theme/palettes'
import { STATUS_LABELS, type DatePreset } from '@entities/appointment'
import { PillChip } from '@features/appointment/show-appointments/ui/PillChip'
import type { MasterSalonMembershipDTO } from '@entities/master'

export interface MasterAppointmentFilterState {
  preset: DatePreset
  from: string
  to: string
  statuses: string[]
  source: string
  search: string
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Сегодня',
  tomorrow: 'Завтра',
  week: 'Эта неделя',
  custom: 'Период',
}

function getPresetRange(preset: DatePreset): { from: string; to: string } | null {
  if (preset === 'today')
    return { from: startOfDay(new Date()).toISOString(), to: endOfDay(new Date()).toISOString() }
  if (preset === 'tomorrow')
    return {
      from: startOfDay(addDays(new Date(), 1)).toISOString(),
      to: endOfDay(addDays(new Date(), 1)).toISOString(),
    }
  if (preset === 'week')
    return { from: startOfWeek(new Date()).toISOString(), to: endOfWeek(new Date()).toISOString() }
  return null
}

interface Props {
  filters: MasterAppointmentFilterState
  setFilters: (f: MasterAppointmentFilterState) => void
  salons: MasterSalonMembershipDTO[]
  onNewAppointment?: () => void
}

export default function MasterFilterAppointmentsBar({
  filters,
  setFilters,
  salons,
  onNewAppointment,
}: Props): JSX.Element {
  const { filterSelectSx, menuPaperSx, menuItemSx } = useDashboardFilterSelectSx()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [localSearch, setLocalSearch] = useState(filters.search)
  const fromDate = filters.from ? new Date(filters.from + 'T00:00:00') : null
  const toDate = filters.to ? new Date(filters.to + 'T00:00:00') : null

  function setPreset(preset: DatePreset) {
    if (preset === 'custom') {
      setFilters({ ...filters, preset })
      return
    }
    const range = getPresetRange(preset)!
    setFilters({ ...filters, preset, from: range.from, to: range.to })
  }

  function onSearchChange(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setLocalSearch(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setFilters({ ...filters, search: v }), 300)
  }

  const [calAnchor, setCalAnchor] = useState<HTMLDivElement | null>(null)
  const [calOpen, setCalOpen] = useState(false)
  const hasActive = filters.statuses.length > 0 || !!filters.source

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2.5 }}>
      <GlobalStyles
        styles={{
          '.MuiDateRangeCalendar-root > div[style*="z-index: 100000"], .MuiDateRangeCalendar-root > div[style*="letter-spacing: 5px"]':
            { display: 'none !important' },
        }}
      />
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box
          sx={{
            display: 'flex',
            gap: '3px',
            p: '3px',
            bgcolor: V.surfaceEl,
            borderRadius: V.rSm,
            border: `1px solid ${V.border}`,
            position: 'relative',
          }}
        >
          {(['today', 'tomorrow', 'week'] as DatePreset[]).map(p => (
            <PillChip key={p} active={filters.preset === p} onClick={() => setPreset(p)}>
              {DATE_PRESET_LABELS[p]}
            </PillChip>
          ))}
          <Box ref={setCalAnchor}>
            <PillChip active={filters.preset === 'custom'} onClick={() => setCalOpen(v => !v)}>
              Задать период
            </PillChip>
          </Box>
          <Popover
            open={calOpen}
            anchorEl={calAnchor}
            onClose={() => setCalOpen(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            slotProps={{
              paper: {
                sx: {
                  bgcolor: V.surface,
                  border: `1px solid ${V.border}`,
                  borderRadius: V.rLg,
                  overflow: 'hidden',
                  mt: 0.5,
                  boxShadow: '0 8px 32px rgba(212,84,122,0.12)',
                },
              },
            }}
          >
            <DateRangeCalendar
              calendars={2}
              value={[fromDate, toDate]}
              onChange={([from, to]) => {
                setFilters({
                  ...filters,
                  preset: 'custom',
                  from: from ? fmt(from) : '',
                  to: to ? fmt(to) : '',
                })
              }}
            />
          </Popover>
        </Box>

        <Box sx={{ flex: 1 }} />

        {onNewAppointment && (
          <Button variant="contained" size="small" onClick={onNewAppointment} sx={{ flexShrink: 0 }}>
            Новая запись
          </Button>
        )}

        <Box
          component="input"
          type="text"
          placeholder="Поиск по клиенту..."
          value={localSearch}
          onChange={onSearchChange}
          sx={{
            px: '10px',
            py: '6px',
            borderRadius: V.rSm,
            border: `1px solid ${V.border}`,
            bgcolor: V.surface,
            color: V.text,
            fontSize: 12,
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s',
            width: 190,
            '&::placeholder': { color: V.textMuted },
            '&:focus': { borderColor: V.accent },
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Select
          value={filters.statuses.join(',')}
          onChange={(e: SelectChangeEvent) =>
            setFilters({ ...filters, statuses: e.target.value.split(',').filter(Boolean) })
          }
          displayEmpty
          size="small"
          sx={filterSelectSx}
          MenuProps={{ PaperProps: { sx: menuPaperSx } }}
        >
          <MenuItem value="" sx={menuItemSx}>Все статусы</MenuItem>
          {Object.keys(STATUS_LABELS).map(s => (
            <MenuItem key={s} value={s} sx={menuItemSx}>
              {STATUS_LABELS[s]}
            </MenuItem>
          ))}
        </Select>

        <Select
          value={filters.source}
          onChange={(e: SelectChangeEvent) => setFilters({ ...filters, source: e.target.value })}
          displayEmpty
          size="small"
          sx={filterSelectSx}
          MenuProps={{ PaperProps: { sx: menuPaperSx } }}
        >
          <MenuItem value="" sx={menuItemSx}>Все источники</MenuItem>
          <MenuItem value="personal" sx={menuItemSx}>Личные записи</MenuItem>
          {salons.map(s => (
            <MenuItem key={s.salonId} value={s.salonId} sx={menuItemSx}>
              {s.salonName}
            </MenuItem>
          ))}
        </Select>

        {hasActive && (
          <Box
            component="button"
            onClick={() => setFilters({ ...filters, statuses: [], source: '' })}
            sx={{
              px: '10px',
              py: '5px',
              border: `1px solid ${V.error}55`,
              borderRadius: V.rMd,
              bgcolor: V.errorSoft,
              color: V.error,
              fontSize: 11,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all 0.15s',
              '&:hover': { bgcolor: `${V.error}18` },
            }}
          >
            Сбросить фильтры x
          </Box>
        )}
      </Box>
    </Box>
  )
}
