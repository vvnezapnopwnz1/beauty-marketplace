import { authFetch } from './authApi'
import { publicApiUrl } from '@shared/lib/apiPublicUrl'

const meRoot = () => publicApiUrl('/api/v1/me')
const cabinetRoot = () => publicApiUrl('/api/v1/master-dashboard')

export type MasterOnboardingStartStatus = 'existing' | 'claimed' | 'created'

export interface MasterOnboardingStartResult {
  masterProfileId: string
  status: MasterOnboardingStartStatus
  onboardingStep?: string | null
  redirect: string
}

export interface PublishMasterProfileResult {
  masterProfileId: string
  publishedAt: string
  onboardingStep: string
}

/** Idempotent dispatch — handles A0/A1/A2 server-side. */
export async function startMasterOnboarding(): Promise<MasterOnboardingStartResult> {
  const res = await authFetch(`${meRoot()}/master-onboarding/start`, { method: 'POST' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const err = Object.assign(new Error((data as { error?: string }).error || `HTTP ${res.status}`), {
      status: res.status,
      body: data,
    })
    throw err
  }
  return res.json()
}

/** Move onboarding_step forward; never regresses. */
export async function advanceMasterOnboardingStep(step: string): Promise<{ onboardingStep: string }> {
  const res = await authFetch(`${cabinetRoot()}/onboarding/step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * 422 missing_required is reported via thrown error: err.body.fields contains
 * an array of field names (e.g. ['displayName']) the wizard can highlight.
 */
export async function publishMasterProfile(): Promise<PublishMasterProfileResult> {
  const res = await authFetch(`${cabinetRoot()}/publish`, { method: 'POST' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const err = Object.assign(new Error((data as { error?: string }).error || `HTTP ${res.status}`), {
      status: res.status,
      body: data,
    })
    throw err
  }
  return res.json()
}
