import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListSubheader,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import {
  createMasterService,
  fetchMasterServiceCategories,
  updateMasterService,
  type MasterService,
} from '@shared/api/masterDashboardApi'
import type { DashboardServiceCategoriesResponse } from '@shared/api/dashboardApi'

const schema = yup.object({
  name: yup.string().required('Название обязательно'),
  durationMinutes: yup.number().min(5).max(480).required(),
  priceRub: yup.string().default(''),
  categorySlug: yup.string().required('Выберите категорию'),
  description: yup.string().default(''),
})

type FormValues = yup.InferType<typeof schema>

type Props = {
  open: boolean
  service: MasterService | null
  onClose: () => void
  onSaved: () => void
}

function DurationStepperPlain({
  value,
  onChange,
  min = 5,
  max = 480,
  step = 5,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  const dec = () => onChange(Math.max(min, value - step))
  const inc = () => onChange(Math.min(max, value + step))
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Button
        variant="outlined"
        onClick={dec}
        disabled={value <= min}
        sx={{ minWidth: 40, borderRadius: '8px 0 0 8px', borderRight: 'none', px: 1 }}
      >
        −
      </Button>
      <Box
        sx={{
          flex: 1,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid',
          borderColor: 'divider',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {value} мин
      </Box>
      <Button
        variant="outlined"
        onClick={inc}
        disabled={value >= max}
        sx={{ minWidth: 40, borderRadius: '0 8px 8px 0', borderLeft: 'none', px: 1 }}
      >
        +
      </Button>
    </Box>
  )
}

export function ServiceFormDialog({ open, service, onClose, onSaved }: Props) {
  const [catPayload, setCatPayload] = useState<DashboardServiceCategoriesResponse | null>(null)
  const [saveErr, setSaveErr] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      durationMinutes: 60,
      priceRub: '',
      categorySlug: '',
      description: '',
    },
  })

  useEffect(() => {
    if (!open) return
    void (async () => {
      setSaveErr(null)
      try {
        const cats = await fetchMasterServiceCategories()
        setCatPayload(cats)
        const firstSlug = cats.groups[0]?.items[0]?.slug ?? ''
        if (!service) {
          reset({
            name: '',
            durationMinutes: 60,
            priceRub: '',
            categorySlug: firstSlug,
            description: '',
          })
          return
        }
        reset({
          name: service.name,
          durationMinutes: service.durationMinutes,
          priceRub: service.priceCents != null ? String(service.priceCents / 100) : '',
          categorySlug: service.categorySlug?.trim() || firstSlug,
          description: service.description ?? '',
        })
      } catch (e) {
        setSaveErr(e instanceof Error ? e.message : 'Не удалось загрузить категории')
      }
    })()
  }, [open, service, reset])

  const onSubmit = async (v: FormValues) => {
    setSaveErr(null)
    try {
      const cents =
        v.priceRub?.trim() === ''
          ? undefined
          : Math.round(parseFloat(v.priceRub!.replace(',', '.')) * 100)
      const slug = v.categorySlug.trim()
      const body = {
        name: v.name.trim(),
        durationMinutes: v.durationMinutes,
        categorySlug: slug || undefined,
        description: v.description?.trim() ? v.description.trim() : undefined,
        priceCents: cents,
      }
      if (service) {
        await updateMasterService(service.id, body)
      } else {
        await createMasterService(body)
      }
      onSaved()
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Ошибка сохранения')
    }
  }

  const groups = catPayload?.groups ?? []

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{service ? 'Редактировать услугу' : 'Новая услуга'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {saveErr && <Alert severity="error">{saveErr}</Alert>}
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Название услуги"
                fullWidth
                required
                placeholder="Стрижка женская"
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            )}
          />

          <Controller
            name="categorySlug"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Категория"
                fullWidth
                required
                error={!!errors.categorySlug}
                helperText={errors.categorySlug?.message}
                SelectProps={{
                  MenuProps: { PaperProps: { sx: { maxHeight: 320 } } },
                }}
              >
                {groups.flatMap(g => [
                  <ListSubheader key={`h-${g.parentSlug}`} sx={{ fontWeight: 700, fontSize: 12 }}>
                    {g.labelRu ?? g.label}
                  </ListSubheader>,
                  ...g.items.map(it => (
                    <MenuItem key={it.slug} value={it.slug} sx={{ pl: 3 }}>
                      {it.nameRu}
                    </MenuItem>
                  )),
                ])}
              </TextField>
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Описание"
                fullWidth
                multiline
                minRows={2}
                placeholder="Что входит в услугу, особенности…"
              />
            )}
          />

          <Stack direction="row" spacing={2}>
            <Controller
              name="priceRub"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Цена"
                  fullWidth
                  placeholder="2 500"
                  helperText="Оставьте пустым — цена по запросу"
                  InputProps={{
                    endAdornment: (
                      <Typography sx={{ color: 'text.secondary', mr: 1 }}>₽</Typography>
                    ),
                  }}
                />
              )}
            />

            <Controller
              name="durationMinutes"
              control={control}
              render={({ field }) => (
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 0.5, display: 'block' }}
                  >
                    Длительность, мин
                  </Typography>
                  <DurationStepperPlain
                    value={field.value ?? 60}
                    onChange={field.onChange}
                    min={5}
                    max={480}
                    step={5}
                  />
                </Box>
              )}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)}>
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  )
}
