import * as React from 'react'
import { useEffect } from 'react'
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  Link,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  type SelectChangeEvent,
} from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import {
  createDashboardService,
  fetchDashboardServiceCategories,
  fetchDashboardServices,
  fetchDashboardStaff,
  fetchSalonProfile,
  updateDashboardService,
  type DashboardServiceCategoriesResponse,
  type DashboardServiceRow,
  type DashboardStaffListItem,
} from '@shared/api/dashboardApi'
import { useDashboardFormStyles } from '@pages/dashboard/theme/formStyles'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import {
  FormField,
  PanelHeader,
  FormSection,
  PanelFooter,
  PanelBtn,
  DurationStepper,
  StaffPickGrid,
  type StaffPickItem,
} from '@pages/dashboard/ui/components/formComponents'

const schema = yup.object({
  name: yup.string().required('Название'),
  durationMinutes: yup.number().min(5).max(480).required(),
  /** default вместо optional — так InferType и yupResolver совпадают с useForm<FormValues> */
  priceRub: yup.string().default(''),
  categorySlug: yup.string().required('Выберите категорию'),
  description: yup.string().default(''),
  staffIds: yup.array().of(yup.string().required()).default(() => []),
})

type FormValues = yup.InferType<typeof schema>

type Props = {
  open: boolean
  service: DashboardServiceRow | null
  onClose: () => void
  onSaved: () => void
}

// иконка услуги
const ServiceIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="2.5"/>
  </svg>
)

