import * as React from 'react'
import { useEffect } from 'react'
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  Stack,
  TextField,
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
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { useDashboardFormStyles } from '@pages/dashboard/theme/formStyles'
import {
  FormField,
  PanelHeader,
  FormSection,
  PanelFooter,
  PanelBtn,
  LevelSelector,
  ToggleRow,
  ColorSwatchPicker,
  ChipMultiSelect,
} from '@pages/dashboard/ui/components/formComponents'

function splitDisplayName(displayName: string): { firstName: string; lastName: string } {
  const t = displayName.trim()
  const sp = t.indexOf(' ')
  if (sp === -1) return { firstName: t, lastName: '' }
  return { firstName: t.slice(0, sp), lastName: t.slice(sp + 1).trim() }
}

function initialsFromParts(first: string, last: string): string {
  const f = first.trim()
  const l = last.trim()
  if (f && l) return (f[0]! + l[0]!).toUpperCase()
  if (f.length >= 2) return f.slice(0, 2).toUpperCase()
  return f.slice(0, 2).toUpperCase() || '?'
}

const LEVEL_OPTIONS = [
  { value: 'trainee', label: 'Стажёр',   hint: 'trainee' },
  { value: 'master',  label: 'Мастер',    hint: 'master'  },
  { value: 'senior',  label: 'Старший',   hint: 'senior'  },
  { value: 'top',     label: 'Топ',       hint: 'top'     },
]

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

// иконка мастера
const StaffIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

