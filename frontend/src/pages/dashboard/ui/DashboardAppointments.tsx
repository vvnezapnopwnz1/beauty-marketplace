import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  MenuItem,
  Popover,
  Select,
  Stack,
  TextField,
  Tooltip,
  useTheme,
  Autocomplete,
  Chip,
  type SelectChangeEvent,
} from '@mui/material'
// import { styled } from '@mui/material/styles'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { ru } from 'date-fns/locale'
import {
  // DataGridPremium,
  GridToolbarColumnsButton,
  GridValidRowModel,
  type GridColDef,
  type GridPaginationModel,
  type GridRowParams,
  type GridSortModel,
} from '@mui/x-data-grid-premium'
import {
  fetchDashboardAppointments,
  patchAppointmentStatus,
  createDashboardAppointment,
  fetchDashboardServices,
  fetchDashboardStaff,
  staffListItemsToRows,
  type AvailableSlot,
  type DashboardAppointment,
  type DashboardServiceRow,
  type DashboardStaffRow,
} from '@shared/api/dashboardApi'
import { SlotPicker } from '@pages/dashboard/ui/components/SlotPicker'
import { AppointmentDrawer } from '@pages/dashboard/ui/drawers/AppointmentDrawer'
import { useDashboardFormStyles } from '@pages/dashboard/theme/formStyles'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import type { DashboardPalette } from '@shared/theme'
import {
  FormField,
  PanelHeader,
  FormSection,
  PanelFooter,
  PanelBtn,
  StaffPickGrid,
  type StaffPickItem,
} from '@pages/dashboard/ui/components/formComponents'
import { DateRangeCalendar } from '@mui/x-date-pickers-pro'
import RenderTable from '@shared/ui/DataGrid/RenderTable'

// ─── date filter ─────────────────────────────────────────────────────────────

type DatePreset = 'today' | 'tomorrow' | 'week' | 'custom'

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Сегодня',
  tomorrow: 'Завтра',
  week: 'Эта неделя',
  custom: 'Период',
}

const fmt = (d: Date) => d.toISOString().slice(0, 10)

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function getPresetRange(preset: DatePreset): { from: string; to: string } | null {
  const now = new Date()
  if (preset === 'today') {
    const s = fmt(now)
    return { from: s, to: s }
  }
  if (preset === 'tomorrow') {
    const t = addDays(now, 1)
    return { from: fmt(t), to: fmt(t) }
  }
  if (preset === 'week') {
    const d = now.getDay()
    const mon = addDays(now, -(d === 0 ? 6 : d - 1))
    const sun = addDays(mon, 6)
    return { from: fmt(mon), to: fmt(sun) }
  }
  return null
}

// ─── status config ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждена',
  completed: 'Завершена',
  cancelled_by_salon: 'Отмена',
  no_show: 'Не пришёл',
}

const ALL_STATUSES = Object.keys(STATUS_LABELS)

function statusColors(d: DashboardPalette, status: string) {
  const map: Record<string, { bg: string; color: string }> = {
    pending: { bg: 'rgba(255,217,61,.15)', color: d.yellow },
    confirmed: { bg: 'rgba(107,203,119,.15)', color: d.green },
    completed: { bg: 'rgba(78,205,196,.15)', color: d.blue },
    cancelled_by_salon: { bg: 'rgba(224,96,96,.15)', color: d.red },
    no_show: { bg: 'rgba(255,255,255,.07)', color: d.mutedDark },
  }
  return map[status] ?? { bg: 'rgba(255,255,255,.07)', color: d.mutedDark }
}

