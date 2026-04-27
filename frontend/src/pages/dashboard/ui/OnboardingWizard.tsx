import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  MobileStepper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import { ROUTES, dashboardPath } from '@shared/config/routes'
import { fetchDashboardServiceCategories, putSalonProfile } from '@shared/api/dashboardApi'

export function OnboardingWizard() {
  const navigate = useNavigate()
  const { salonId } = useParams<{ salonId: string }>()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [scopeOptions, setScopeOptions] = useState<Array<{ slug: string; label: string }>>([])
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps = ['Профиль', 'Услуги', 'Расписание']

  useEffect(() => {
    void (async () => {
      try {
        const categories = await fetchDashboardServiceCategories(true)
        const options = categories.groups.map((g) => ({ slug: g.parentSlug, label: g.label }))
        setScopeOptions(options)
      } catch {
        // silently ignore, categories can be set later in profile
      }
    })()
  }, [])

  const selectedScopeLabels = useMemo(() => {
    const bySlug = new Map(scopeOptions.map((o) => [o.slug, o.label]))
    return selectedScopes.map((slug) => bySlug.get(slug) ?? slug).join(', ')
  }, [scopeOptions, selectedScopes])

  const handleFinish = async () => {
    setSaving(true)
    setError(null)
    try {
      if (name.trim()) {
        await putSalonProfile({
          nameOverride: name.trim(),
          onlineBookingEnabled: true,
          onboardingCompleted: true,
          salonCategoryScopes: selectedScopes,
        })
      } else {
        await putSalonProfile({
          onlineBookingEnabled: true,
          onboardingCompleted: true,
          salonCategoryScopes: selectedScopes,
        })
      }
      navigate(salonId ? dashboardPath(salonId) : ROUTES.ME, { replace: true })
    } catch {
      setError('Не удалось сохранить. Попробуйте еще раз.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <Box sx={{ maxWidth: 560, mx: 'auto', px: 2, py: 5 }}>
        <Typography variant="h5" sx={{ fontFamily: "'Fraunces', serif", mb: 0.5 }}>
          Настройка салона
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Шаг {step + 1} из {steps.length}: {steps[step]}
        </Typography>

        <MobileStepper
          variant="dots"
          steps={steps.length}
          activeStep={step}
          position="static"
          sx={{ mb: 3, bgcolor: 'transparent', p: 0 }}
          nextButton={null}
          backButton={null}
        />

        {step === 0 && (
          <Stack gap={2}>
            <TextField
              label="Название салона"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Уже заполнено из 2GIS - можно изменить"
              fullWidth
            />
            <Typography variant="body2" color="text.secondary">
              Можно выбрать несколько направлений салона, чтобы быстрее получить релевантные категории услуг.
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Категории салона</InputLabel>
              <Select
                multiple
                value={selectedScopes}
                label="Категории салона"
                onChange={(e) => setSelectedScopes(e.target.value as string[])}
                renderValue={() =>
                  selectedScopes.length > 0 ? selectedScopeLabels : 'Выберите категории'
                }
              >
                {scopeOptions.map((o) => (
                  <MenuItem key={o.slug} value={o.slug}>
                    <ListItemText primary={o.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        )}

        {step === 1 && (
          <Box>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Услуги можно добавить позже в разделе «Услуги» дашборда.
            </Typography>
          </Box>
        )}

        {step === 2 && (
          <Box>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Расписание работы настраивается в разделе «Расписание».
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Stack direction="row" gap={1.5} mt={4}>
          {step > 0 && (
            <Button variant="outlined" onClick={() => setStep((s) => s - 1)}>
              Назад
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button variant="contained" sx={{ flex: 1 }} onClick={() => setStep((s) => s + 1)}>
              Далее
            </Button>
          ) : (
            <Button
              variant="contained"
              sx={{ flex: 1 }}
              disabled={saving}
              onClick={handleFinish}
            >
              {saving ? <CircularProgress size={20} /> : 'Перейти в кабинет'}
            </Button>
          )}
          <Button color="inherit" onClick={handleFinish} disabled={saving}>
            Пропустить все
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}
