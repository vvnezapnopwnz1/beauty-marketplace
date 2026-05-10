import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  type MasterCabinetProfile,
  fetchMasterServiceCategories,
  updateMyMasterProfile,
} from '@shared/api/masterDashboardApi'
import { advanceMasterOnboardingStep } from '@shared/api/masterOnboardingApi'

type Props = {
  profile: MasterCabinetProfile
  onSaved: (next: MasterCabinetProfile) => void
  onBack: () => void
}

export function StepSpecializations({ profile, onSaved, onBack }: Props) {
  const { t } = useTranslation()
  const [options, setOptions] = useState<Array<{ slug: string; label: string }>>([])
  const [selected, setSelected] = useState<string[]>(profile.specializations ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const cats = await fetchMasterServiceCategories()
        setOptions(
          cats.groups.map(g => ({
            slug: g.parentSlug,
            label: g.specialistTitleRu ?? g.labelRu ?? g.label,
          })),
        )
      } catch {
        // categories are nice-to-have; user can still type-pick if API fails
      }
    })()
  }, [])

  const renderSummary = () => {
    if (selected.length === 0) return t('masterOnboarding.steps.specializations.placeholder')
    const bySlug = new Map(options.map(o => [o.slug, o.label]))
    return selected.map(s => bySlug.get(s) ?? s).join(', ')
  }

  const handleNext = async () => {
    setError(null)
    if (selected.length === 0) {
      setError(t('masterOnboarding.errors.missingSpecializations'))
      return
    }
    setSaving(true)
    try {
      const next = await updateMyMasterProfile({
        displayName: profile.displayName,
        bio: profile.bio ?? null,
        specializations: selected,
        yearsExperience: profile.yearsExperience ?? null,
        avatarUrl: profile.avatarUrl ?? null,
      })
      await advanceMasterOnboardingStep('services')
      onSaved(next)
    } catch {
      setError(t('masterOnboarding.errors.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack gap={2}>
      <Typography variant="subtitle1">
        {t('masterOnboarding.steps.specializations.title')}
      </Typography>
      <FormControl fullWidth size="small">
        <InputLabel>{t('masterOnboarding.steps.specializations.selectLabel')}</InputLabel>
        <Select
          multiple
          value={selected}
          label={t('masterOnboarding.steps.specializations.selectLabel')}
          onChange={e => setSelected(e.target.value as string[])}
          renderValue={renderSummary}
        >
          {options.map(o => (
            <MenuItem key={o.slug} value={o.slug}>
              <ListItemText primary={o.label} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" gap={1.5}>
        <Button variant="outlined" onClick={onBack}>
          {t('masterOnboarding.actions.back')}
        </Button>
        <Button variant="contained" sx={{ flex: 1 }} disabled={saving} onClick={handleNext}>
          {t('masterOnboarding.actions.next')}
        </Button>
      </Stack>
    </Stack>
  )
}
