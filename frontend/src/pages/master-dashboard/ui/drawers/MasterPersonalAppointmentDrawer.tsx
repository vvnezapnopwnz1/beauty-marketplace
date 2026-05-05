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
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { ru } from 'date-fns/locale'

import { getMasterServices, type MasterService } from '@shared/api/masterDashboardApi'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { useDashboardFormStyles } from '@pages/dashboard/theme/formStyles'
import {
  MasterAppointmentStatusBadge,
  MasterClientAsyncAutocomplete,
  usePatchMasterAppointmentStatusMutation,
  useUpdateMasterPersonalAppointmentMutation,
  type MasterAppointmentDTO,
  type MasterClientDTO,
} from '@entities/master'
import { enqueueFormSnackbar } from '@shared/ui/FormSnackbar'
import { formatPhone, parseOptionalRuPhone } from '@shared/lib/formatPhone'

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
  const [patchStatus, { isLoading: statusPatchLoading }] = usePatchMasterAppointmentStatusMutation()

  const [services, setServices] = useState<MasterService[]>([])
  const [form, setForm] = useState(() => ({
    serviceIds: appointment.serviceId ? [appointment.serviceId] : ([] as string[]),
    startsAt: appointment.startsAt,
    guestName: appointment.clientLabel ?? '',
    guestPhone: formatPhone(appointment.clientPhone ?? ''),
    note: appointment.clientNote ?? '',
  }))
  const [selectedClient, setSelectedClient] = useState<MasterClientDTO | null>(null)

  const editable = isPersonalAppointment(appointment)
  const showEditForm =
    editable && (appointment.status === 'pending' || appointment.status === 'confirmed')

  useEffect(() => {
    void getMasterServices()
      .then(res => setServices(res.filter(s => s.isActive)))
      .catch(() => setServices([]))
  }, [])

  const handleClose = () => onClose()

  const busy = isLoading || statusPatchLoading

  async function applyStatus(status: string) {
    try {
      await patchStatus({ id: appointment.id, status }).unwrap()
      handleClose()
    } catch (e) {
      enqueueFormSnackbar(e instanceof Error ? e.message : 'Ошибка', 'Error')
    }
  }

  const handleSave = async () => {
    if (!showEditForm) return
    if (form.serviceIds.length === 0)
      return enqueueFormSnackbar('Выберите хотя бы одну услугу', 'Error')
    if (!form.startsAt) return enqueueFormSnackbar('Выберите время начала', 'Error')
    if (!form.guestName.trim()) return enqueueFormSnackbar('Введите имя клиента', 'Error')
    const guestPhoneParsed = parseOptionalRuPhone(form.guestPhone)
    if (guestPhoneParsed.kind === 'invalid') {
      return enqueueFormSnackbar('Некорректный телефон', 'Error')
    }
    try {
      await updateAppointment({
        id: appointment.id,
        body: {
          serviceIds: form.serviceIds,
          startsAt: form.startsAt,
          guestName: form.guestName.trim(),
          guestPhone: guestPhoneParsed.kind === 'valid' ? guestPhoneParsed.e164 : null,
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
          <Typography sx={{ fontSize: 12, color: d.mutedDark, mt: 0.25 }}>
            {appointment.serviceName}
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
            Это запись салона. Редактирование и смена статуса из кабинета мастера недоступны — используйте
            кабинет салона.
          </Alert>
        )}

        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography sx={{ fontSize: 13, color: d.mutedDark }}>Статус:</Typography>
            <MasterAppointmentStatusBadge status={appointment.status} />

            {editable && appointment.status === 'pending' && (
              <>
                <Button
                  size="small"
                  variant="contained"
                  disabled={busy}
                  onClick={() => void applyStatus('confirmed')}
                  sx={{
                    bgcolor: d.green,
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '6px',
                    textTransform: 'none',
                    '&:hover': { bgcolor: d.green, transform: 'translateY(-1px)' },
                  }}
                >
                  Подтвердить
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={busy}
                  onClick={() => void applyStatus('cancelled_by_salon')}
                  sx={{
                    borderColor: d.red,
                    color: d.red,
                    fontSize: 11,
                    fontWeight: 700,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '6px',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: d.red,
                      bgcolor: `${d.red}10`,
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  Отменить
                </Button>
              </>
            )}

            {editable && appointment.status === 'confirmed' && (
              <>
                <Button
                  size="small"
                  variant="contained"
                  disabled={busy}
                  onClick={() => void applyStatus('completed')}
                  sx={{
                    bgcolor: d.accent,
                    color: d.onAccent,
                    fontSize: 11,
                    fontWeight: 700,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '6px',
                    textTransform: 'none',
                    '&:hover': { bgcolor: d.accent, transform: 'translateY(-1px)' },
                  }}
                >
                  Завершить
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={busy}
                  onClick={() => void applyStatus('no_show')}
                  sx={{
                    borderColor: d.mutedDark,
                    color: d.mutedDark,
                    fontSize: 11,
                    fontWeight: 700,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '6px',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: d.text,
                      bgcolor: `${d.mutedDark}14`,
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  Не пришёл
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={busy}
                  onClick={() => void applyStatus('cancelled_by_salon')}
                  sx={{
                    borderColor: d.red,
                    color: d.red,
                    fontSize: 11,
                    fontWeight: 700,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '6px',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: d.red,
                      bgcolor: `${d.red}10`,
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  Отменить
                </Button>
              </>
            )}
          </Stack>

          <Box>
            <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>Услуги</Typography>
            <Autocomplete
              multiple
              disabled={!showEditForm}
              options={services}
              getOptionLabel={option => option.name}
              value={services.filter(s => form.serviceIds.includes(s.id))}
              onChange={(_, newValue) => {
                setForm(f => ({ ...f, serviceIds: newValue.map(v => v.id) }))
              }}
              renderInput={params => (
                <TextField {...params} placeholder="Услуги" sx={inputBaseSx} />
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
                },
              }}
            />
          </Box>

          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
            <Box>
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>
                Дата и время
              </Typography>
              <DateTimePicker
                disabled={!showEditForm}
                value={form.startsAt ? new Date(form.startsAt) : null}
                onChange={val => setForm(f => ({ ...f, startsAt: val ? val.toISOString() : '' }))}
                ampm={false}
                format="dd.MM.yyyy HH:mm"
                views={['year', 'month', 'day', 'hours', 'minutes']}
                label="Дата и время"
                slotProps={{
                  textField: { fullWidth: true, size: 'small', sx: inputBaseSx },
                }}
              />
            </Box>
          </LocalizationProvider>

          <Box>
            <MasterClientAsyncAutocomplete
              clientName={form.guestName}
              selectedClient={selectedClient}
              onClientNameChange={name => setForm(f => ({ ...f, guestName: name }))}
              onSelectedClientChange={setSelectedClient}
              onClientPhoneFill={phone => setForm(f => ({ ...f, guestPhone: formatPhone(phone) }))}
              disabled={!showEditForm}
              textFieldSx={inputBaseSx}
            />
            <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5, mt: 1 }}>
              Телефон
            </Typography>
            <TextField
              disabled={!showEditForm}
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
            <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5, mt: 1 }}>
              Комментарий
            </Typography>
            <TextField
              disabled={!showEditForm}
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

      {editable && showEditForm && (
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

      {editable && !showEditForm && (
        <Box sx={{ p: 3, borderTop: `1px solid ${d.borderSubtle}`, bgcolor: d.card }}>
          <Button variant="outlined" fullWidth onClick={handleClose} sx={{ textTransform: 'none' }}>
            Закрыть
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
        <MasterPersonalAppointmentBody
          key={`${appointment.id}-${appointment.status}-${appointment.startsAt}-${appointment.clientLabel ?? ''}-${appointment.clientPhone ?? ''}-${appointment.clientNote ?? ''}-${appointment.serviceId}`}
          appointment={appointment}
          onClose={onClose}
        />
      ) : null}
    </Drawer>
  )
}
