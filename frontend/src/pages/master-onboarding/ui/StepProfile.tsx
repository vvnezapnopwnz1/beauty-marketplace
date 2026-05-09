import { useState } from 'react'
import { Alert, Button, Stack, TextField, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  type MasterCabinetProfile,
  updateMyMasterProfile,
} from '@shared/api/masterDashboardApi'
import { advanceMasterOnboardingStep } from '@shared/api/masterOnboardingApi'

type Props = {
  profile: MasterCabinetProfile
  onSaved: (next: MasterCabinetProfile) => void
}

export function StepProfile({ profile, onSaved }: Props) {
  const { t } = useTranslation()
  const [displayName, setDisplayName] = useState(profile.displayName ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleNext = async () => {
    setError(null)
    if (!displayName.trim()) {
      setError(t('masterOnboarding.errors.missingDisplayName'))
      return
    }
    setSaving(true)
    try {
      const next = await updateMyMasterProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        specializations: profile.specializations ?? [],
        yearsExperience: profile.yearsExperience ?? null,
        avatarUrl: profile.avatarUrl ?? null,
      })
      await advanceMasterOnboardingStep('specializations')
      onSaved(next)
    } catch {
      setError(t('masterOnboarding.errors.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack gap={2}>
      <Typography variant="subtitle1">{t('masterOnboarding.steps.profile.title')}</Typography>
      <TextField
        label={t('masterOnboarding.steps.profile.displayNameLabel')}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        fullWidth
        required
      />
      <TextField
        label={t('masterOnboarding.steps.profile.bioLabel')}
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        multiline
        rows={3}
        fullWidth
      />
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" gap={1.5}>
        <Button variant="contained" sx={{ flex: 1 }} disabled={saving} onClick={handleNext}>
          {t('masterOnboarding.actions.next')}
        </Button>
      </Stack>
    </Stack>
  )
}