export function StaffFormModal(props: {
  open: boolean
  staffId: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const { open, staffId, onClose, onSaved } = props
  const d = useDashboardPalette()
  const { inputBaseSx, textareaSx, panelPaperSx, errorAlertSx } = useDashboardFormStyles()
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
  const lastName  = useWatch({ control, name: 'lastName' })
  const color     = useWatch({ control, name: 'color' })

  useEffect(() => {
    if (!open) return
    void (async () => {
      try {
        const s = await fetchDashboardServices()
        setServices(s.filter(x => x.isActive))
      } catch { /* ignore */ }
    })()
  }, [open])

  useEffect(() => {
    if (!open) return
    void (async () => {
      setSaveErr(null)
      if (!staffId) {
        reset({
          firstName: '', lastName: '', role: '', level: 'master',
          bio: '', phone: '', telegramUsername: '', email: '', joinedAt: '',
          dashboardAccess: false, telegramNotifications: true, isActive: true,
          serviceIds: [], color: STAFF_COLOR_SWATCHES[0],
        })
        return
      }
      try {
        const st = await fetchStaffDetail(staffId)
        const { firstName: fn, lastName: ln } = splitDisplayName(st.displayName)
        reset({
          firstName: fn, lastName: ln,
          role: st.role ?? '', level: st.level ?? 'master', bio: st.bio ?? '',
          phone: st.phone ?? '', telegramUsername: st.telegramUsername ?? '',
          email: st.email ?? '',
          joinedAt: typeof st.joinedAt === 'string' ? st.joinedAt.slice(0, 10) : '',
          dashboardAccess: st.dashboardAccess,
          telegramNotifications: st.telegramNotifications,
          isActive: st.isActive,
          serviceIds: st.serviceIds ?? [],
          color: st.color ?? STAFF_COLOR_SWATCHES[0],
        })
      } catch { /* ignore */ }
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
          sx: { bgcolor: d.backdrop, backdropFilter: 'blur(6px)' },
        },
      }}
      PaperProps={{ sx: panelPaperSx }}
    >
      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>

        <PanelHeader
          icon={<StaffIcon />}
          title={isEdit ? 'Редактировать мастера' : 'Новый мастер'}
          subtitle={isEdit ? 'Изменить данные мастера' : 'Добавление в команду салона'}
          onClose={onClose}
        />

        <DialogContent sx={{ px: 0, py: 0, overflow: 'auto', flex: '1 1 auto', minHeight: 0 }}>

          {saveErr && (
            <Box sx={{ px: 3, pt: 2 }}>
              <Alert severity="warning" sx={errorAlertSx}>{saveErr}</Alert>
            </Box>
          )}

          {/* СЕКЦИЯ 1: Внешний вид */}
          <FormSection num={1} name="Внешний вид">
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2.5,
                p: 2,
                bgcolor: d.card2,
                borderRadius: '12px',
                border: `1px solid ${d.border}`,
              }}
            >
              {/* Превью аватара */}
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '18px',
                  bgcolor: color,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 22,
                  flexShrink: 0,
                  letterSpacing: '.02em',
                }}
              >
                {initialsFromParts(firstName || '', lastName || '')}
              </Box>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Controller
                  name="color"
                  control={control}
                  render={({ field }) => (
                    <ColorSwatchPicker
                      colors={STAFF_COLOR_SWATCHES}
                      value={field.value ?? STAFF_COLOR_SWATCHES[0]!}
                      onChange={c => setValue('color', c)}
                    />
                  )}
                />
                <Box sx={{ fontSize: 11, color: d.mutedDark }}>
                  Аватар генерируется из инициалов
                </Box>
              </Box>
            </Box>
          </FormSection>

          {/* СЕКЦИЯ 2: Основное */}
          <FormSection num={2} name="Основное">
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Controller
                  name="firstName"
                  control={control}
                  render={({ field }) => (
                    <FormField label="Имя" required error={errors.firstName?.message}>
                      <TextField
                        {...field}
                        value={field.value ?? ''}
                        fullWidth
                        placeholder="Анна"
                        error={!!errors.firstName}
                        sx={inputBaseSx}
                      />
                    </FormField>
                  )}
                />
                <Controller
                  name="lastName"
                  control={control}
                  render={({ field }) => (
                    <FormField label="Фамилия">
                      <TextField
                        {...field}
                        value={field.value ?? ''}
                        fullWidth
                        placeholder="Соколова"
                        sx={inputBaseSx}
                      />
                    </FormField>
                  )}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <FormField label="Специализация">
                      <TextField
                        {...field}
                        value={field.value ?? ''}
                        fullWidth
                        placeholder="Стилист-колорист"
                        sx={inputBaseSx}
                      />
                    </FormField>
                  )}
                />
                <Controller
                  name="level"
                  control={control}
                  render={({ field }) => (
                    <FormField label="Уровень">
                      <LevelSelector
                        value={field.value ?? 'master'}
                        onChange={field.onChange}
                        options={LEVEL_OPTIONS}
                      />
                    </FormField>
                  )}
                />
              </Stack>

              <Controller
                name="bio"
                control={control}
                render={({ field }) => (
                  <FormField label="О мастере" hint="Видно клиентам на странице салона">
                    <TextField
                      {...field}
                      value={field.value ?? ''}
                      fullWidth
                      multiline
                      minRows={2}
                      placeholder="Опыт, специализация, подход…"
                      sx={textareaSx}
                    />
                  </FormField>
                )}
              />
            </Stack>
          </FormSection>

          {/* СЕКЦИЯ 3: Контакты */}
          <FormSection num={3} name="Контакты">
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <FormField label="Телефон">
                      <TextField
                        {...field}
                        value={field.value ?? ''}
                        fullWidth
                        placeholder="+7 916 234-56-78"
                        sx={inputBaseSx}
                      />
                    </FormField>
                  )}
                />
                <Controller
                  name="telegramUsername"
                  control={control}
                  render={({ field }) => (
                    <FormField label="Telegram">
                      <TextField
                        {...field}
                        value={field.value ?? ''}
                        fullWidth
                        placeholder="@username"
                        sx={inputBaseSx}
                      />
                    </FormField>
                  )}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <FormField label="Email" error={errors.email?.message}>
                      <TextField
                        {...field}
                        value={field.value ?? ''}
                        fullWidth
                        type="email"
                        placeholder="anna@example.com"
                        error={!!errors.email}
                        sx={inputBaseSx}
                      />
                    </FormField>
                  )}
                />
                <Controller
                  name="joinedAt"
                  control={control}
                  render={({ field }) => (
                    <FormField label="В команде с">
                      <TextField
                        {...field}
                        value={field.value ?? ''}
                        fullWidth
                        type="date"
                        sx={inputBaseSx}
                      />
                    </FormField>
                  )}
                />
              </Stack>
            </Stack>
          </FormSection>

          {/* СЕКЦИЯ 4: Услуги */}
          <FormSection num={4} name="Оказываемые услуги">
            <Controller
              name="serviceIds"
              control={control}
              render={({ field }) => (
                <ChipMultiSelect
                  items={services}
                  selected={field.value}
                  onChange={field.onChange}
                  getLabel={item => (item as DashboardServiceRow).name}
                  getId={item => item.id}
                />
              )}
            />
          </FormSection>

          {/* СЕКЦИЯ 5: Доступ и уведомления */}
          <FormSection num={5} name="Доступ и уведомления" last>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <ToggleRow
                  title="Показывать клиентам"
                  description="Мастер виден на странице салона"
                  checked={field.value}
                  onChange={field.onChange}
                  first
                />
              )}
            />
            <Controller
              name="dashboardAccess"
              control={control}
              render={({ field }) => (
                <ToggleRow
                  title="Доступ к расписанию"
                  description="Может просматривать свои записи"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name="telegramNotifications"
              control={control}
              render={({ field }) => (
                <ToggleRow
                  title="Уведомления в Telegram"
                  description="Сообщения о новых записях"
                  checked={field.value}
                  onChange={field.onChange}
                  last
                />
              )}
            />
          </FormSection>

        </DialogContent>

        <PanelFooter
          note="Поля со * обязательны"
          dangerAction={
            isEdit ? (
              <PanelBtn variant="danger" onClick={() => void handleDelete()}>
                Удалить мастера
              </PanelBtn>
            ) : undefined
          }
          actions={
            <>
              <PanelBtn variant="ghost" onClick={onClose}>Отмена</PanelBtn>
              <PanelBtn variant="primary" type="submit">Сохранить</PanelBtn>
            </>
          }
        />

      </Box>
    </Dialog>
  )
}