export function ServiceFormModal({ open, service, onClose, onSaved }: Props) {
  const d = useDashboardPalette()
  const { inputBaseSx, textareaSx, panelPaperSmSx, errorAlertSx, selectMenuSx } = useDashboardFormStyles()
  const [staffList, setStaffList] = React.useState<DashboardStaffListItem[]>([])
  const [catPayload, setCatPayload] = React.useState<DashboardServiceCategoriesResponse | null>(null)
  const [catFull, setCatFull] = React.useState<DashboardServiceCategoriesResponse | null>(null)
  const [showAllCategories, setShowAllCategories] = React.useState(false)
  const [salonType, setSalonType] = React.useState<string | null | undefined>(undefined)
  const [saveErr, setSaveErr] = React.useState<string | null>(null)

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      durationMinutes: 60,
      priceRub: '',
      categorySlug: '',
      description: '',
      staffIds: [],
    },
  })

  useEffect(() => {
    if (!open) return
    void (async () => {
      const list = await fetchDashboardStaff()
      setSaveErr(null)
      setStaffList(list)
      const [profile, filtered, full] = await Promise.all([
        fetchSalonProfile(),
        fetchDashboardServiceCategories(false),
        fetchDashboardServiceCategories(true),
      ])
      setSalonType(profile.salonType)
      setCatPayload(filtered)
      setCatFull(full)
      setShowAllCategories(false)

      if (!service) {
        const firstSlug = filtered.groups[0]?.items[0]?.slug ?? full.groups[0]?.items[0]?.slug ?? ''
        reset({ name: '', durationMinutes: 60, priceRub: '', categorySlug: firstSlug, description: '', staffIds: [] })
        return
      }
      const services = await fetchDashboardServices()
      const cur = services.find(r => r.id === service.id)
      const names = new Set(cur?.staffNames ?? [])
      const ids = list.filter(it => names.has(it.staff.displayName)).map(it => it.staff.id)
      reset({
        name: service.name,
        durationMinutes: service.durationMinutes,
        priceRub: service.priceCents != null ? String(service.priceCents / 100) : '',
        categorySlug: service.categorySlug ?? filtered.groups.flatMap(g => g.items).find(i => i.nameRu === service.category)?.slug ?? '',
        description: service.description ?? '',
        staffIds: ids,
      })
    })()
  }, [open, service, reset])

  const displayedGroups = React.useMemo(() => {
    if (showAllCategories && catFull) return catFull.groups
    return catPayload?.groups ?? []
  }, [showAllCategories, catFull, catPayload])

  const staffPickItems: StaffPickItem[] = staffList.map(it => ({
    id: it.staff.id,
    displayName: it.staff.displayName,
    role: it.staff.role,
    color: it.staff.color,
  }))

  const onSubmit = async (v: FormValues) => {
    setSaveErr(null)
    try {
      const cents = v.priceRub?.trim() === '' ? null : Math.round(parseFloat(v.priceRub!.replace(',', '.')) * 100)
      const allowAll = showAllCategories
      if (service) {
        await updateDashboardService(service.id, {
          name: v.name,
          durationMinutes: v.durationMinutes,
          priceCents: cents,
          isActive: service.isActive,
          sortOrder: service.sortOrder,
          categorySlug: v.categorySlug,
          allowAllCategories: allowAll,
          description: v.description || null,
          staffIds: v.staffIds,
        })
      } else {
        await createDashboardService({
          name: v.name,
          durationMinutes: v.durationMinutes,
          priceCents: cents,
          isActive: true,
          sortOrder: 0,
          categorySlug: v.categorySlug,
          allowAllCategories: allowAll,
          description: v.description || null,
          staffIds: v.staffIds,
        })
      }
      onSaved()
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Ошибка сохранения')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      scroll="paper"
      slotProps={{
        backdrop: { sx: { bgcolor: d.backdrop, backdropFilter: 'blur(6px)' } },
      }}
      PaperProps={{ sx: panelPaperSmSx }}
    >
      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>

        <PanelHeader
          icon={<ServiceIcon />}
          title={service ? 'Редактировать услугу' : 'Новая услуга'}
          subtitle="Прайс и настройки бронирования"
          onClose={onClose}
        />

        <DialogContent sx={{ px: 0, py: 0, overflow: 'auto', flex: '1 1 auto', minHeight: 0 }}>

          {saveErr && (
            <Box sx={{ px: 3, pt: 2 }}>
              <Alert severity="warning" sx={errorAlertSx}>{saveErr}</Alert>
            </Box>
          )}

          {!salonType && (
            <Box sx={{ px: 3, pt: 2 }}>
              <Alert severity="info" sx={{ fontSize: 12 }}>
                Укажите тип салона в профиле — будут показаны только нужные категории
              </Alert>
            </Box>
          )}

          {/* СЕКЦИЯ 1: Информация */}
          <FormSection num={1} name="Информация">
            <Stack spacing={1.5}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <FormField label="Название услуги" required error={errors.name?.message}>
                    <TextField
                      {...field}
                      fullWidth
                      placeholder="Стрижка женская"
                      error={!!errors.name}
                      sx={inputBaseSx}
                    />
                  </FormField>
                )}
              />

              <FormField
                label="Категория"
                required
                error={errors.categorySlug?.message}
              >
                <Controller
                  name="categorySlug"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onChange={(e: SelectChangeEvent<string>) => field.onChange(e.target.value)}
                      displayEmpty
                      error={!!errors.categorySlug}
                      MenuProps={selectMenuSx}
                      sx={{
                        bgcolor: d.input,
                        borderRadius: '10px',
                        fontSize: 13,
                        color: d.text,
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: d.inputBorder, top: 0 },
                        '& .MuiOutlinedInput-notchedOutline legend': { display: 'none' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: d.borderLight },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: d.borderFocus },
                        '& .MuiSelect-select': { py: '9px', px: '12px' },
                        '& .MuiSvgIcon-root': { color: d.mutedDark },
                      }}
                    >
                      {displayedGroups.flatMap(g => [
                        <ListSubheader key={`h-${g.parentSlug}`} sx={{ bgcolor: d.card2, lineHeight: 1.4, color: d.muted, fontSize: 11, pt: 1 }}>
                          {g.label}
                        </ListSubheader>,
                        ...g.items.map(it => (
                          <MenuItem key={it.slug} value={it.slug} sx={{ fontSize: 13, color: d.text, '&:hover': { bgcolor: d.card } }}>
                            {it.nameRu}
                          </MenuItem>
                        )),
                      ])}
                    </Select>
                  )}
                />
                <Typography sx={{ fontSize: 11, mt: '4px' }}>
                  <Link
                    component="button"
                    type="button"
                    underline="always"
                    onClick={() => {
                      const next = !showAllCategories
                      setShowAllCategories(next)
                      const slug = getValues('categorySlug')
                      if (next && slug && catFull) {
                        const exists = catFull.groups.some(g => g.items.some(i => i.slug === slug))
                        if (!exists) {
                          const first = catFull.groups[0]?.items[0]?.slug
                          if (first) setValue('categorySlug', first)
                        }
                      }
                    }}
                    sx={{ color: d.accent, cursor: 'pointer', fontSize: 11 }}
                  >
                    {showAllCategories ? 'Только для моего типа салона' : 'Показать все категории'}
                  </Link>
                </Typography>
              </FormField>

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <FormField label="Описание">
                    <TextField
                      {...field}
                      fullWidth
                      multiline
                      minRows={2}
                      placeholder="Что входит в услугу, особенности…"
                      sx={textareaSx}
                    />
                  </FormField>
                )}
              />
            </Stack>
          </FormSection>

          {/* СЕКЦИЯ 2: Стоимость и длительность */}
          <FormSection num={2} name="Стоимость и длительность">
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Controller
                name="priceRub"
                control={control}
                render={({ field }) => (
                  <FormField label="Цена" hint="Оставьте пустым — цена по запросу">
                    <Box sx={{ display: 'flex', gap: 0, alignItems: 'center' }}>
                      <TextField
                        {...field}
                        fullWidth
                        placeholder="2 500"
                        sx={{
                          ...inputBaseSx,
                          '& .MuiOutlinedInput-root': {
                            ...((inputBaseSx as Record<string, unknown>)['& .MuiOutlinedInput-root'] as object),
                            borderRadius: '10px 0 0 10px',
                          },
                        }}
                      />
                      <Box
                        sx={{
                          height: 36,
                          px: 1.75,
                          display: 'flex',
                          alignItems: 'center',
                          bgcolor: d.card2,
                          border: `1px solid ${d.border}`,
                          borderLeft: 'none',
                          borderRadius: '0 10px 10px 0',
                          fontSize: 13,
                          fontWeight: 600,
                          color: d.muted,
                          flexShrink: 0,
                        }}
                      >
                        ₽
                      </Box>
                    </Box>
                  </FormField>
                )}
              />

              <Controller
                name="durationMinutes"
                control={control}
                render={({ field }) => (
                  <FormField label="Длительность" required hint="Шаг 5 мин (5–480)">
                    <DurationStepper
                      value={field.value ?? 60}
                      onChange={field.onChange}
                      min={5}
                      max={480}
                      step={5}
                    />
                  </FormField>
                )}
              />
            </Stack>
          </FormSection>

          {/* СЕКЦИЯ 3: Мастера */}
          <FormSection num={3} name="Мастера" last>
            <Controller
              name="staffIds"
              control={control}
              render={({ field }) => (
                <FormField label="Кто оказывает услугу" hint="Выделите мастеров">
                  <StaffPickGrid
                    items={staffPickItems}
                    selected={field.value}
                    onChange={field.onChange}
                  />
                </FormField>
              )}
            />
          </FormSection>

        </DialogContent>

        <PanelFooter
          dangerAction={
            service ? (
              <PanelBtn variant="danger" onClick={onClose}>
                Удалить
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
