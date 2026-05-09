import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { startMasterOnboarding } from '@shared/api/masterOnboardingApi'
import { safeRelativePath } from '@shared/lib/safeRedirect'
import { ROUTES } from '@shared/config/routes'

/**
 * Tiny bridge that lives at /master-onboarding/start. It calls the idempotent
 * server endpoint exactly once and then navigates to the redirect target the
 * server returned — either the wizard (/master-onboarding) or the dashboard
 * (/master-dashboard) for users who are already master.
 */
export function MasterOnboardingStartBridge() {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await startMasterOnboarding()
        if (cancelled) return
        navigate(safeRelativePath(res.redirect, ROUTES.MASTER_ONBOARDING), { replace: true })
      } catch {
        if (cancelled) return
        navigate(ROUTES.HOME, { replace: true })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  )
}
