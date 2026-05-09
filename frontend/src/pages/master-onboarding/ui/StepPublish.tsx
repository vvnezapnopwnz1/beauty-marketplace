import { useState } from 'react'
import { Alert, Button, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { MasterCabinetProfile } from '@shared/api/masterDashboardApi'
import { publishMasterProfile } from '@shared/api/masterOnboardingApi'

type Props = {
  profile: MasterCabinetProfile
  onPublished: () => void
  onBack: () => void
}

export function StepPublish({ profile, onPublished, onBack }: Props) {
  const { t } = useTranslation()
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missingFields, setMissingFields] = useState<string[]>([])

  const canPublish =
    profile.displayName.trim().length > 0 && profile.specializations.length > 0

  const handlePublish = async () => {
    setError(null)
    setMissingFields([])
    setPublishing(true)
    try {
      await publishMasterProfile()
      onPublished()
    } catch (err: unknown) {
      const e = err as { body?: { error?: string; fields?: string[] } }
      if (e?.body?.error === 'missing_required') {
        setMissingFields(e.body.fields ?? [])
      } else {
        setError(t('masterOnboarding.errors.publishFailed'))
      }
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Stack gap={2}>
      <Typography variant="subtitle1">{t('masterOnboarding.steps.publish.title')}</Typography>
      <Typography color="text.secondary">{t('masterOnboarding.steps.publish.description')}</Typography>

      <Typography variant="body2">
        <strong>{t('masterOnboarding.steps.publish.displayNameLabel')}:</strong>{' '}
        {profile.displayName || '—'}
      </Typography>
      <Typography variant="body2">
        <strong>{t('masterOnboarding.steps.publish.specializationsLabel')}:</strong>{' '}
        {profile.specializations.length > 0 ? profile.specializations.join(', ') : '—'}
      </Typography>

      {missingFields.includes('displayName') && (
        <Alert severity="error">{t('masterOnboarding.errors.missingDisplayName')}</Alert>
      )}
      {missingFields.includes('specializations') && (
        <Alert severity="error">{t('masterOnboarding.errors.missingSpecializations')}</Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" gap={1.5}>
        <Button variant="outlined" onClick={onBack}>
          {t('masterOnboarding.actions.back')}
        </Button>
        <Button
          variant="contained"
          sx={{ flex: 1 }}
          disabled={!canPublish || publishing}
          onClick={handlePublish}
        >
          {t('masterOnboarding.actions.publish')}
        </Button>
      </Stack>
    </Stack>
  )
}
