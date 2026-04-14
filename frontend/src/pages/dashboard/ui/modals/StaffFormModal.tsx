import * as React from 'react'
import { useEffect } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import {
  STAFF_COLOR_SWATCHES,
  createDashboardStaff,
  deleteDashboardStaff,
  fetchDashboardServices,
  fetchStaffDetail,
  updateDashboardStaffFull,
  type DashboardServiceRow,
  type StaffFormPayload,
} from '@shared/api/dashboardApi'
import { mocha } from '@pages/dashboard/theme/mocha'

const MUTED = mocha.muted
const TEXT = mocha.text
const ACCENT = mocha.accent
const ACCENT2 = mocha.accentDark
const RED = mocha.red
const GREEN = mocha.green
const INPUT_BG = mocha.input

const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: INPUT_BG,
    borderRadius: '8px',
    '& fieldset': { borderColor: mocha.inputBorder },
    '&:hover fieldset': { borderColor: mocha.borderLight },
    '&.Mui-focused fieldset': { borderColor: ACCENT },
  },
  '& .MuiInputBase-input': { color: TEXT, fontSize: 13 },
  '& .MuiInputLabel-root': { color: MUTED, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
}

const textareaSx = {
  ...inputSx,
  '& .MuiInputBase-input': { fontFamily: 'inherit' },
}

/** Outlined labels must stay shrunk: custom label typography can break auto-shrink and overlap the value. */
const shrinkLabel = { InputLabelProps: { shrink: true } } as const

function splitDisplayName(displayName: string): { firstName: string; lastName: string } {
  const t = displayName.trim()
  const sp = t.indexOf(' ')
  if (sp === -1) return { firstName: t, lastName: '' }
  return { firstName: t.slice(0, sp), lastName: t.slice(sp + 1).trim() }
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Box
      component="label"
      sx={{
        position: 'relative',
        width: 36,
        height: 20,
        display: 'inline-block',
        flexShrink: 0,
        cursor: 'pointer',
      }}
    >
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '20px',
          bgcolor: checked ? 'rgba(107,203,119,.3)' : mocha.control,
          transition: '0.2s',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 14,
          height: 14,
          borderRadius: '50%',
          bgcolor: checked ? GREEN : '#888',
          top: 3,
          left: checked ? 19 : 3,
          transition: '0.2s',
          pointerEvents: 'none',
        }}
      />
    </Box>
  )
}

function FormSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      component="h4"
      sx={{
        fontSize: 13,
        fontWeight: 700,
        color: ACCENT,
        mt: 0,
        mb: 1.5,
        pb: 1,
        borderBottom: `1px solid ${mocha.grid}`,
      }}
    >
      {children}
    </Typography>
  )
}

function ModalToggleRow({
  title,
  subtitle,
  checked,
  onChange,
}: {
  title: string
  subtitle: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, py: 0.5 }}>
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{title}</Typography>
        <Typography sx={{ fontSize: 12, color: MUTED }}>{subtitle}</Typography>
      </Box>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </Box>
  )
}

const schema = yup.object({
  firstName: yup.string().required('Укажите имя'),
  lastName: yup.string().default(''),
  role: yup.string().optional(),
  level: yup.string().optional(),
  bio: yup.string().optional(),
  phone: yup.string().optional(),
  telegramUsername: yup.string().optional(),
  email: yup
    .string()
    .transform(v => (v === '' ? undefined : v))
    .optional()
    .email('Некорректный email')
    .nullable(),
  color: yup.string().optional(),
  joinedAt: yup.string().optional(),
  dashboardAccess: yup.boolean().required(),
  telegramNotifications: yup.boolean().required(),
  isActive: yup.boolean().required(),
  serviceIds: yup.array().of(yup.string().required()).default([]),
})

type FormVals = yup.InferType<typeof schema>

const LEVELS = [
  { v: 'trainee', l: 'Стажёр' },
  { v: 'master', l: 'Мастер' },
  { v: 'senior', l: 'Старший мастер' },
  { v: 'top', l: 'Топ-мастер' },
]

