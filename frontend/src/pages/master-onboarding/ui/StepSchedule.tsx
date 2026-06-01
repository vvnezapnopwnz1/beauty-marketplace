import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  getMasterSchedule,
  updateMasterSchedule,
  type MasterWorkingHour,
} from '@shared/api/masterDashboardApi'
import { advanceMasterOnboardingStep } from '@shared/api/masterOnboardingApi'

const DAY_LABELS = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
]

const DEFAULT_HOURS: MasterWorkingHour[] = DAY_LABELS.map((_, i) => ({
  dayOfWeek: i,
  opensAt: '09:00',
  closesAt: '20:00',
  isClosed: false,
}))

function isTimeValid(t: string): boolean {
  return /^\d{2}:\d{2}$/.test(t)
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

type Props = {
  onNext: () => void
  onBack: () => void
}

export function StepSchedule({ onNext, onBack }: Props) {
  const { t } = useTranslation()
  const [hours, setHours] = useState<MasterWorkingHour[]>(DEFAULT_HOURS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const data = await getMasterSchedule()
      if (data.length > 0) {
        const sorted = [...data].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
        setHours(sorted)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('masterOnboarding.errors.saveFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const updateDay = (index: number, patch: Partial<MasterWorkingHour>) => {
    setHours(prev => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const validate = (): string | null => {
    for (const h of hours) {
      if (h.isClosed) continue
      if (!isTimeValid(h.opensAt) || !isTimeValid(h.closesAt)) {
        return t('masterOnboarding.steps.schedule.invalidTime')
      }
      if (timeToMinutes(h.opensAt) >= timeToMinutes(h.closesAt)) {
        return t('masterOnboarding.steps.schedule.timeOrder')
      }
    }
    return null
  }

  const handleSave = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setBusy(true)
    try {
      await updateMasterSchedule({ hours })
      await advanceMasterOnboardingStep('publish')
      onNext()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('masterOnboarding.errors.saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap={2}>
      <Typography variant="subtitle1">{t('masterOnboarding.steps.schedule.title')}</Typography>
      <Typography color="text.secondary">
        {t('masterOnboarding.steps.schedule.description')}
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <Stack spacing={1.5}>
        {hours.map((h, i) => (
          <Box
            key={h.dayOfWeek}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexWrap: 'wrap',
              opacity: h.isClosed ? 0.6 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            <Typography variant="body2" sx={{ width: 120, fontWeight: 500, flexShrink: 0 }}>
              {DAY_LABELS[i]}
            </Typography>

            {!h.isClosed && (
              <>
                <TextField
                  type="time"
                  size="small"
                  value={h.opensAt}
                  onChange={e => updateDay(i, { opensAt: e.target.value })}
                  sx={{ width: 110 }}
                />
                <Typography variant="body2" color="text.secondary">
                  —
                </Typography>
                <TextField
                  type="time"
                  size="small"
                  value={h.closesAt}
                  onChange={e => updateDay(i, { closesAt: e.target.value })}
                  sx={{ width: 110 }}
                />
              </>
            )}

            {h.isClosed && (
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                {t('masterOnboarding.steps.schedule.dayOff')}
              </Typography>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={h.isClosed}
                  onChange={e => updateDay(i, { isClosed: e.target.checked })}
                />
              }
              label={t('masterOnboarding.steps.schedule.dayOffLabel')}
              sx={{ ml: 'auto', flexShrink: 0 }}
            />
          </Box>
        ))}
      </Stack>

      <Stack direction="row" gap={1.5}>
        <Button variant="outlined" onClick={onBack} disabled={busy}>
          {t('masterOnboarding.actions.back')}
        </Button>
        <Button
          variant="contained"
          sx={{ flex: 1 }}
          disabled={busy || loading}
          onClick={handleSave}
        >
          {t('masterOnboarding.actions.next')}
        </Button>
      </Stack>
    </Stack>
  )
}
