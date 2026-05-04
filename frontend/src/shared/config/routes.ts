export const ROUTES = {
  HOME: '/',
  SALON: '/salon/:id',
  PLACE: '/place/:externalId',
  MASTER: '/master/:masterProfileId',
  LOGIN: '/login',
  ME: '/me',
  NOTIFICATIONS: '/notifications',
  DASHBOARD: '/dashboard/:salonId',
  MASTER_DASHBOARD: '/master-dashboard',
  MASTER_DASHBOARD_INVITES: '/master-dashboard?section=invites',
  MASTER_DASHBOARD_PROFILE: '/master-dashboard?section=profile',
  CLAIM_SALON: '/claim-salon',
  CLAIM_STATUS: '/claim-salon/status',
  JOIN: '/join',
  FOR_MASTERS: '/for-masters',
  ADMIN_CLAIMS: '/admin/claims',
  ONBOARDING: '/dashboard/:salonId/onboarding',
} as const

export const salonPath = (id: string) => `/salon/${id}`

export const masterPath = (masterProfileId: string) => `/master/${masterProfileId}`

export const placePath = (externalId: string) =>
  `/place/${encodeURIComponent(externalId)}`

export const claimSalonPath = (source: string, extId: string) =>
  `/claim-salon?source=${source}&externalId=${encodeURIComponent(extId)}`

export const claimStatusPath = (source: string, extId: string) =>
  `/claim-salon/status?source=${source}&externalId=${encodeURIComponent(extId)}`

export const dashboardPath = (salonId: string) => `/dashboard/${salonId}`

export const dashboardSectionPath = (salonId: string, section: string) =>
  `/dashboard/${salonId}?section=${section}`

/** Short Russian label for salon membership role (header / menus). */
export function salonRoleLabelRu(role: 'owner' | 'admin' | 'receptionist' | string | undefined): string {
  if (role === 'owner') return 'Владелец'
  if (role === 'admin') return 'Администратор'
  if (role === 'receptionist') return 'Ресепшн'
  return 'Сотрудник'
}
