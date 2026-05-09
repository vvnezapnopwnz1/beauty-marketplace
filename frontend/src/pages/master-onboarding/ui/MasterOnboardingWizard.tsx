import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, MobileStepper, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@shared/config/routes'
import {
  type MasterCabinetProfile,
  getMyMasterProfile,
} from '@shared/api/masterDashboardApi'
import { StepProfile } from './StepProfile'
import { StepSpecializations } from './StepSpecializations'
import { StepServices } from './StepServices'
import { StepSchedule } from './StepSchedule'
import { StepPublish } from './StepPublish'

const STEP_ORDER = ['profile', 'specializations', 'services', 'schedule', 'publish'] as const
type StepName = (typeof STEP_ORDER)[number]

function indexFromOnboardingStep(step: string | null | undefined): number {
  if (!step) return 0
  // 'completed' redirects out of wizard; for in-progress values, open the next
  // unfinished step (saved step represents *where the user currently is*).
  const i = STEP_ORDER.indexOf(step as StepName)
  return i >= 0 ? i : 0
}

export function MasterOnboardingWizard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<MasterCabinetProfile | null>(null)
  const [step, setStep] = useState<number>(0)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const p = await getMyMasterProfile()
        if (cancelled) return
        if (p.onboardingStep === 'completed') {
          navigate(ROUTES.MASTER_DASHBOARD, { replace: true })
          return
        }
        setProfile(p)
        setStep(indexFromOnboardingStep(p.onboardingStep))
      } catch {
        if (cancelled) return
        setLoadError('load_failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [navigate])

  if (loadError) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <Typography color="error">{t('masterOnboarding.errors.saveFailed')}</Typography>
      </Box>
    )
  }
  if (!profile) {
    return null
  }

  const advance = () => setStep((s) => Math.min(s + 1, STEP_ORDER.length - 1))
  const back = () => setStep((s) => Math.max(s - 1, 0))
  const finish = () => navigate(ROUTES.MASTER_DASHBOARD, { replace: true })

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <Box sx={{ maxWidth: 560, mx: 'auto', px: 2, py: 5 }}>
        <Typography variant="h5" sx={{ fontFamily: "'Fraunces', serif", mb: 0.5 }}>
          {t('masterOnboarding.title')}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {t('masterOnboarding.stepLabel', { current: step + 1, total: STEP_ORDER.length })}
        </Typography>
        <MobileStepper
          variant="dots"
          steps={STEP_ORDER.length}
          activeStep={step}
          position="static"
          sx={{ mb: 3, bgcolor: 'transparent', p: 0 }}
          nextButton={null}
          backButton={null}
        />
        {step === 0 && (
          <StepProfile
            profile={profile}
            onSaved={(next) => {
              setProfile(next)
              advance()
            }}
          />
        )}
        {step === 1 && (
          <StepSpecializations
            profile={profile}
            onSaved={(next) => {
              setProfile(next)
              advance()
            }}
            onBack={back}
          />
        )}
        {step === 2 && <StepServices onNext={advance} onBack={back} />}
        {step === 3 && <StepSchedule onNext={advance} onBack={back} />}
        {step === 4 && <StepPublish profile={profile} onPublished={finish} onBack={back} />}
      </Box>
    </Box>
  )
}
