import { useState } from 'react'
import { Button, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { advanceMasterOnboardingStep } from '@shared/api/masterOnboardingApi'

type Props = {
  onNext: () => void
  onBack: () => void
}

/**
 * Personal schedule (master_working_hours) is fully configurable later in
 * /master-dashboard. This step exists to set onboarding_step='completed' so
 * the wizard knows it doesn't need to reopen here on next visit.
 */
export function StepSchedule({ onNext, onBack }: Props) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  const handleNext = async () => {
    setBusy(true)
    try {
      await advanceMasterOnboardingStep('completed')
    } finally {
      setBusy(false)
      onNext()
    }
  }

  return (
    <Stack gap={2}>
      <Typography variant="subtitle1">{t('masterOnboarding.steps.schedule.title')}</Typography>
      <Typography color="text.secondary">{t('masterOnboarding.steps.schedule.description')}</Typography>
      <Stack direction="row" gap={1.5}>
        <Button variant="outlined" onClick={onBack}>
          {t('masterOnboarding.actions.back')}
        </Button>
        <Button variant="contained" sx={{ flex: 1 }} disabled={busy} onClick={handleNext}>
          {t('masterOnboarding.actions.skipForNow')}
        </Button>
      </Stack>
    </Stack>
  )
}