function initialsFromParts(first: string, last: string): string {
  const f = first.trim()
  const l = last.trim()
  if (f && l) return (f[0]! + l[0]!).toUpperCase()
  if (f.length >= 2) return f.slice(0, 2).toUpperCase()
  return f.slice(0, 2).toUpperCase() || '?'
}

export function StaffFormModal(props: {
  open: boolean
  staffId: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const { open, staffId, onClose, onSaved } = props
  const [services, setServices] = React.useState<DashboardServiceRow[]>([])
  const [saveErr, setSaveErr] = React.useState<string | null>(null)

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormVals>({
    resolver: yupResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dashboardAccess: false,
      telegramNotifications: true,
      isActive: true,
      serviceIds: [],
      color: STAFF_COLOR_SWATCHES[0],
      level: 'master',
    },
  })

  const firstName = useWatch({ control, name: 'firstName' })
  const lastName = useWatch({ control, name: 'lastName' })
  const color = useWatch({ control, name: 'color' })

  useEffect(() => {
    if (!open) return
    void (async () => {
      try {
        const s = await fetchDashboardServices()
        setServices(s.filter(x => x.isActive))
      } catch {
        /* ignore */
      }
    })()
  }, [open])

  useEffect(() => {
    if (!open) return
    void (async () => {
      setSaveErr(null)
      if (!staffId) {
        reset({
          firstName: '',
          lastName: '',
          role: '',
          level: 'master',
          bio: '',
          phone: '',
          telegramUsername: '',
          email: '',
          joinedAt: '',
          dashboardAccess: false,
          telegramNotifications: true,
          isActive: true,
          serviceIds: [],
          color: STAFF_COLOR_SWATCHES[0],
        })
        return
      }
      try {
        const st = await fetchStaffDetail(staffId)
        const { firstName: fn, lastName: ln } = splitDisplayName(st.displayName)
        reset({
          firstName: fn,
          lastName: ln,
          role: st.role ?? '',
          level: st.level ?? 'master',
          bio: st.bio ?? '',
          phone: st.phone ?? '',
          telegramUsername: st.telegramUsername ?? '',
          email: st.email ?? '',
          joinedAt: typeof st.joinedAt === 'string' ? st.joinedAt.slice(0, 10) : '',
          dashboardAccess: st.dashboardAccess,
          telegramNotifications: st.telegramNotifications,
          isActive: st.isActive,
          serviceIds: st.serviceIds ?? [],
          color: st.color ?? STAFF_COLOR_SWATCHES[0],
        })
      } catch {
        /* ignore */
      }
    })()
  }, [open, staffId, reset])

  async function onSubmit(v: FormVals) {
    setSaveErr(null)
    const displayName = `${v.firstName.trim()} ${(v.lastName ?? '').trim()}`.trim()
    const body: StaffFormPayload = {
      displayName,
      role: v.role || null,
      level: v.level || null,
      bio: v.bio || null,
      phone: v.phone || null,
      telegramUsername: v.telegramUsername || null,
      email: v.email || null,
      color: v.color || null,
      joinedAt: v.joinedAt || null,
      dashboardAccess: v.dashboardAccess,
      telegramNotifications: v.telegramNotifications,
      isActive: v.isActive,
      serviceIds: v.serviceIds,
    }
    try {
      if (!staffId) {
        await createDashboardStaff(body)
      } else {
        await updateDashboardStaffFull(staffId, body)
      }
      onSaved()
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Ошибка сохранения')
    }
  }

  async function handleDelete() {
    if (!staffId) return
    if (!confirm('Деактивировать мастера? Это действие нельзя отменить из формы.')) return
    setSaveErr(null)
    try {
      await deleteDashboardStaff(staffId)
      onSaved()
      onClose()
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Ошибка удаления')
    }
  }

  const isEdit = Boolean(staffId)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      scroll="paper"
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: mocha.backdrop,
            backdropFilter: 'blur(6px)',
          },
        },
      }}
      PaperProps={{
        sx: {
          bgcolor: mocha.dialog,
          color: TEXT,
          maxWidth: 680,
          width: '100%',
          borderRadius: '16px',
          border: `1px solid ${mocha.inputBorder}`,
          boxShadow: `0 32px 80px ${mocha.shadowDeep}`,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
        <Box
          sx={{
            flexShrink: 0,
            px: 3.5,
            pt: 3,
            pb: 2.25,
            borderBottom: `1px solid ${mocha.grid}`,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            bgcolor: mocha.dialog,
            zIndex: 2,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: TEXT }}>
              {isEdit ? 'Редактировать мастера' : 'Добавить мастера'}
            </Typography>
            <Typography sx={{ fontSize: 12, color: MUTED, mt: 0.25 }}>
              {isEdit ? 'Измените данные мастера' : 'Заполните информацию о мастере'}
            </Typography>
          </Box>
          <IconButton
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              bgcolor: mocha.grid,
              color: MUTED,
              '&:hover': { bgcolor: mocha.control, color: TEXT },
            }}
          >
            ✕
          </IconButton>
        </Box>

        <DialogContent
          sx={{
            px: 3.5,
            py: 3,
            overflow: 'auto',
            flex: '1 1 auto',
            minHeight: 0,
          }}
        >
          <Stack spacing={2.5}>
          {saveErr && (
            <Alert severity="warning" sx={{ bgcolor: mocha.warningBg, color: TEXT }}>
              {saveErr}
            </Alert>
          )}

          <Box>
          <FormSectionTitle>Аватар и цвет</FormSectionTitle>
          <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 1 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: color,
                color: TEXT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              {initialsFromParts(firstName || '', lastName || '')}
            </Box>
            <Box>
              <Typography sx={{ fontSize: 12, color: MUTED, mb: 1 }}>Цвет карточки мастера в календаре</Typography>
              <Stack direction="row" gap={0.75} flexWrap="wrap">
                {STAFF_COLOR_SWATCHES.map(c => (
                  <Box
                    key={c}
                    onClick={() => setValue('color', c)}
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: c,
                      cursor: 'pointer',
                      border: color === c ? '2px solid #fff' : '2px solid transparent',
                      transform: color === c ? 'scale(1.15)' : 'none',
                      transition: '0.15s',
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
          </Box>

          <Box>
          <FormSectionTitle>Основная информация</FormSectionTitle>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <Controller
              name="firstName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ''}
                  {...shrinkLabel}
                  label="Имя"
                  fullWidth
                  required
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                  sx={inputSx}
                />
              )}
            />
            <Controller
              name="lastName"
              control={control}
              render={({ field }) => (
                <TextField {...field} value={field.value ?? ''} {...shrinkLabel} label="Фамилия" fullWidth sx={inputSx} />
              )}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ''}
                  {...shrinkLabel}
                  label="Должность / Специализация"
                  placeholder="Стилист-колорист"
                  fullWidth
                  sx={inputSx}
                />
              )}
            />
            <Controller
              name="level"
              control={control}
              render={({ field }) => (
                <TextField {...field} value={field.value ?? ''} {...shrinkLabel} select label="Уровень" fullWidth sx={inputSx}>
                  {LEVELS.map(l => (
                    <MenuItem key={l.v} value={l.v}>
                      {l.l}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Stack>
          <Controller
            name="bio"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value ?? ''}
                {...shrinkLabel}
                label="Краткое описание (видно клиентам)"
                fullWidth
                multiline
                minRows={3}
                placeholder="Специализируюсь на окрашивании…"
                sx={textareaSx}
              />
            )}
          />
          </Box>

          <Box>
          <FormSectionTitle>Контакты</FormSectionTitle>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ''}
                  {...shrinkLabel}
                  label="Телефон"
                  placeholder="+7 916 234-56-78"
                  fullWidth
                  sx={inputSx}
                />
              )}
            />
            <Controller
              name="telegramUsername"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ''}
                  {...shrinkLabel}
                  label="Telegram"
                  placeholder="@anna_stylist"
                  fullWidth
                  sx={inputSx}
                />
              )}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1 }}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ''}
                  {...shrinkLabel}
                  label="Email (опционально)"
                  type="email"
                  fullWidth
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  sx={inputSx}
                />
              )}
            />
            <Controller
              name="joinedAt"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ''}
                  {...shrinkLabel}
                  label="В команде с"
                  type="date"
                  fullWidth
                  sx={inputSx}
                />
              )}
            />
          </Stack>
          </Box>

          <Box>
          <FormSectionTitle>Услуги мастера</FormSectionTitle>
          <Typography sx={{ fontSize: 12, color: MUTED, mb: 1 }}>Выберите услуги, которые выполняет мастер</Typography>
          <Controller
            name="serviceIds"
            control={control}
            render={({ field }) => (
              <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 1 }}>
                {services.map(sv => {
                  const on = field.value.includes(sv.id)
                  return (
                    <Box
                      key={sv.id}
                      component="button"
                      type="button"
                      onClick={() => {
                        if (on) field.onChange(field.value.filter((x: string) => x !== sv.id))
                        else field.onChange([...field.value, sv.id])
                      }}
                      sx={{
                        px: 1.5,
                        py: 0.625,
                        borderRadius: '8px',
                        fontSize: 12,
                        border: `1px solid ${mocha.inputBorder}`,
                        bgcolor: on ? 'rgba(216,149,107,0.15)' : INPUT_BG,
                        color: on ? ACCENT : MUTED,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        ...(on ? { borderColor: ACCENT } : {}),
                      }}
                    >
                      {sv.name}
                    </Box>
                  )
                })}
              </Stack>
            )}
          />
          </Box>

          <Box>
          <FormSectionTitle>Видимость и доступ</FormSectionTitle>
          <Stack spacing={1.5} sx={{ mb: 1 }}>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <ModalToggleRow
                  title="Показывать на странице салона"
                  subtitle="Мастер будет виден клиентам при выборе специалиста"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name="dashboardAccess"
              control={control}
              render={({ field }) => (
                <ModalToggleRow
                  title="Доступ к дашборду"
                  subtitle="Мастер может видеть свои записи в личном кабинете"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name="telegramNotifications"
              control={control}
              render={({ field }) => (
                <ModalToggleRow
                  title="Telegram-уведомления о записях"
                  subtitle="Отправлять мастеру уведомления о новых и изменённых записях"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Stack>
          </Box>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            flexShrink: 0,
            px: 3.5,
            py: 2.25,
            borderTop: `1px solid ${mocha.grid}`,
            bgcolor: mocha.dialog,
            justifyContent: 'flex-end',
            gap: 1.25,
            flexWrap: 'wrap',
          }}
        >
          {isEdit && (
            <Button
              type="button"
              onClick={() => void handleDelete()}
              sx={{
                mr: 'auto',
                color: RED,
                bgcolor: 'rgba(255,107,107,.15)',
                border: '1px solid rgba(255,107,107,.2)',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: 'rgba(255,107,107,.25)' },
              }}
            >
              Удалить мастера
            </Button>
          )}
          <Button
            type="button"
            onClick={onClose}
            sx={{
              bgcolor: mocha.grid,
              color: MUTED,
              textTransform: 'none',
              fontWeight: 600,
              px: 2.5,
              py: 1,
              borderRadius: '8px',
              '&:hover': { bgcolor: mocha.control, color: TEXT },
            }}
          >
            Отмена
          </Button>
          <Button
            type="submit"
            sx={{
              bgcolor: ACCENT,
              color: mocha.onAccent,
              textTransform: 'none',
              fontWeight: 600,
              px: 2.5,
              py: 1,
              borderRadius: '8px',
              '&:hover': { bgcolor: ACCENT2, color: mocha.onAccent },
            }}
          >
            Сохранить мастера
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
