import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Autocomplete,
  Chip,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { ru } from 'date-fns/locale'

import {
  fetchDashboardServices,
  fetchDashboardStaff,
  type DashboardServiceRow,
  type DashboardStaffRow,
  staffListItemsToRows,
} from '@shared/api/dashboardApi'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { useDashboardFormStyles } from '@pages/dashboard/theme/formStyles'
import { useCreateAppointmentMutation } from '@entities/appointment/model/appointmentApi'
import { closeAppointmentDrawer } from '@entities/appointment'
import { useAppDispatch } from '@app/store'
import { enqueueFormSnackbar } from '@shared/ui/FormSnackbar'
import { formatPhone, parseOptionalRuPhone } from '@shared/lib/formatPhone'

export type CreateAppointmentDrawerProps = {
  open: boolean
  onClose: () => void
  initialData?: {
    startsAt?: string
    staffId?: string
    serviceIds?: string[]
  }
}

export function CreateAppointmentDrawer({
  open,
  onClose,
  initialData,
}: CreateAppointmentDrawerProps) {
  const d = useDashboardPalette()
  const { inputBaseSx, selectMenuSx } = useDashboardFormStyles()
  const dispatch = useAppDispatch()

  const [createAppointment, { isLoading }] = useCreateAppointmentMutation()

  const [form, setForm] = useState(() => ({
    guestName: '',
    guestPhone: '',
    note: '',
    startsAt: initialData?.startsAt ?? '',
    staffId: initialData?.staffId ?? '',
    serviceIds: initialData?.serviceIds?.length ? [...initialData.serviceIds] : [],
  }))
  const [services, setServices] = useState<DashboardServiceRow[]>([])
  const [staff, setStaff] = useState<DashboardStaffRow[]>([])

  useEffect(() => {
    if (open) {
      fetchDashboardServices().then(res => setServices(res.filter(s => s.isActive)))
      fetchDashboardStaff().then(res => setStaff(staffListItemsToRows(res)))
    }
  }, [open])

  const handleSubmit = async () => {
    if (form.serviceIds.length === 0)
      return enqueueFormSnackbar('Выберите хотя бы одну услугу', 'Error')
    if (!form.startsAt) return enqueueFormSnackbar('Выберите время начала', 'Error')
    if (!form.staffId) return enqueueFormSnackbar('Выберите мастера', 'Error')
    if (!form.guestName.trim()) return enqueueFormSnackbar('Введите имя гостя', 'Error')
    const guestPhoneParsed = parseOptionalRuPhone(form.guestPhone)
    if (guestPhoneParsed.kind === 'invalid') {
      return enqueueFormSnackbar('Некорректный телефон', 'Error')
    }
    try {
      await createAppointment({
        serviceIds: form.serviceIds,
        salonMasterId: form.staffId,
        startsAt: form.startsAt,
        guestName: form.guestName.trim(),
        guestPhone: guestPhoneParsed.kind === 'valid' ? guestPhoneParsed.e164 : '',
        clientNote: form.note.trim() || undefined,
      }).unwrap()
      dispatch(closeAppointmentDrawer())
      onClose()
    } catch (error) {
      enqueueFormSnackbar(
        error instanceof Error ? error.message : 'Ошибка при создании записи',
        'Error',
      )
    }
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ backdrop: { sx: { bgcolor: d.backdrop, backdropFilter: 'blur(4px)' } } }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: '440px' },
          maxWidth: '100%',
          bgcolor: d.page,
          borderLeft: `1px solid ${d.border}`,
          boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 2,
            borderBottom: `1px solid ${d.borderSubtle}`,
            bgcolor: d.card,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: d.text, lineHeight: 1.2 }}>
              Новая запись
            </Typography>
            <Typography sx={{ fontSize: 12, color: d.mutedDark }}>
              Заполнение деталей визита
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: d.mutedDark, bgcolor: d.control, '&:hover': { bgcolor: d.controlHover } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 3 }}>
          <Stack spacing={1}>
            <Box>
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>Услуги</Typography>
              <Stack spacing={1.5}>
                <Autocomplete
                  multiple
                  options={services}
                  getOptionLabel={option => option.name}
                  value={services.filter(s => form.serviceIds.includes(s.id))}
                  onChange={(_, newValue) => {
                    setForm(f => ({ ...f, serviceIds: newValue.map(v => v.id) }))
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
                <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>Мастер</Typography>
                <TextField
                  select
                  value={form.staffId}
                  onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <PersonOutlineIcon sx={{ color: d.mutedDark, fontSize: 18, mr: 1.5 }} />
                    ),
                  }}
                  SelectProps={{ MenuProps: selectMenuSx }}
                  sx={inputBaseSx}
                >
                  {staff.map(s => (
                    <MenuItem key={s.id} value={s.id} sx={{ py: 1 }}>
                      {s.displayName}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Box>

            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
              <Box>
                <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>
                  Дата и время
                </Typography>
                <DateTimePicker
                  value={form.startsAt ? new Date(form.startsAt) : null}
                  onChange={val => setForm(f => ({ ...f, startsAt: val ? val.toISOString() : '' }))}
                  ampm={false}
                  format="dd.MM.yyyy HH:mm"
                  views={['year', 'month', 'day', 'hours', 'minutes']}
                  slotProps={{ textField: { fullWidth: true, size: 'small', sx: inputBaseSx } }}
                />
              </Box>
            </LocalizationProvider>

            <Box>
              <Stack spacing={1} display="flex" flexDirection="column">
                <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>
                  Имя гостя
                </Typography>
                <TextField
                  value={form.guestName}
                  onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <ContentPasteIcon sx={{ color: d.mutedDark, fontSize: 18, mr: 1.5 }} />
                    ),
                  }}
                  sx={inputBaseSx}
                />
                <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>
                  Контактный телефон
                </Typography>
                <TextField
                  placeholder="+7 (___) ___ - __ - __"
                  value={form.guestPhone}
                  onChange={e => setForm(f => ({ ...f, guestPhone: formatPhone(e.target.value) }))}
                  inputMode="numeric"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <PhoneOutlinedIcon sx={{ color: d.mutedDark, fontSize: 18, mr: 1.5 }} />
                    ),
                  }}
                  sx={inputBaseSx}
                />
              </Stack>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ p: 3, borderTop: `1px solid ${d.borderSubtle}`, bgcolor: d.card }}>
          <Button
            variant="contained"
            fullWidth
            disabled={isLoading}
            onClick={() => void handleSubmit()}
            sx={{
              bgcolor: d.accent,
              color: d.onAccent,
              py: 1.75,
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: 15,
              textTransform: 'none',
              boxShadow: `0 4px 14px ${d.accent}40`,
              '&:hover': {
                bgcolor: d.accent,
                boxShadow: `0 6px 20px ${d.accent}60`,
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s',
            }}
          >
            {isLoading ? 'Создание...' : 'Создать запись'}
          </Button>
          <Typography sx={{ textAlign: 'center', mt: 1.5, fontSize: 11, color: d.mutedDark }}>
            Запись будет создана со статусом «Ожидает»
          </Typography>
        </Box>
      </Box>
    </Drawer>
  )
}
