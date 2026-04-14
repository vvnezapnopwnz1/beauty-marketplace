import * as React from 'react'
import { useEffect } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
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
import { mocha } from '@pages/dashboard/theme/mocha'

const ACCENT = mocha.accent
const MUTED = mocha.muted

const schema = yup.object({
  name: yup.string().required('Название'),
  durationMinutes: yup.number().min(5).max(480).required(),
  priceRub: yup.string().optional(),
  categorySlug: yup.string().required('Выберите категорию'),
  description: yup.string().optional(),
  staffIds: yup.array().of(yup.string().required()).default([]),
})

type FormValues = yup.InferType<typeof schema>

type Props = {
  open: boolean
  service: DashboardServiceRow | null
  onClose: () => void
  onSaved: () => void
}

export function ServiceFormModal({ open, service, onClose, onSaved }: Props) {
  const [staffList, setStaffList] = React.useState<DashboardStaffListItem[]>([])
  const [catPayload, setCatPayload] = React.useState<DashboardServiceCategoriesResponse | null>(null)
  const [catFull, setCatFull] = React.useState<DashboardServiceCategoriesResponse | null>(null)
  const [showAllCategories, setShowAllCategories] = React.useState(false)
  const [salonType, setSalonType] = React.useState<string | null | undefined>(undefined)

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
        const firstSlug =
          filtered.groups[0]?.items[0]?.slug ?? full.groups[0]?.items[0]?.slug ?? ''
        reset({
          name: '',
          durationMinutes: 60,
          priceRub: '',
          categorySlug: firstSlug,
          description: '',
          staffIds: [],
        })
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

  const onSubmit = async (v: FormValues) => {
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
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: mocha.dialog, color: mocha.text } }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle sx={{ borderBottom: `1px solid ${mocha.inputBorder}` }}>{service ? 'Услуга' : 'Новая услуга'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            {!salonType && (
              <Alert severity="info">
                Укажите тип салона в профиле, чтобы видеть только нужные категории. Сейчас показан полный список.
              </Alert>
            )}
            <Controller
              name="name"
              control={control}
              render={({ field }) => <TextField {...field} label="Название" error={Boolean(errors.name)} helperText={errors.name?.message} fullWidth />}
            />
            <Stack direction="row" spacing={2}>
              <Controller
                name="durationMinutes"
                control={control}
                render={({ field }) => (
                  <TextField {...field} type="number" label="Минуты" error={Boolean(errors.durationMinutes)} helperText={errors.durationMinutes?.message} fullWidth />
                )}
              />
              <Controller name="priceRub" control={control} render={({ field }) => <TextField {...field} label="Цена ₽" fullWidth />} />
            </Stack>
            <FormControl fullWidth error={Boolean(errors.categorySlug)}>
              <InputLabel id="cat-slug-label">Категория</InputLabel>
              <Controller
                name="categorySlug"
                control={control}
                render={({ field }) => (
                  <Select
                    labelId="cat-slug-label"
                    label="Категория"
                    value={field.value}
                    onChange={(e: SelectChangeEvent<string>) => field.onChange(e.target.value)}
                  >
                    {displayedGroups.flatMap(g => [
                      <ListSubheader key={`h-${g.parentSlug}`} sx={{ lineHeight: 1.4, color: MUTED }}>
                        {g.label}
                      </ListSubheader>,
                      ...g.items.map(it => (
                        <MenuItem key={it.slug} value={it.slug}>
                          {it.nameRu}
                        </MenuItem>
                      )),
                    ])}
                  </Select>
                )}
              />
              {errors.categorySlug && (
                <Typography variant="caption" color="error">
                  {errors.categorySlug.message}
                </Typography>
              )}
            </FormControl>
            <Typography sx={{ fontSize: 13 }}>
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
                sx={{ color: ACCENT, cursor: 'pointer' }}
              >
                {showAllCategories ? 'Только категории для моего типа салона' : 'Показать все категории'}
              </Link>
            </Typography>
            <Controller
              name="description"
              control={control}
              render={({ field }) => <TextField {...field} label="Описание" fullWidth multiline minRows={2} />}
            />
            <Typography sx={{ color: ACCENT, fontSize: 13, fontWeight: 600 }}>Мастера</Typography>
            <Controller
              name="staffIds"
              control={control}
              render={({ field }) => (
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {staffList.map(it => {
                    const on = field.value.includes(it.staff.id)
                    return (
                      <Box
                        key={it.staff.id}
                        component="button"
                        type="button"
                        onClick={() => {
                          if (on) field.onChange(field.value.filter((x: string) => x !== it.staff.id))
                          else field.onChange([...field.value, it.staff.id])
                        }}
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: '8px',
                          fontSize: 12,
                          border: `1px solid ${mocha.inputBorder}`,
                          bgcolor: on ? 'rgba(216,149,107,0.15)' : mocha.input,
                          color: on ? ACCENT : MUTED,
                          cursor: 'pointer',
                        }}
                      >
                        {it.staff.displayName}
                      </Box>
                    )
                  })}
                </Stack>
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${mocha.inputBorder}`, px: 3, py: 2 }}>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="submit" sx={{ bgcolor: ACCENT, color: mocha.onAccent }}>
            Сохранить
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
