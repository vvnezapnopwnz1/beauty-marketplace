export const ROUTES = {
  HOME: '/',
  SALON: '/salon/:id',
  PLACE: '/place/:externalId',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
} as const

export const salonPath = (id: string) => `/salon/${id}`

export const placePath = (externalId: string) =>
  `/place/${encodeURIComponent(externalId)}`
