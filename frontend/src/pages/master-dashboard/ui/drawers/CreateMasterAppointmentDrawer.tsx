import { useEffect, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { ru } from 'date-fns/locale'

import { getMasterServices, type MasterService } from '@shared/api/masterDashboardApi'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { useDashboardFormStyles } from '@pages/dashboard/theme/formStyles'
import { useCreateMasterPersonalAppointmentMutation } from '@entities/master'
import { enqueueFormSnackbar } from '@shared/ui/FormSnackbar'
import { formatPhone, parseOptionalRuPhone } from '@shared/lib/formatPhone'

export type CreateMasterAppointmentDrawerProps = {
  open: boolean
  onClose: () => void
  onCreated?: () => void
  initialData?: {
    startsAt?: string
    serviceIds?: string[]
  }
}

export function CreateMasterAppointmentDrawer({
  open,
  onClose,
  onCreated,
  initialData,
}: CreateMasterAppointmentDrawerProps) {
  const d = useDashboardPalette()
  const { inputBaseSx } = useDashboardFormStyles()
  const [createAppointment, { isLoading }] = useCreateMasterPersonalAppointmentMutation()

  const [form, setForm] = useState(() => ({
    guestName: '',
    guestPhone: '',
    note: '',
    startsAt: initialData?.startsAt ?? '',
    serviceIds: initialData?.serviceIds?.length ? [...initialData.serviceIds] : ([] as string[]),
  }))
  const [services, setServices] = useState<MasterService[]>([])

  useEffect(() => {
    if (!open) return
    void getMasterServices()
      .then(res => setServices(res.filter(s => s.isActive)))
      .catch(() => setServices([]))
  }, [open])

  const handleClose = () => {
    onClose()
  }

  const handleSubmit = async () => {
    if (form.serviceIds.length === 0) return enqueueFormSnackbar('Выберите хотя бы одну услугу', 'Error')
    if (!form.startsAt) return enqueueFormSnackbar('Выберите время начала', 'Error')
    if (!form.guestName.trim()) return enqueueFormSnackbar('Введите имя клиента', 'Error')
    const guestPhoneParsed = parseOptionalRuPhone(form.guestPhone)
    if (guestPhoneParsed.kind === 'invalid') {
      return enqueueFormSnackbar('Некорректный телефон', 'Error')
    }
    try {
      await createAppointment({
        serviceIds: form.serviceIds,
        startsAt: form.startsAt,
        guestName: form.guestName.trim(),
        guestPhone: guestPhoneParsed.kind === 'valid' ? guestPhoneParsed.e164 : '',
        clientNote: form.note.trim() || undefined,
      }).unwrap()
      onCreated?.()
      handleClose()
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
      onClose={handleClose}
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
              Новая личная запись
            </Typography>
            <Typography sx={{ fontSize: 12, color: d.mutedDark }}>Визит по вашим услугам</Typography>
          </Box>
          <IconButton
            onClick={handleClose}
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
            </Box>

            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
              <Box>
                <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>Дата и время</Typography>
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
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>Имя клиента</Typography>
              <TextField
                value={form.guestName}
                onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <PersonOutlineIcon sx={{ color: d.mutedDark, fontSize: 18, mr: 1.5 }} />
                  ),
                }}
                sx={inputBaseSx}
              />
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5, mt: 1 }}>Телефон</Typography>
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
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5, mt: 1 }}>Комментарий</Typography>
              <TextField
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                fullWidth
                multiline
                minRows={2}
                sx={inputBaseSx}
              />
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
