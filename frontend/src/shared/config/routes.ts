export const ROUTES = {
  HOME: '/',
  SALON: '/salon/:id',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
} as const

export const salonPath = (id: string) => `/salon/${id}`
