import * as React from 'react'
import { useEffect } from 'react'
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  TextField,
  type SelectChangeEvent,
} from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import {
  createMasterService,
  deleteMasterService,
  fetchMasterServiceCategories,
  updateMasterService,
  type MasterService,
} from '@shared/api/masterDashboardApi'
import type { DashboardServiceCategoriesResponse } from '@shared/api/dashboardApi'
import { useDashboardFormStyles } from '@pages/dashboard/theme/formStyles'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import {
  FormField,
  PanelHeader,
  FormSection,
  PanelFooter,
  PanelBtn,
  DurationStepper,
} from '@pages/dashboard/ui/components/formComponents'

const schema = yup.object({
  name: yup.string().required('Название'),
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

const ServiceIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
)

export function MasterServiceFormModal({ open, service, onClose, onSaved }: Props) {
  const d = useDashboardPalette()
  const { inputBaseSx, textareaSx, panelPaperSmSx, errorAlertSx, selectMenuSx } = useDashboardFormStyles()
  const [catPayload, setCatPayload] = React.useState<DashboardServiceCategoriesResponse | null>(null)
  const [saveErr, setSaveErr] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

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
        v.priceRub?.trim() === '' ? undefined : Math.round(parseFloat(v.priceRub!.replace(',', '.')) * 100)
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

  const onDelete = async () => {
    if (!service) return
    if (!window.confirm('Удалить эту услугу? Её нельзя будет восстановить.')) return
    setDeleting(true)
    setSaveErr(null)
    try {
      await deleteMasterService(service.id)
      onSaved()
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Ошибка удаления')
    } finally {
      setDeleting(false)
    }
  }

  const groups = catPayload?.groups ?? []

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
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}
      >
        <PanelHeader
          icon={<ServiceIcon />}
          title={service ? 'Редактировать услугу' : 'Новая услуга'}
          subtitle="Личная услуга для записей вне салона"
          onClose={onClose}
        />

        <DialogContent sx={{ px: 0, py: 0, overflow: 'auto', flex: '1 1 auto', minHeight: 0 }}>
          {saveErr && (
            <Box sx={{ px: 3, pt: 2 }}>
              <Alert severity="warning" sx={errorAlertSx}>
                {saveErr}
              </Alert>
            </Box>
          )}

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

              <FormField label="Категория" required error={errors.categorySlug?.message}>
                <Controller
                  name="categorySlug"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onChange={(e: SelectChangeEvent<string>) => field.onChange(e.target.value)}
                      displayEmpty
                      disabled={groups.length === 0}
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
                      {groups.flatMap(g => [
                        <ListSubheader
                          key={`h-${g.parentSlug}`}
                          sx={{ bgcolor: d.card2, lineHeight: 1.4, color: d.muted, fontSize: 11, pt: 1 }}
                        >
                          {g.label}
                        </ListSubheader>,
                        ...g.items.map(it => (
                          <MenuItem
                            key={it.slug}
                            value={it.slug}
                            sx={{ fontSize: 13, color: d.text, '&:hover': { bgcolor: d.card } }}
                          >
                            {it.nameRu}
                          </MenuItem>
                        )),
                      ])}
                    </Select>
                  )}
                />
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

          <FormSection num={2} name="Стоимость и длительность" last>
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
                      rootTestId="master-service-duration-stepper"
                    />
                  </FormField>
                )}
              />
            </Stack>
          </FormSection>
        </DialogContent>

        <PanelFooter
          dangerAction={
            service ? (
              <PanelBtn variant="danger" type="button" disabled={deleting} onClick={() => void onDelete()}>
                Удалить
              </PanelBtn>
            ) : undefined
          }
          actions={
            <>
              <PanelBtn variant="ghost" onClick={onClose}>
                Отмена
              </PanelBtn>
              <PanelBtn variant="primary" type="submit" disabled={groups.length === 0}>
                Сохранить
              </PanelBtn>
            </>
          }
        />
      </Box>
    </Dialog>
  )
}