// ─── primitives ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  const d = useDashboardPalette()
  const { bg, color } = statusColors(d, status)
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1.25,
        py: 0.35,
        borderRadius: '20px',
        fontSize: 11,
        fontWeight: 600,
        bgcolor: bg,
        color,
        whiteSpace: 'nowrap',
        lineHeight: 1.5,
      }}
    >
      {STATUS_LABELS[status] ?? status}
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
        bgcolor: danger ? 'rgba(224,96,96,.15)' : active ? d.accent : d.control,
        color: danger ? d.red : active ? '#fff' : d.mutedDark,
        '&:hover': {
          bgcolor: danger ? 'rgba(224,96,96,.28)' : active ? d.accentDark : d.controlHover,
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

function ApptIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#6BCB77" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function todayISO(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ─── styled DataGrid ──────────────────────────────────────────────────────────

// const StyledGrid = styled(DataGridPremium, {
//   shouldForwardProp: p => p !== 'dashPalette',
// })<{ dashPalette: DashboardPalette }>(({ dashPalette: d }) => ({
//   border: `1px solid ${d.border}`,
//   borderRadius: '10px',
//   backgroundColor: d.card,
//   color: d.text,
//   fontFamily: 'inherit',
//   '& .MuiDataGrid-columnHeaders': {
//     backgroundColor: d.gridHeader,
//     borderBottom: `1px solid ${d.border}`,
//     borderRadius: '10px 10px 0 0',
//   },
//   '& .MuiDataGrid-columnHeaderTitle': {
//     fontWeight: 600,
//     fontSize: 11,
//     textTransform: 'uppercase',
//     letterSpacing: '.4px',
//     color: d.muted,
//   },
//   '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
//     outline: 'none',
//   },
//   '& .MuiDataGrid-columnSeparator': { color: d.border },

//   '& .MuiDataGrid-row': {
//     borderBottom: `1px solid ${d.borderSubtle}`,
//     cursor: 'pointer',
//     transition: 'background .12s',
//     '&:hover': { backgroundColor: d.controlHover },
//     '&.Mui-selected': { backgroundColor: `${d.accent}14` },
//     '&.Mui-selected:hover': { backgroundColor: `${d.accent}1e` },
//   },
//   '& .MuiDataGrid-cell': {
//     borderBottom: 'none',
//     color: d.text,
//     display: 'flex',
//     alignItems: 'center',
//     '&:focus, &:focus-within': { outline: 'none' },
//   },

//   '& .MuiDataGrid-footerContainer': {
//     borderTop: `1px solid ${d.border}`,
//     backgroundColor: d.gridHeader,
//     borderRadius: '0 0 10px 10px',
//   },
//   '& .MuiTablePagination-root': { color: d.muted },
//   '& .MuiTablePagination-selectIcon': { color: d.mutedDark },
//   '& .MuiIconButton-root': {
//     color: d.mutedDark,
//     '&:hover': { color: d.text },
//     '&.Mui-disabled': { color: d.borderLight },
//   },

//   '& .MuiDataGrid-toolbarContainer': {
//     padding: '8px 12px',
//     borderBottom: `1px solid ${d.borderSubtle}`,
//     gap: '8px',
//   },
//   '& .MuiButton-root': {
//     color: d.mutedDark,
//     fontSize: 12,
//     '&:hover': { color: d.text, backgroundColor: d.control },
//   },

//   '& .MuiDataGrid-overlayWrapper': { minHeight: 120 },
//   '& .MuiDataGrid-virtualScroller ': {
//     '@supports(overflow: overlay)': {
//       overflow: 'overlay',
//     },
//     overflow: 'overlay',
//     scrollbarGutter: 'auto',
//     '& + div': {
//       // watermark: none
//       display: 'none',
//       // marginTop: "0 !important"
//     },
//     '::-webkit-scrollbar': {
//       width: '8px',
//       height: '8px',
//       outline: 'none',
//     },
//     ':hover::-webkit-scrollbar': {
//       backgroundColor: d.controlHover,
//     },
//     ':hover::-webkit-scrollbar-thumb': {
//       backgroundColor: d.controlHover,
//       borderRadius: '15px',
//       border: 'none',
//     },
//     '::-webkit-scrollbar-thumb': {
//       backgroundColor: d.controlHover,
//       outline: 'none',
//       borderRadius: '15px',
//       border: 'none',
//     },
//   },
//   '& .cellInputField div, .cellSelectField div': {
//     borderRadius: 4,
//     border: `1px solid`,
//     fontSize: 12,
//     padding: '0px 10px',
//     display: 'flex',
//     alignItems: 'center',
//     height: '70%',
//     width: '100%',
//     justifyContent: 'space-between',
//   },
//   '.row--inactive': {},
//   '& .cellSwtichField svg': {
//     borderRadius: 4,
//     padding: '7px',
//     width: '40px',
//     height: '70%',
//   },
//   '& .cellSelectField .MuiDataGrid-cellContent:after': {
//     display: 'block',
//     content: `""`,
//     backgroundSize: '10px 10px',
//     height: '10px',
//     width: '10px',
//   },
//   '& .cellSelectField div div': {
//     border: 'none',
//   },
//   '& .cellSelectField div fieldset': {
//     border: 'none',
//   },
//   '& .MuiTablePagination-toolbar': {
//     overflow: 'auto',
//   },
//   '& .MuiTablePagination-toolbar nav': {
//     order: -1,
//   },
//   // '& .MuiDataGrid-columnHeader:last-child': {
//   //   border: 'none',
//   // },
//   '& .ColumnHeaderActions div': {
//     fontWeight: 400,
//     wordBreak: 'break-word',
//     whiteSpace: 'inherit',
//     lineHeight: 'normal',
//   },
//   '.MuiDataGrid-columnHeaderCheckbox .MuiDataGrid-columnHeaderTitleContainerContent': {
//     display: 'flex',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   '.MuiDataGrid-columnHeaderCheckbox .MuiDataGrid-columnHeaderTitleContainerContent .MuiCheckbox-root':
//     {
//       width: '44px',
//     },
//   '[data-field="isDummy"]': {
//     justifyContent: 'start',
//   },
//   // wrapper intialized over no results overlay in empty state
//   ' & .MuiDataGrid-overlayWrapperInner div': {
//     width: 'min(400px, 50%) !important',
//     height: 'min(400px, 50%) !important',
//   },
//   '& .MuiDataGrid-overlayWrapperInner': {
//     display: 'flex',
//     flexDirection: 'column',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   '& .editedCell .MuiDataGrid-cellContent': {
//     fontWeight: 'bold',
//   },
//   '& .editCell input': {
//     padding: '4px 8px 4px 2px',
//   },
//   '&.MuiDataGrid-root .MuiDataGrid-cell:focus': {
//     outline: 'none',
//   },
//   '& .rowSpanCell': {
//     paddingLeft: 0,
//     paddingRight: 0,
//   },
// }))

// ─── styled DatePicker ────────────────────────────────────────────────────────

// function StyledDatePicker({
//   label,
//   value,
//   onChange,
//   d,
// }: {
//   label: string
//   value: Date | null
//   onChange: (v: Date | null) => void
//   d: DashboardPalette
// }) {
//   return (
//     <DatePicker
//       label={label}
//       value={value}
//       onChange={onChange}
//       format="dd.MM.yyyy"
//       slotProps={{
//         textField: {
//           size: 'small',
//           sx: {
//             width: 148,
//             '& .MuiInputBase-root': {
//               bgcolor: d.input,
//               borderRadius: '6px',
//               fontSize: 12,
//               color: d.text,
//               height: '31px',
//             },
//             '& .MuiOutlinedInput-notchedOutline': { borderColor: d.border, top: 0 },
//             '& .MuiOutlinedInput-notchedOutline legend': { display: 'none' },
//             '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
//               borderColor: d.borderLight,
//             },
//             '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
//               borderColor: d.borderFocus,
//             },
//             '& .MuiInputBase-input': { py: 0, px: '10px', fontSize: 12, color: d.text },
//             '& .MuiInputLabel-root': { display: 'none' },
//             '& .MuiSvgIcon-root': { color: d.mutedDark, fontSize: 18 },
//           },
//         },
//         popper: {
//           sx: {
//             '& .MuiPaper-root': { bgcolor: d.card, color: d.text, border: `1px solid ${d.border}` },
//             '& .MuiPickersDay-root': { color: d.text, '&:hover': { bgcolor: d.control } },
//             '& .MuiPickersDay-root.Mui-selected': { bgcolor: d.accent, color: '#fff' },
//             '& .MuiPickersCalendarHeader-label': { color: d.text },
//             '& .MuiIconButton-root': { color: d.mutedDark },
//             '& .MuiDayCalendar-weekDayLabel': { color: d.muted },
//           },
//         },
//       }}
//     />
//   )
// }

// ─── toolbar ─────────────────────────────────────────────────────────────────

function AppointmentsToolbar({ setModal }: { setModal: (modal: boolean) => void }) {
  const d = useDashboardPalette()
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: '4px' }}>
      <GridToolbarColumnsButton />
      <Box sx={{ flex: 1 }} />
      <PillBtn active onClick={() => setModal(true)}>
        + Создать запись
      </PillBtn>
      <Box sx={{ width: 4, color: d.text }} />
    </Box>
  )
}

