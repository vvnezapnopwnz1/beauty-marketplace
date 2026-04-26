import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  type SelectChangeEvent,
} from '@mui/material'
import {
  fetchDashboardServiceCategories,
  fetchSalonProfile,
  putSalonProfile,
  type SalonProfile,
} from '@shared/api/dashboardApi'
import { useDashboardFormStyles } from '@pages/dashboard/theme/formStyles'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import type { DashboardPalette } from '@shared/theme'
import {
  FormField,
  FormSection,
  PanelFooter,
  PanelBtn,
  ToggleRow,
} from '@pages/dashboard/ui/components/formComponents'

// иконка профиля
function ProfileIcon() {
  const d = useDashboardPalette()
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={d.accent} strokeWidth="1.8">
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )
}

function profileSelectSx(d: DashboardPalette) {
  return {
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
  }
}

export function DashboardProfile() {
  const d = useDashboardPalette()
  const { inputBaseSx, textareaSx, selectMenuSx, errorAlertSx } = useDashboardFormStyles()
  const [p, setP] = useState<SalonProfile | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [scopeOptions, setScopeOptions] = useState<Array<{ slug: string; label: string }>>([])

  const load = useCallback(async () => {
    try {
      setP(await fetchSalonProfile())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const cats = await fetchDashboardServiceCategories(true)
          setScopeOptions(cats.groups.map((g) => ({ slug: g.parentSlug, label: g.label })))
        } catch {
          // keep profile editable even if categories are unavailable
        }
      })()
    }, 0)
    return () => window.clearTimeout(t)
  }, [])

  async function save() {
    if (!p) return
    setOk(null)
    try {
      const next = await putSalonProfile({
        nameOverride: p.nameOverride,
        description: p.description,
        phonePublic: p.phonePublic,
        categoryId: p.categoryId,
        salonCategoryScopes: p.salonCategoryScopes ?? [],
        onlineBookingEnabled: p.onlineBookingEnabled,
        addressOverride: p.addressOverride,
        address: p.address,
        district: p.district,
        timezone: p.timezone,
      })
      setP(next)
      setOk('Сохранено')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  if (!p) return <Typography sx={{ color: d.mutedDark }}>Загрузка…</Typography>

  return (
    <Box
      sx={{
        maxWidth: 560,
        bgcolor: d.dialog,
        border: `1px solid ${d.border}`,
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      {/* Шапка */}
      <Box sx={{ px: 3, py: 2.25, borderBottom: `1px solid ${d.border}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 36, height: 36, borderRadius: '10px',
            bgcolor: 'rgba(176,136,249,.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ProfileIcon />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: d.text, lineHeight: 1.3 }}>
            Профиль салона
          </Typography>
          <Typography sx={{ fontSize: 12, color: d.mutedDark, mt: '1px' }}>
            Публичная страница и настройки
          </Typography>
        </Box>
        <Box
          sx={{
            ml: 'auto',
            px: 1, py: '3px',
            borderRadius: '6px',
            fontSize: 11, fontWeight: 500,
            bgcolor: 'rgba(107,203,119,.08)',
            color: d.green,
            border: `1px solid rgba(107,203,119,.3)`,
          }}
        >
          Опубликован
        </Box>
      </Box>

      {/* Уведомления */}
      {err && (
        <Box sx={{ px: 3, pt: 2 }}>
          <Alert severity="error" sx={errorAlertSx}>{err}</Alert>
        </Box>
      )}
      {ok && (
        <Box sx={{ px: 3, pt: 2 }}>
          <Alert severity="success" sx={{ fontSize: 12 }}>{ok}</Alert>
        </Box>
      )}

      {/* СЕКЦИЯ 1: Основное */}
      <FormSection num={1} name="Основное">
        <Stack spacing={1.5}>
          <FormField label="Название">
            <TextField
              value={p.nameOverride ?? ''}
              onChange={e => setP({ ...p, nameOverride: e.target.value || null })}
              fullWidth
              placeholder="Имя салона"
              sx={inputBaseSx}
            />
          </FormField>

          <FormField label="Категории салона">
            <Select<string[]>
              multiple
              value={p.salonCategoryScopes ?? []}
              onChange={(e: SelectChangeEvent<string[]>) =>
                setP({
                  ...p,
                  salonCategoryScopes:
                    typeof e.target.value === 'string'
                      ? e.target.value.split(',')
                      : e.target.value,
                })
              }
              displayEmpty
              MenuProps={selectMenuSx}
              renderValue={(selected) => {
                const arr = selected
                if (arr.length === 0) return 'Не выбраны'
                const bySlug = new Map(scopeOptions.map((o) => [o.slug, o.label]))
                return arr.map((slug) => bySlug.get(slug) ?? slug).join(', ')
              }}
              sx={profileSelectSx(d)}
            >
              {scopeOptions.map((o) => (
                <MenuItem key={o.slug} value={o.slug} sx={{ fontSize: 13, color: d.text }}>
                  <ListItemText primary={o.label} />
                </MenuItem>
              ))}
            </Select>
          </FormField>

          <FormField label="О салоне">
            <TextField
              value={p.description ?? ''}
              onChange={e => setP({ ...p, description: e.target.value || null })}
              fullWidth
              multiline
              minRows={3}
              placeholder="Расскажите о вашем салоне…"
              sx={textareaSx}
            />
          </FormField>
        </Stack>
      </FormSection>

      {/* СЕКЦИЯ 2: Адрес и контакты */}
      <FormSection num={2} name="Адрес и контакты">
        <Stack spacing={1.5}>
          <FormField label="Адрес">
            <TextField
              value={p.address ?? ''}
              onChange={e => setP({ ...p, address: e.target.value || null })}
              fullWidth
              placeholder="Москва, ул. Тверская, 1"
              sx={inputBaseSx}
            />
          </FormField>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <FormField label="Телефон">
              <TextField
                value={p.phonePublic ?? ''}
                onChange={e => setP({ ...p, phonePublic: e.target.value || null })}
                fullWidth
                placeholder="+7 495 000-00-00"
                sx={inputBaseSx}
              />
            </FormField>

            <FormField label="Часовой пояс">
              <TextField
                value={p.timezone}
                onChange={e => setP({ ...p, timezone: e.target.value })}
                fullWidth
                placeholder="Europe/Moscow"
                sx={inputBaseSx}
              />
            </FormField>
          </Stack>
        </Stack>
      </FormSection>

      {/* СЕКЦИЯ 3: Настройки бронирования */}
      <FormSection num={3} name="Настройки бронирования" last>
        <ToggleRow
          title="Онлайн-бронирование"
          description="Клиенты могут записаться с сайта"
          checked={p.onlineBookingEnabled}
          onChange={v => setP({ ...p, onlineBookingEnabled: v })}
          first
          last
        />
      </FormSection>

      <PanelFooter
        note="Изменения видны сразу после сохранения"
        actions={
          <PanelBtn variant="primary" onClick={() => void save()}>
            Сохранить изменения
          </PanelBtn>
        }
      />
    </Box>
  )
}
