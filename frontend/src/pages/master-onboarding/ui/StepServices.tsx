import { useState } from 'react'
import { Button, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { advanceMasterOnboardingStep } from '@shared/api/masterOnboardingApi'

type Props = {
  onNext: () => void
  onBack: () => void
}

/**
 * Personal services catalog is fully configurable later in /master-dashboard.
 * The wizard intentionally surfaces this step as informational so masters
 * aren't blocked from publishing on day one.
 */
export function StepServices({ onNext, onBack }: Props) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  const handleNext = async () => {
    setBusy(true)
    try {
      await advanceMasterOnboardingStep('schedule')
    } finally {
      setBusy(false)
      onNext()
    }
  }

  return (
    <Stack gap={2}>
      <Typography variant="subtitle1">{t('masterOnboarding.steps.services.title')}</Typography>
      <Typography color="text.secondary">{t('masterOnboarding.steps.services.description')}</Typography>
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
