export const ROUTES = {
  HOME: '/',
  SALON: '/salon/:id',
  PLACE: '/place/:externalId',
  MASTER: '/master/:masterProfileId',
  LOGIN: '/login',
  ME: '/me',
  DASHBOARD: '/dashboard',
  MASTER_DASHBOARD: '/master-dashboard',
  MASTER_DASHBOARD_INVITES: '/master-dashboard?section=invites',
  MASTER_DASHBOARD_PROFILE: '/master-dashboard?section=profile',
  CLAIM_SALON: '/claim-salon',
  CLAIM_STATUS: '/claim-salon/status',
  JOIN: '/join',
  ADMIN_CLAIMS: '/admin/claims',
  ONBOARDING: '/dashboard/onboarding',
} as const

export const salonPath = (id: string) => `/salon/${id}`

export const masterPath = (masterProfileId: string) => `/master/${masterProfileId}`

export const placePath = (externalId: string) =>
  `/place/${encodeURIComponent(externalId)}`

export const claimSalonPath = (source: string, extId: string) =>
  `/claim-salon?source=${source}&externalId=${encodeURIComponent(extId)}`

export const claimStatusPath = (source: string, extId: string) =>
  `/claim-salon/status?source=${source}&externalId=${encodeURIComponent(extId)}`