// ─── filter bar ──────────────────────────────────────────────────────────────

interface FilterState {
  preset: DatePreset
  from: string
  to: string
  statuses: string[]
  staffId: string
  serviceId: string
  search: string
}

function FilterBar({
  filters,
  setFilters,
  staff,
  services,
  setModal,
}: {
  filters: FilterState
  setFilters: (f: FilterState) => void
  staff: DashboardStaffRow[]
  services: DashboardServiceRow[]
  setModal: (modal: boolean) => void
}) {
  const d = useDashboardPalette()
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

  // function toggleStatus(s: string) {
  //   const next = filters.statuses.includes(s)
  //     ? filters.statuses.filter(x => x !== s)
  //     : [...filters.statuses, s]
  //   setFilters({ ...filters, statuses: next })
  // }

  function onSearchChange(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setLocalSearch(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setFilters({ ...filters, search: v })
    }, 300)
  }

  const filterSelectSx = {
    bgcolor: d.input,
    borderRadius: '6px',
    fontSize: 12,
    color: d.text,
    height: '31px',
    minWidth: 120,
    '& .MuiOutlinedInput-notchedOutline': { borderColor: d.border, top: 0 },
    '& .MuiOutlinedInput-notchedOutline legend': { display: 'none' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: d.borderLight },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: d.borderFocus },
    '& .MuiSelect-select': { py: 0, px: '10px' },
    '& .MuiSvgIcon-root': { color: d.mutedDark },
  }

  const inputBase = {
    px: '10px',
    py: '5px',
    borderRadius: '6px',
    border: `1px solid ${d.border}`,
    bgcolor: d.input,
    color: d.text,
    fontSize: 12,
    outline: 'none',
    fontFamily: 'inherit',
    '&::placeholder': { color: d.muted },
    '&:focus': { borderColor: d.borderFocus },
  }

  const [dateRangeAnchor, setDateRangeAnchor] = useState<HTMLDivElement | null>(null)
  const [dateRangeOpen, setDateRangeOpen] = useState(false)

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
        {/* row 1: presets + date range + search */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {(['today', 'tomorrow', 'week'] as DatePreset[]).map(p => (
            <PillBtn key={p} active={filters.preset === p} onClick={() => setPreset(p)}>
              {DATE_PRESET_LABELS[p]}
            </PillBtn>
          ))}
          {/* Date range calendar */}
          <Box ref={setDateRangeAnchor} sx={{ display: 'inline-flex' }}>
            <PillBtn active={filters.preset === 'custom'} onClick={() => setDateRangeOpen(v => !v)}>
              Задать период
            </PillBtn>
          </Box>
          <Popover
            open={dateRangeOpen}
            anchorEl={dateRangeAnchor}
            onClose={() => setDateRangeOpen(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            slotProps={{
              paper: {
                sx: {
                  bgcolor: d.card,
                  border: `1px solid ${d.border}`,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  mt: 0.5,
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
          <Box sx={{ flex: 1 }} />
          <Box
            component="input"
            type="text"
            placeholder="Поиск по клиенту..."
            value={localSearch}
            onChange={onSearchChange}
            sx={{ ...inputBase, width: 180 }}
          />{' '}
        </Box>

        {/* row 2: status chips + staff + service */}

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Select
            value={filters.statuses.join(',')}
            onChange={(e: SelectChangeEvent) =>
              setFilters({ ...filters, statuses: e.target.value.split(',') })
            }
            displayEmpty
            size="small"
            sx={filterSelectSx}
            MenuProps={{ PaperProps: { sx: { bgcolor: d.card, color: d.text } } }}
          >
            <MenuItem value="" sx={menuItemSx(d)}>
              Все статусы
            </MenuItem>
            {ALL_STATUSES.map(s => (
              <MenuItem key={s} value={s} sx={menuItemSx(d)}>
                {STATUS_LABELS[s]}
              </MenuItem>
            ))}
          </Select>
          <Select
            value={filters.staffId}
            onChange={(e: SelectChangeEvent) => setFilters({ ...filters, staffId: e.target.value })}
            displayEmpty
            size="small"
            sx={filterSelectSx}
            MenuProps={{ PaperProps: { sx: { bgcolor: d.card, color: d.text } } }}
          >
            <MenuItem value="" sx={menuItemSx(d)}>
              Все мастера
            </MenuItem>
            {staff.map(s => (
              <MenuItem key={s.id} value={s.id} sx={menuItemSx(d)}>
                {s.displayName}
              </MenuItem>
            ))}
          </Select>
          <Select
            value={filters.serviceId}
            onChange={(e: SelectChangeEvent) =>
              setFilters({ ...filters, serviceId: e.target.value })
            }
            displayEmpty
            size="small"
            sx={filterSelectSx}
            MenuProps={{ PaperProps: { sx: { bgcolor: d.card, color: d.text } } }}
          >
            <MenuItem value="" sx={menuItemSx(d)}>
              Все услуги
            </MenuItem>
            {services.map(s => (
              <MenuItem key={s.id} value={s.id} sx={menuItemSx(d)}>
                {s.name}
              </MenuItem>
            ))}
          </Select>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <PillBtn active onClick={() => setModal(true)}>
              + Создать запись
            </PillBtn>
          </Box>{' '}
        </Box>
      </Box>
    </LocalizationProvider>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function DashboardAppointments() {
  const d = useDashboardPalette()
  const theme = useTheme()
  const { inputBaseSx, panelPaperSmSx, errorAlertSx, selectMenuSx } = useDashboardFormStyles()

  const [rows, setRows] = useState<DashboardAppointment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [editAppt, setEditAppt] = useState<DashboardAppointment | null>(null)
  const [modal, setModal] = useState(false)
  const [services, setServices] = useState<DashboardServiceRow[]>([])
  const [staff, setStaff] = useState<DashboardStaffRow[]>([])

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  })
  const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'startsAt', sort: 'desc' }])

  const initRange = getPresetRange('today')!
  const [filters, setFilters] = useState<FilterState>({
    preset: 'today',
    from: initRange.from,
    to: initRange.to,
    statuses: [],
    staffId: '',
    serviceId: '',
    search: '',
  })

  const [createForm, setCreateForm] = useState({
    serviceIds: [] as string[],
    staffIds: [] as string[],
    status: 'pending',
    date: todayISO(),
    timeSlot: '',
    slotStartsAt: '',
    slotEndsAt: '',
    slotMasterId: '',
    guestName: '',
    guestPhone: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const sort = sortModel[0]
      const fieldMap: Record<string, string> = {
        startsAt: 'starts_at',
        serviceName: 'service_name',
        status: 'status',
        clientLabel: 'client_name',
      }
      const res = await fetchDashboardAppointments({
        from: filters.from || undefined,
        to: filters.to || undefined,
        statuses: filters.statuses.length ? filters.statuses : undefined,
        staffId: filters.staffId || undefined,
        serviceId: filters.serviceId || undefined,
        sortBy: sort ? (fieldMap[sort.field] ?? 'starts_at') : 'starts_at',
        sortDir: sort?.sort ?? 'desc',
        search: filters.search || undefined,
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
      })
      setRows(res.items)
      setTotal(res.total)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [filters, paginationModel, sortModel])

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
          setCreateForm(f =>
            f.serviceIds.length > 0 ? f : { ...f, serviceIds: s[0] ? [s[0].id] : [] },
          )
        } catch {
          /* ignore */
        }
      })()
    }, 0)
    return () => window.clearTimeout(t)
  }, [])

  const prevFilters = useRef(filters)
  const prevSort = useRef(sortModel)
  useEffect(() => {
    if (prevFilters.current !== filters || prevSort.current !== sortModel) {
      prevFilters.current = filters
      prevSort.current = sortModel
      setPaginationModel(m => (m.page === 0 ? m : { ...m, page: 0 }))
    }
  }, [filters, sortModel])

  async function setApptStatus(id: string, s: string) {
    try {
      await patchAppointmentStatus(id, s)
      void load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  async function submitCreate() {
    if (!createForm.slotStartsAt) {
      setErr('Выберите время')
      return
    }
    try {
      await createDashboardAppointment({
        serviceIds: createForm.serviceIds,
        salonMasterId: createForm.slotMasterId || createForm.staffIds[0] || null,
        startsAt: createForm.slotStartsAt,
        guestName: createForm.guestName,
        guestPhone: createForm.guestPhone,
      })
      setModal(false)
      void load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  function onPickSlot(slot: AvailableSlot) {
    setCreateForm(f => ({
      ...f,
      timeSlot: new Date(slot.startsAt).toTimeString().slice(0, 5),
      slotStartsAt: slot.startsAt,
      slotEndsAt: slot.endsAt,
      slotMasterId: slot.salonMasterId,
      staffIds: [slot.salonMasterId],
    }))
  }

  // ─── columns ────────────────────────────────────────────────────────────────

  const columns = useMemo(
    (): GridColDef<DashboardAppointment>[] => [
      {
        field: 'startsAt',
        headerName: 'Дата и время',
        width: 160,
        sortable: true,
        renderCell: ({ value }) => {
          if (!value) return '—'
          const dt = new Date(value as string)
          return dt.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        },
      },
      {
        field: 'clientLabel',
        headerName: 'Клиент',
        flex: 1,
        minWidth: 180,
        sortable: true,
        renderCell: ({ row }) => (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'start',
              gap: 1,
            }}
          >
            <Box sx={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{row.clientLabel}</Box>
            {row.clientPhone && <Box sx={{ fontSize: 11, color: d.muted }}>{row.clientPhone}</Box>}
          </Box>
        ),
      },
      {
        field: 'serviceName',
        headerName: 'Услуга',
        width: 200,
        sortable: true,
        renderCell: ({ value }) => (
          <Tooltip title={value as string} placement="top" enterDelay={400}>
            <Box
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 13,
                color: d.text,
              }}
            >
              {value as string}
            </Box>
          </Tooltip>
        ),
      },
      {
        field: 'staffName',
        headerName: 'Мастер',
        width: 160,
        sortable: false,
        renderCell: ({ value }) => (
          <Box sx={{ fontSize: 13, color: value ? d.text : d.muted }}>
            {(value as string | null) ?? '—'}
          </Box>
        ),
      },
      {
        field: 'status',
        headerName: 'Статус',
        width: 140,
        sortable: true,
        renderCell: ({ value }) => <StatusChip status={value as string} />,
      },
      {
        field: 'actions',
        headerName: '',
        minWidth: 250,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: ({ row }) => (
          <Box
            sx={{ display: 'flex', gap: '4px', alignItems: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <PillBtn compact onClick={() => setEditAppt(row)}>
              Редактировать
            </PillBtn>
            {row.status === 'pending' && (
              <>
                <PillBtn compact active onClick={() => void setApptStatus(row.id, 'confirmed')}>
                  ✓
                </PillBtn>
                <PillBtn
                  compact
                  danger
                  onClick={() => void setApptStatus(row.id, 'cancelled_by_salon')}
                >
                  ✗
                </PillBtn>
              </>
            )}
            {row.status === 'confirmed' && (
              <>
                <PillBtn compact active onClick={() => void setApptStatus(row.id, 'completed')}>
                  Готово
                </PillBtn>
                <PillBtn
                  compact
                  danger
                  onClick={() => void setApptStatus(row.id, 'cancelled_by_salon')}
                >
                  ✗
                </PillBtn>
              </>
            )}
            {row.status === 'cancelled_by_salon' && (
              <PillBtn compact onClick={() => void setApptStatus(row.id, 'pending')}>
                ↺
              </PillBtn>
            )}
          </Box>
        ),
      },
    ],
    [d, theme], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const staffPickItems: StaffPickItem[] = staff.map(s => ({ id: s.id, displayName: s.displayName }))

  return (
    <Box>
      {err && (
        <Alert severity="error" sx={{ ...errorAlertSx, mb: 2 }}>
          {err}
        </Alert>
      )}

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        staff={staff}
        services={services}
        setModal={setModal}
      />
      <Box>
        <RenderTable
          tableName="appointments"
          rows={rows}
          checkboxSelection={false}
          heightOffset={130}
          // dashboardPalette={d}
          sx={{
            boxShadow: `0 2px 16px ${d.shadowDeep}`,
            // ── toolbar ─────────────────────────────────────────────
            '& .MuiDataGrid-toolbarContainer': {
              padding: '8px 12px',
              borderBottom: `1px solid ${d.borderSubtle}`,
              backgroundColor: d.gridHeader,
              '& .MuiButton-root': {
                color: d.mutedDark,
                fontSize: 12,
                fontFamily: 'inherit',
                borderRadius: '6px',
                '&:hover': { backgroundColor: d.control, color: d.text },
              },
            },
            // ── checkboxes ──────────────────────────────────────────
            '& .MuiCheckbox-root': {
              color: d.borderLight,
              padding: '4px',
              '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: d.accent },
            },
            // ── footer / pagination ─────────────────────────────────
            '& .MuiDataGrid-footerContainer': {
              borderTop: `1px solid ${d.border}`,
              borderRadius: '0 0 10px 10px',
              overflow: 'hidden',
              '& > div': {
                backgroundColor: `${d.gridHeader} !important`,
                borderTop: 'none !important',
              },
            },
            '& .MuiTablePagination-root': { color: d.muted },
            '& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel': {
              color: d.muted,
              fontSize: 12,
              margin: 0,
            },
            '& .MuiTablePagination-select': { color: d.text, fontSize: 12 },
            '& .MuiDataGrid-footerContainer .MuiIconButton-root': {
              color: d.mutedDark,
              borderRadius: '6px',
              '&:hover': { backgroundColor: d.control, color: d.text },
              '&.Mui-disabled': { color: d.borderLight, opacity: 0.5 },
            },
            '& .MuiSelect-icon': { color: d.mutedDark },
            // ── scrollbars ──────────────────────────────────────────
            '& .MuiDataGrid-virtualScroller::-webkit-scrollbar': {
              width: '7px',
              height: '7px',
            },
            '& .MuiDataGrid-virtualScroller::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '& .MuiDataGrid-virtualScroller::-webkit-scrollbar-thumb': {
              backgroundColor: d.borderLight,
              borderRadius: '10px',
            },
            // ── pinned columns ──────────────────────────────────────
            '& .MuiDataGrid-pinnedColumns--right': {
              boxShadow: `0px 4px 16px 0px ${d.shadowDeep}`,
              backgroundColor: d.card,
            },
            '& .MuiDataGrid-pinnedColumnHeaders--right': {
              backgroundColor: d.gridHeader,
            },
          }}
          minHeight={600}
          columns={columns as GridColDef<GridValidRowModel>[]}
          getRowId={r => r.id}
          loading={loading}
          pagination={true}
          paginationMode="server"
          sortingMode="server"
          filterMode="server"
          rowCount={total}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          pageSizeOptions={[25, 50, 100]}
          density="comfortable"
          disableColumnMenu
          disableRowSelectionOnClick
          onRowClick={({ row }: GridRowParams<DashboardAppointment>) => setEditAppt(row)}
          slots={{
            toolbar: () => <AppointmentsToolbar setModal={setModal} />,
            loadingOverlay: () => (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                }}
              >
                <CircularProgress size={32} sx={{ color: d.accent }} />
              </Box>
            ),
            noRowsOverlay: () => (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: d.muted,
                  fontSize: 13,
                }}
              >
                Нет записей
              </Box>
            ),
          }}
        />
      </Box>

      {/* ═══════════════════ ДИАЛОГ: Создать запись ═══════════════════ */}
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

            <FormSection num={2} name="Услуга и мастер">
              <Stack spacing={1.5}>
                <FormField label="Услуги" required>
                  <Autocomplete
                    multiple
                    options={services}
                    getOptionLabel={option => option.name}
                    value={services.filter(s => createForm.serviceIds.includes(s.id))}
                    onChange={(_, newValue) => {
                      setCreateForm(f => ({ ...f, serviceIds: newValue.map(v => v.id) }))
                    }}
                    renderInput={params => (
                      <TextField {...params} placeholder="Выберите услуги" sx={inputBaseSx} />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          variant="outlined"
                          label={option.name}
                          size="small"
                          {...getTagProps({ index })}
                          key={option.id}
                          sx={{
                            borderRadius: '6px',
                            bgcolor: `${d.accent}10`,
                            borderColor: `${d.accent}40`,
                            color: d.text,
                            fontSize: 12,
                            height: 24,
                          }}
                        />
                      ))
                    }
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        p: '4px 8px !important',
                        bgcolor: d.input,
                        borderRadius: '10px',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: d.inputBorder,
                          top: 0,
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: d.borderLight,
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: d.borderFocus,
                        },
                      },
                    }}
                  />
                </FormField>
                <FormField label="Мастер">
                  <StaffPickGrid
                    items={staffPickItems}
                    selected={createForm.staffIds}
                    onChange={ids => setCreateForm(f => ({ ...f, staffIds: ids.slice(-1) }))}
                    allowNone
                  />
                </FormField>
                <FormField label="Статус записи">
                  <Select
                    value={createForm.status}
                    onChange={(e: SelectChangeEvent<string>) =>
                      setCreateForm(f => ({ ...f, status: e.target.value }))
                    }
                    displayEmpty
                    MenuProps={selectMenuSx}
                    sx={apptSelectSx(d)}
                  >
                    <MenuItem value="" disabled sx={menuItemSx(d)}>
                      Выберите статус…
                    </MenuItem>
                    {ALL_STATUSES.map(s => (
                      <MenuItem key={s} value={s} sx={menuItemSx(d)}>
                        {STATUS_LABELS[s]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormField>
              </Stack>
            </FormSection>

            <FormSection num={3} name="Дата и время">
              <Stack spacing={2}>
                <Box sx={{ maxWidth: 200 }}>
                  <DatePicker
                    value={new Date(createForm.date)}
                    onChange={val =>
                      val && setCreateForm(f => ({ ...f, date: val.toISOString().slice(0, 10) }))
                    }
                    slotProps={{
                      textField: { fullWidth: true, size: 'small', sx: inputBaseSx },
                    }}
                  />
                </Box>
                <Box>
                  {createForm.date && (
                    <SlotPicker
                      date={createForm.date}
                      serviceIds={createForm.serviceIds}
                      salonMasterId={createForm.staffIds[0] || undefined}
                      value={createForm.slotStartsAt}
                      onChange={onPickSlot}
                    />
                  )}
                </Box>
              </Stack>
            </FormSection>
          </DialogContent>
          <PanelFooter
            note="Запись со статусом «Ожидает»"
            actions={
              <>
                <PanelBtn variant="ghost" onClick={() => setModal(false)}>
                  Отмена
                </PanelBtn>
                <PanelBtn variant="success" onClick={() => void submitCreate()}>
                  Создать запись
                </PanelBtn>
              </>
            }
          />
        </Box>
      </Dialog>

      <AppointmentDrawer
        open={editAppt !== null}
        appointment={editAppt}
        onClose={() => setEditAppt(null)}
        onUpdated={() => void load()}
      />
    </Box>
  )
}
