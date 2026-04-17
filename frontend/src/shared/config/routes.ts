export const ROUTES = {
  HOME: '/',
  SALON: '/salon/:id',
  PLACE: '/place/:externalId',
  MASTER: '/master/:masterProfileId',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  MASTER_DASHBOARD: '/master-dashboard',
  MASTER_DASHBOARD_INVITES: '/master-dashboard?section=invites',
  MASTER_DASHBOARD_PROFILE: '/master-dashboard?section=profile',
} as const

export const salonPath = (id: string) => `/salon/${id}`

export const masterPath = (masterProfileId: string) => `/master/${masterProfileId}`

export const placePath = (externalId: string) =>
  `/place/${encodeURIComponent(externalId)}`
