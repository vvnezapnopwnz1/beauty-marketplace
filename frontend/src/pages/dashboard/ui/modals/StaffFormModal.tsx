import * as React from 'react'
import { useEffect } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useForm, Controller, useWatch, type Resolver } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import {
  STAFF_COLOR_SWATCHES,
  SPECIALIZATION_PRESETS,
  fetchDashboardServices,
  type DashboardServiceRow,
  type StaffFormPayload,
} from '@shared/api/dashboardApi'
import {
  useCreateMasterInviteMutation,
  useCreateStaffMutation,
  useDeleteStaffMutation,
  useLazyGetStaffByIdQuery,
  useLazyLookupMasterByPhoneQuery,
  useUpdateStaffMutation,
} from '@entities/staff'
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
  bio: yup.string().max(300, 'Не более 300 символов').optional(),
  specializations: yup.array().of(yup.string().required()).default(() => []),
  yearsExperience: yup
    .number()
    .transform((v, orig) => (orig === '' || orig == null ? undefined : v))
    .min(0, 'Минимум 0')
    .max(60, 'Максимум 60')
    .optional()
    .nullable(),
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
  const [createMode, setCreateMode] = React.useState<'new' | 'invite'>('new')
  const [invitePhone, setInvitePhone] = React.useState('')
  const [inviteLookupLoading, setInviteLookupLoading] = React.useState(false)
  const [inviteProfile, setInviteProfile] = React.useState<{
    id: string
    displayName: string
    bio?: string | null
    specializations: string[]
  } | null>(null)
  const [inviteNotFound, setInviteNotFound] = React.useState(false)
  /** Per selected service: optional override price (RUB) and duration (min). */
  const [svcOverrides, setSvcOverrides] = React.useState<Record<string, { priceRub: string; durMin: string }>>({})

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormVals>({
    resolver: yupResolver(schema) as unknown as Resolver<FormVals>,
    defaultValues: {
      firstName: '',
      lastName: '',
      dashboardAccess: false,
      telegramNotifications: true,
      isActive: true,
      serviceIds: [],
      specializations: [],
      yearsExperience: undefined as number | undefined,
      color: STAFF_COLOR_SWATCHES[0],
      level: 'master',
    },
  })

  const firstName = useWatch({ control, name: 'firstName' })
  const lastName  = useWatch({ control, name: 'lastName' })
  const color     = useWatch({ control, name: 'color' })
  const [fetchStaff] = useLazyGetStaffByIdQuery()
  const [createStaff] = useCreateStaffMutation()
  const [updateStaff] = useUpdateStaffMutation()
  const [deleteStaff] = useDeleteStaffMutation()
  const [lookupMaster] = useLazyLookupMasterByPhoneQuery()
  const [createMasterInvite] = useCreateMasterInviteMutation()

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
        setCreateMode('new')
        setInvitePhone('')
        setInviteProfile(null)
        setInviteNotFound(false)
        setSvcOverrides({})
        reset({
          firstName: '', lastName: '', role: '', level: 'master',
          bio: '', phone: '', telegramUsername: '', email: '', joinedAt: '',
          dashboardAccess: false, telegramNotifications: true, isActive: true,
          serviceIds: [], specializations: [], yearsExperience: undefined,
          color: STAFF_COLOR_SWATCHES[0],
        })
        return
      }
      try {
        const st = await fetchStaff(staffId).unwrap()
        const { firstName: fn, lastName: ln } = splitDisplayName(st.displayName)
        const profBio = st.masterProfile?.bio ?? st.bio ?? ''
        const specs = st.masterProfile?.specializations ?? []
        const ov: Record<string, { priceRub: string; durMin: string }> = {}
        for (const row of st.services ?? []) {
          ov[row.serviceId] = {
            priceRub:
              row.priceOverrideCents != null ? String(Math.round(row.priceOverrideCents / 100)) : '',
            durMin: row.durationOverrideMinutes != null ? String(row.durationOverrideMinutes) : '',
          }
        }
        setSvcOverrides(ov)
        reset({
          firstName: fn, lastName: ln,
          role: st.role ?? '', level: st.level ?? 'master', bio: profBio,
          phone: st.phone ?? '', telegramUsername: st.telegramUsername ?? '',
          email: st.email ?? '',
          joinedAt: typeof st.joinedAt === 'string' ? st.joinedAt.slice(0, 10) : '',
          dashboardAccess: st.dashboardAccess,
          telegramNotifications: st.telegramNotifications,
          isActive: st.isActive,
          serviceIds: st.serviceIds ?? [],
          specializations: specs,
          yearsExperience: st.masterProfile?.yearsExperience ?? undefined,
          color: st.color ?? STAFF_COLOR_SWATCHES[0],
        })
      } catch { /* ignore */ }
    })()
  }, [open, staffId, reset, fetchStaff])

  function rubToCents(s: string): number | null {
    const t = s.trim().replace(',', '.')
    if (!t) return null
    const n = Number(t)
    if (!Number.isFinite(n) || n < 0) return null
    return Math.round(n * 100)
  }

  function parseDur(s: string): number | null {
    const t = s.trim()
    if (!t) return null
    const n = parseInt(t, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  async function onSubmit(v: FormVals) {
    setSaveErr(null)
    const displayName = `${v.firstName.trim()} ${(v.lastName ?? '').trim()}`.trim()
    const serviceAssignments = v.serviceIds.map(id => ({
      serviceId: id,
      priceOverrideCents: rubToCents(svcOverrides[id]?.priceRub ?? ''),
      durationOverrideMinutes: parseDur(svcOverrides[id]?.durMin ?? ''),
    }))
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
      specializations: v.specializations ?? [],
      yearsExperience: v.yearsExperience ?? null,
      serviceAssignments,
    }
    try {
      if (!staffId) {
        await createStaff(body).unwrap()
      } else {
        await updateStaff({ id: staffId, body }).unwrap()
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
      await deleteStaff(staffId).unwrap()
      onSaved()
      onClose()
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Ошибка удаления')
    }
  }

  const isEdit = Boolean(staffId)

  async function onInviteLookup() {
    setSaveErr(null)
    setInviteProfile(null)
    setInviteNotFound(false)
    setInviteLookupLoading(true)
    try {
      const res = await lookupMaster(invitePhone).unwrap()
      if (!res.found || !res.profile) {
        setInviteNotFound(true)
        return
      }
      setInviteProfile({
        id: res.profile.id,
        displayName: res.profile.displayName,
        bio: res.profile.bio,
        specializations: res.profile.specializations ?? [],
      })
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Ошибка поиска')
    } finally {
      setInviteLookupLoading(false)
    }
  }

  async function onInviteSend() {
    if (!inviteProfile) return
    setSaveErr(null)
    try {
      await createMasterInvite(inviteProfile.id).unwrap()
      onSaved()
      onClose()
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Ошибка приглашения')
    }
  }

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
          title={isEdit ? 'Редактировать мастера' : 'Мастер'}
          subtitle={isEdit ? 'Изменить данные мастера' : 'Добавление в команду салона'}
          onClose={onClose}
        />

        <DialogContent sx={{ px: 0, py: 0, overflow: 'auto', flex: '1 1 auto', minHeight: 0 }}>

          {saveErr && (
            <Box sx={{ px: 3, pt: 2 }}>
              <Alert severity="warning" sx={errorAlertSx}>{saveErr}</Alert>
            </Box>
          )}

          {!isEdit && (
            <Box sx={{ px: 3, pt: 2, pb: 1 }}>
              <RadioGroup
                row
                value={createMode}
                onChange={(_, v) => {
                  setCreateMode(v as 'new' | 'invite')
                  setInviteProfile(null)
                  setInviteNotFound(false)
                }}
              >
                <FormControlLabel value="new" control={<Radio size="small" />} label="Новый мастер" />
                <FormControlLabel value="invite" control={<Radio size="small" />} label="Пригласить по телефону" />
              </RadioGroup>
            </Box>
          )}

          {!isEdit && createMode === 'invite' && (
            <Box sx={{ px: 3, pt: 1, pb: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: d.mutedDark, mb: 1, letterSpacing: '.04em' }}>
                Приглашение
              </Typography>
              <Stack spacing={1.5}>
                <TextField
                  label="Телефон (E.164)"
                  placeholder="+79161234567"
                  value={invitePhone}
                  onChange={e => setInvitePhone(e.target.value)}
                  sx={inputBaseSx}
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button variant="contained" disabled={inviteLookupLoading} onClick={() => void onInviteLookup()}>
                    Найти
                  </Button>
                  {inviteNotFound && (
                    <Typography sx={{ fontSize: 13, color: d.mutedDark }}>Профиль не найден</Typography>
                  )}
                </Stack>
                {inviteProfile && (
                  <Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${d.border}`, bgcolor: d.card2 }}>
                    <Typography sx={{ fontWeight: 600 }}>{inviteProfile.displayName}</Typography>
                    {inviteProfile.bio && (
                      <Typography sx={{ fontSize: 13, color: d.mutedDark, mt: 0.5 }}>{inviteProfile.bio}</Typography>
                    )}
                    <Button sx={{ mt: 1 }} variant="contained" onClick={() => void onInviteSend()}>
                      Пригласить в салон
                    </Button>
                  </Box>
                )}
              </Stack>
            </Box>
          )}

          {(!isEdit && createMode === 'invite') ? null : (
            <>
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
                  <FormField label="О мастере (профиль)" hint="До 300 символов; в публичном профиле мастера">
                    <TextField
                      {...field}
                      value={field.value ?? ''}
                      fullWidth
                      multiline
                      minRows={2}
                      inputProps={{ maxLength: 300 }}
                      placeholder="Опыт, подход…"
                      sx={textareaSx}
                    />
                  </FormField>
                )}
              />
              <Controller
                name="specializations"
                control={control}
                render={({ field }) => (
                  <FormField label="Специализации (профиль)">
                    <ChipMultiSelect
                      items={SPECIALIZATION_PRESETS.map(p => ({ id: p.value, label: p.label }))}
                      selected={field.value}
                      onChange={field.onChange}
                      getLabel={item => String(item['label'])}
                      getId={item => item.id}
                    />
                  </FormField>
                )}
              />
              <Controller
                name="yearsExperience"
                control={control}
                render={({ field }) => (
                  <FormField label="Стаж (лет)" hint="Необязательно">
                    <TextField
                      type="number"
                      value={field.value ?? ''}
                      onChange={e => {
                        const v = e.target.value
                        field.onChange(v === '' ? undefined : Number(v))
                      }}
                      fullWidth
                      inputProps={{ min: 0, max: 60 }}
                      sx={inputBaseSx}
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
                <>
                  <ChipMultiSelect
                    items={services as unknown as { id: string; [k: string]: unknown }[]}
                    selected={field.value}
                    onChange={ids => {
                      field.onChange(ids)
                      setSvcOverrides(prev => {
                        const next = { ...prev }
                        for (const id of ids) {
                          if (!next[id]) next[id] = { priceRub: '', durMin: '' }
                        }
                        for (const k of Object.keys(next)) {
                          if (!ids.includes(k)) delete next[k]
                        }
                        return next
                      })
                    }}
                    getLabel={item => (item as unknown as DashboardServiceRow).name}
                    getId={item => item.id}
                  />
                  <Stack spacing={1} sx={{ mt: 2 }}>
                    {field.value.map((sid: string) => {
                      const svc = services.find(s => s.id === sid)
                      const lab = svc?.name ?? sid
                      const basePrice =
                        svc?.priceCents != null ? `${(svc.priceCents / 100).toLocaleString('ru-RU')} ₽` : '—'
                      const baseDur = svc ? `${svc.durationMinutes} мин` : '—'
                      const ov = svcOverrides[sid] ?? { priceRub: '', durMin: '' }
                      return (
                        <Box
                          key={sid}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 120px 120px' },
                            gap: 1,
                            alignItems: 'center',
                            p: 1.5,
                            borderRadius: 1,
                            border: `1px solid ${d.borderSubtle}`,
                          }}
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{lab}</Typography>
                            <Typography sx={{ fontSize: 11, color: d.mutedDark }}>
                              Салон: {basePrice} · {baseDur}
                            </Typography>
                          </Box>
                          <TextField
                            size="small"
                            label="Цена, ₽"
                            placeholder="по салону"
                            value={ov.priceRub}
                            onChange={e =>
                              setSvcOverrides(p => ({ ...p, [sid]: { ...ov, priceRub: e.target.value } }))
                            }
                            sx={inputBaseSx}
                          />
                          <TextField
                            size="small"
                            label="Мин"
                            placeholder="по салону"
                            value={ov.durMin}
                            onChange={e =>
                              setSvcOverrides(p => ({ ...p, [sid]: { ...ov, durMin: e.target.value } }))
                            }
                            sx={inputBaseSx}
                          />
                        </Box>
                      )
                    })}
                  </Stack>
                </>
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
            </>
          )}

        </DialogContent>

        <PanelFooter
          note={!isEdit && createMode === 'invite' ? 'Найдите мастера по телефону или выберите «Новый мастер»' : 'Поля со * обязательны'}
          dangerAction={
            isEdit ? (
              <PanelBtn variant="danger" onClick={() => void handleDelete()}>
                Удалить мастера
              </PanelBtn>
            ) : undefined
          }
          actions={
            !isEdit && createMode === 'invite' ? (
              <PanelBtn variant="ghost" onClick={onClose}>Закрыть</PanelBtn>
            ) : (
            <>
              <PanelBtn variant="ghost" onClick={onClose}>Отмена</PanelBtn>
              <PanelBtn variant="primary" type="submit">Сохранить</PanelBtn>
            </>
            )
          }
        />

      </Box>
    </Dialog>
  )
}
