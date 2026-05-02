import { useEffect, useState } from 'react'
import {
  Alert,
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
import { useUpdateMasterPersonalAppointmentMutation, type MasterAppointmentDTO } from '@entities/master'
import { enqueueFormSnackbar } from '@shared/ui/FormSnackbar'

export type MasterPersonalAppointmentDrawerProps = {
  open: boolean
  appointment: MasterAppointmentDTO | null
  onClose: () => void
}

function isPersonalAppointment(row: MasterAppointmentDTO): boolean {
  return row.salonId == null || row.salonId === ''
}

function MasterPersonalAppointmentBody({
  appointment,
  onClose,
}: {
  appointment: MasterAppointmentDTO
  onClose: () => void
}) {
  const d = useDashboardPalette()
  const { inputBaseSx } = useDashboardFormStyles()
  const [updateAppointment, { isLoading }] = useUpdateMasterPersonalAppointmentMutation()

  const [services, setServices] = useState<MasterService[]>([])
  const [form, setForm] = useState(() => ({
    serviceIds: appointment.serviceId ? [appointment.serviceId] : ([] as string[]),
    startsAt: appointment.startsAt,
    guestName: appointment.clientLabel ?? '',
    guestPhone: appointment.clientPhone ?? '',
    note: appointment.clientNote ?? '',
  }))

  const editable = isPersonalAppointment(appointment)

  useEffect(() => {
    void getMasterServices()
      .then(res => setServices(res.filter(s => s.isActive)))
      .catch(() => setServices([]))
  }, [])

  const handleClose = () => onClose()

  const handleSave = async () => {
    if (!editable) return
    if (form.serviceIds.length === 0) return enqueueFormSnackbar('Выберите хотя бы одну услугу', 'Error')
    if (!form.startsAt) return enqueueFormSnackbar('Выберите время начала', 'Error')
    if (!form.guestName.trim()) return enqueueFormSnackbar('Введите имя клиента', 'Error')
    try {
      await updateAppointment({
        id: appointment.id,
        body: {
          serviceIds: form.serviceIds,
          startsAt: form.startsAt,
          guestName: form.guestName.trim(),
          guestPhone: form.guestPhone.trim() || null,
          clientNote: form.note.trim() || null,
        },
      }).unwrap()
      handleClose()
    } catch (e) {
      enqueueFormSnackbar(e instanceof Error ? e.message : 'Ошибка сохранения', 'Error')
    }
  }

  return (
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
            Запись
          </Typography>
          <Typography sx={{ fontSize: 12, color: d.mutedDark }}>
            {appointment.serviceName} · {appointment.status}
          </Typography>
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
        {!editable && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Это запись салона. Редактирование из кабинета мастера доступно только для личных визитов.
          </Alert>
        )}

        <Stack spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>Услуги</Typography>
            <Autocomplete
              multiple
              disabled={!editable}
              options={services}
              getOptionLabel={option => option.name}
              value={services.filter(s => form.serviceIds.includes(s.id))}
              onChange={(_, newValue) => {
                setForm(f => ({ ...f, serviceIds: newValue.map(v => v.id) }))
              }}
              renderInput={params => <TextField {...params} placeholder="Услуги" sx={inputBaseSx} />}
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
                },
              }}
            />
          </Box>

          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
            <Box>
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>Дата и время</Typography>
              <DateTimePicker
                disabled={!editable}
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
            <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>Клиент</Typography>
            <TextField
              disabled={!editable}
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
              disabled={!editable}
              value={form.guestPhone}
              onChange={e => setForm(f => ({ ...f, guestPhone: e.target.value }))}
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
              disabled={!editable}
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

      {editable && (
        <Box sx={{ p: 3, borderTop: `1px solid ${d.borderSubtle}`, bgcolor: d.card }}>
          <Button
            variant="contained"
            fullWidth
            disabled={isLoading}
            onClick={() => void handleSave()}
            sx={{
              bgcolor: d.accent,
              color: d.onAccent,
              py: 1.5,
              borderRadius: '12px',
              fontWeight: 700,
              textTransform: 'none',
            }}
          >
            {isLoading ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </Box>
      )}
    </Box>
  )
}

export function MasterPersonalAppointmentDrawer({
  open,
  appointment,
  onClose,
}: MasterPersonalAppointmentDrawerProps) {
  const d = useDashboardPalette()

  return (
    <Drawer
      anchor="right"
      open={open && !!appointment}
      onClose={onClose}
      slotProps={{ backdrop: { sx: { bgcolor: d.backdrop, backdropFilter: 'blur(4px)' } } }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: '440px' },
          maxWidth: '100%',
          bgcolor: d.page,
          borderLeft: `1px solid ${d.border}`,
        },
      }}
    >
      {appointment ? (
        <MasterPersonalAppointmentBody key={appointment.id} appointment={appointment} onClose={onClose} />
      ) : null}
    </Drawer>
  )
}
