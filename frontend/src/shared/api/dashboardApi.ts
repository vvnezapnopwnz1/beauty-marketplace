import { authFetch } from './authApi'
import { publicApiUrl } from '@shared/lib/apiPublicUrl'

const base = () => publicApiUrl('/api/v1/dashboard')

export interface DashboardStats {
  appointmentsToday: number
  appointmentsTodayConfirmed: number
  newAppointmentsWeek: number
  newAppointmentsPrevWeek: number
  weekChangePct: number
  loadPct: number
  rating: number
  reviewCount: number
  pendingCount: number
}

export interface DashboardAppointment {
  id: string
  startsAt: string
  endsAt: string
  status: string
  serviceName: string
  staffName?: string | null
  clientLabel: string
  clientPhone?: string | null
  guestName?: string | null
  guestPhone?: string | null
  clientUserId?: string | null
  serviceId: string
  staffId?: string | null
  clientNote?: string | null
}

export interface DashboardAppointmentList {
  items: DashboardAppointment[]
  total: number
}

export interface DashboardServiceRow {
  id: string
  salonId: string
  name: string
  durationMinutes: number
  priceCents: number | null
  isActive: boolean
  sortOrder: number
  category?: string | null
  categorySlug?: string | null
  description?: string | null
  staffNames?: string[]
}

export interface DashboardServiceCategoryItem {
  slug: string
  nameRu: string
  parentSlug: string
  sortOrder: number
}

export interface DashboardServiceCategoryGroup {
  parentSlug: string
  label: string
  items: DashboardServiceCategoryItem[]
}

export interface DashboardServiceCategoriesResponse {
  salonType?: string | null
  groups: DashboardServiceCategoryGroup[]
}

export interface DashboardStaffRow {
  id: string
  salonId: string
  displayName: string
  isActive: boolean
  createdAt: string
}

/** Full staff row from API (detail / create response). */
export interface DashboardStaffFull {
  id: string
  salonId: string
  displayName: string
  role?: string | null
  level?: string | null
  bio?: string | null
  phone?: string | null
  telegramUsername?: string | null
  email?: string | null
  color?: string | null
  joinedAt?: string | null
  dashboardAccess: boolean
  telegramNotifications: boolean
  isActive: boolean
  createdAt: string
  serviceIds?: string[]
}

export const STAFF_COLOR_SWATCHES = [
  '#D8956B',
  '#B088F9',
  '#4ECDC4',
  '#6BCB77',
  '#FF8FAB',
  '#FFD93D',
  '#FF6B6B',
] as const

/** GET /dashboard/staff list item (card). */
export interface DashboardStaffListItem {
  staff: DashboardStaffFull
  connectedServices: { id: string; name: string }[]
  loadPercentWeek: number
  ratingAvg: number | null
  reviewCount: number
  completedVisits: number
  revenueMonthCents: number
}

export interface StaffMetrics {
  rating: number | null
  reviewCount: number
  totalVisits: number
  revenueMonthCents: number
  loadPercent: number
  upcomingCount: number
}

export interface WorkingHourRow {
  id: string
  salonId: string
  dayOfWeek: number
  opensAt: string
  closesAt: string
  isClosed: boolean
  breakStartsAt?: string | null
  breakEndsAt?: string | null
  validFrom?: string | null
  validTo?: string | null
}

export interface StaffWorkingHourRow {
  id: string
  staffId: string
  dayOfWeek: number
  opensAt: string
  closesAt: string
  isDayOff: boolean
  breakStartsAt?: string | null
  breakEndsAt?: string | null
}

export interface SalonDateOverrideRow {
  id: string
  onDate: string
  isClosed: boolean
  note?: string | null
}

export interface StaffAbsenceRow {
  id: string
  startsOn: string
  endsOn: string
  kind: string
}

export interface SalonScheduleResponse {
  slotDurationMinutes: number
  workingHours: WorkingHourRow[]
  dateOverrides: SalonDateOverrideRow[]
}

export interface StaffScheduleBundleResponse {
  rows: StaffWorkingHourRow[]
  absences: StaffAbsenceRow[]
}

export type StaffFormPayload = {
  displayName: string
  role?: string | null
  level?: string | null
  bio?: string | null
  phone?: string | null
  telegramUsername?: string | null
  email?: string | null
  color?: string | null
  joinedAt?: string | null
  dashboardAccess: boolean
  telegramNotifications: boolean
  isActive: boolean
  serviceIds: string[]
}

export interface SalonProfile {
  id: string
  nameOverride?: string | null
  description?: string | null
  phonePublic?: string | null
  categoryId?: string | null
  salonType?: string | null
  businessType?: string | null
  onlineBookingEnabled: boolean
  addressOverride?: string | null
  address?: string | null
  district?: string | null
  lat?: number | null
  lng?: number | null
  photoUrl?: string | null
  timezone: string
  cachedRating?: number | null
  cachedReviewCount?: number | null
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const t = await res.text()
    let msg = t
    try {
      const j = JSON.parse(t) as { error?: string }
      if (j.error) msg = j.error
    } catch {
      /* ignore */
    }
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function fetchDashboardStats(period = 'week'): Promise<DashboardStats> {
  const res = await authFetch(`${base()}/stats?period=${encodeURIComponent(period)}`)
  return parseJson<DashboardStats>(res)
}

export async function fetchDashboardAppointments(params: {
  from?: string
  to?: string
  status?: string
  staffId?: string
  serviceId?: string
  page?: number
  pageSize?: number
}): Promise<DashboardAppointmentList> {
  const q = new URLSearchParams()
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  if (params.status) q.set('status', params.status)
  if (params.staffId) q.set('staff_id', params.staffId)
  if (params.serviceId) q.set('service_id', params.serviceId)
  if (params.page) q.set('page', String(params.page))
  if (params.pageSize) q.set('page_size', String(params.pageSize))
  const res = await authFetch(`${base()}/appointments?${q}`)
  return parseJson<DashboardAppointmentList>(res)
}

export async function patchAppointmentStatus(id: string, status: string): Promise<void> {
  const res = await authFetch(`${base()}/appointments/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
  // 204 No Content
}

export async function createDashboardAppointment(body: {
  serviceId: string
  staffId?: string | null
  startsAt: string
  guestName: string
  guestPhone: string
  clientNote?: string
}): Promise<void> {
  const res = await authFetch(`${base()}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId: body.serviceId,
      staffId: body.staffId ?? undefined,
      startsAt: body.startsAt,
      guestName: body.guestName,
      guestPhone: body.guestPhone,
      clientNote: body.clientNote,
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
}

/** PUT /dashboard/appointments/:id — partial body, omitted keys unchanged on server. */
export async function updateDashboardAppointment(
  id: string,
  body: {
    startsAt?: string
    endsAt?: string
    serviceId?: string
    staffId?: string
    clearStaffId?: boolean
    clientNote?: string
    guestName?: string | null
    guestPhone?: string | null
  },
): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (body.startsAt !== undefined) payload.startsAt = body.startsAt
  if (body.endsAt !== undefined) payload.endsAt = body.endsAt
  if (body.serviceId !== undefined) payload.serviceId = body.serviceId
  if (body.staffId !== undefined) payload.staffId = body.staffId
  if (body.clearStaffId === true) payload.clearStaffId = true
  if (body.clientNote !== undefined) payload.clientNote = body.clientNote
  if (body.guestName !== undefined) payload.guestName = body.guestName
  if (body.guestPhone !== undefined) payload.guestPhone = body.guestPhone
  const res = await authFetch(`${base()}/appointments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
}

export async function fetchDashboardServices(): Promise<DashboardServiceRow[]> {
  const res = await authFetch(`${base()}/services`)
  return parseJson<DashboardServiceRow[]>(res)
}

export async function fetchDashboardServiceCategories(full = false): Promise<DashboardServiceCategoriesResponse> {
  const q = full ? '?full=1' : ''
  const res = await authFetch(`${base()}/service-categories${q}`)
  return parseJson<DashboardServiceCategoriesResponse>(res)
}

export async function createDashboardService(row: {
  name: string
  durationMinutes: number
  priceCents?: number | null
  isActive?: boolean
  sortOrder?: number
  category?: string | null
  categorySlug?: string
  allowAllCategories?: boolean
  description?: string | null
  staffIds?: string[]
}): Promise<DashboardServiceRow> {
  const res = await authFetch(`${base()}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: row.name,
      durationMinutes: row.durationMinutes,
      priceCents: row.priceCents ?? null,
      isActive: row.isActive ?? true,
      sortOrder: row.sortOrder ?? 0,
      category: row.category,
      categorySlug: row.categorySlug ?? '',
      allowAllCategories: row.allowAllCategories ?? false,
      description: row.description,
      staffIds: row.staffIds ?? [],
    }),
  })
  return parseJson<DashboardServiceRow>(res)
}

export async function updateDashboardService(
  id: string,
  row: Partial<
    Pick<
      DashboardServiceRow,
      'name' | 'durationMinutes' | 'priceCents' | 'isActive' | 'sortOrder' | 'category' | 'description'
    >
  > & { staffIds?: string[]; categorySlug?: string; allowAllCategories?: boolean },
): Promise<DashboardServiceRow> {
  const res = await authFetch(`${base()}/services/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: row.name ?? '',
      durationMinutes: row.durationMinutes ?? 0,
      priceCents: row.priceCents ?? null,
      isActive: row.isActive ?? true,
      sortOrder: row.sortOrder ?? 0,
      category: row.category,
      categorySlug: row.categorySlug ?? '',
      allowAllCategories: row.allowAllCategories ?? false,
      description: row.description,
      staffIds: row.staffIds,
    }),
  })
  return parseJson<DashboardServiceRow>(res)
}

export async function deleteDashboardService(id: string): Promise<void> {
  const res = await authFetch(`${base()}/services/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
}

/** Maps list API items to legacy row shape (filters, selects). */
export function staffListItemsToRows(items: DashboardStaffListItem[]): DashboardStaffRow[] {
  return items.map(i => ({
    id: i.staff.id,
    salonId: i.staff.salonId,
    displayName: i.staff.displayName,
    isActive: i.staff.isActive,
    createdAt: i.staff.createdAt,
  }))
}

export async function fetchDashboardStaff(): Promise<DashboardStaffListItem[]> {
  const res = await authFetch(`${base()}/staff`)
  return parseJson<DashboardStaffListItem[]>(res)
}

export async function fetchStaffDetail(staffId: string): Promise<DashboardStaffFull> {
  const res = await authFetch(`${base()}/staff/${staffId}`)
  return parseJson<DashboardStaffFull>(res)
}

export async function fetchStaffMetrics(staffId: string, period = 'month'): Promise<StaffMetrics> {
  const res = await authFetch(`${base()}/staff/${staffId}/metrics?period=${encodeURIComponent(period)}`)
  return parseJson<StaffMetrics>(res)
}

export async function createDashboardStaff(body: StaffFormPayload): Promise<DashboardStaffFull> {
  const res = await authFetch(`${base()}/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      displayName: body.displayName,
      role: body.role,
      level: body.level,
      bio: body.bio,
      phone: body.phone,
      telegramUsername: body.telegramUsername,
      email: body.email,
      color: body.color,
      joinedAt: body.joinedAt,
      dashboardAccess: body.dashboardAccess,
      telegramNotifications: body.telegramNotifications,
      isActive: body.isActive,
      serviceIds: body.serviceIds,
    }),
  })
  return parseJson<DashboardStaffFull>(res)
}

export async function updateDashboardStaffFull(id: string, body: StaffFormPayload): Promise<DashboardStaffFull> {
  const res = await authFetch(`${base()}/staff/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      displayName: body.displayName,
      role: body.role,
      level: body.level,
      bio: body.bio,
      phone: body.phone,
      telegramUsername: body.telegramUsername,
      email: body.email,
      color: body.color,
      joinedAt: body.joinedAt,
      dashboardAccess: body.dashboardAccess,
      telegramNotifications: body.telegramNotifications,
      isActive: body.isActive,
      serviceIds: body.serviceIds,
    }),
  })
  return parseJson<DashboardStaffFull>(res)
}

export async function deleteDashboardStaff(id: string): Promise<void> {
  const res = await authFetch(`${base()}/staff/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
}

export async function fetchSalonSchedule(): Promise<SalonScheduleResponse> {
  const res = await authFetch(`${base()}/schedule`)
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
  const raw: unknown = await res.json()
  if (Array.isArray(raw)) {
    return { slotDurationMinutes: 30, workingHours: raw as WorkingHourRow[], dateOverrides: [] }
  }
  return raw as SalonScheduleResponse
}

export async function putSalonSchedule(
  rows: { dayOfWeek: number; opensAt: string; closesAt: string; closed: boolean }[],
): Promise<void> {
  const res = await authFetch(`${base()}/schedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      rows.map(r => ({
        dayOfWeek: r.dayOfWeek,
        opensAt: r.opensAt,
        closesAt: r.closesAt,
        closed: r.closed,
      })),
    ),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
}

export async function putSalonScheduleBundle(payload: {
  slotDurationMinutes?: number
  workingHours: {
    dayOfWeek: number
    opensAt: string
    closesAt: string
    closed: boolean
    breakStartsAt?: string | null
    breakEndsAt?: string | null
  }[]
  dateOverrides?: { onDate: string; isClosed: boolean; note?: string | null }[]
}): Promise<void> {
  const res = await authFetch(`${base()}/schedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slotDurationMinutes: payload.slotDurationMinutes,
      workingHours: payload.workingHours.map(w => ({
        dayOfWeek: w.dayOfWeek,
        opensAt: w.opensAt,
        closesAt: w.closesAt,
        closed: w.closed,
        breakStartsAt: w.breakStartsAt,
        breakEndsAt: w.breakEndsAt,
      })),
      dateOverrides: payload.dateOverrides,
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
}

export async function fetchStaffSchedule(staffId: string): Promise<StaffScheduleBundleResponse> {
  const res = await authFetch(`${base()}/staff/${staffId}/schedule`)
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
  const raw: unknown = await res.json()
  if (Array.isArray(raw)) {
    return { rows: raw as StaffWorkingHourRow[], absences: [] }
  }
  return raw as StaffScheduleBundleResponse
}

export async function putStaffSchedule(
  staffId: string,
  rows: { dayOfWeek: number; opensAt: string; closesAt: string; isDayOff: boolean }[],
): Promise<void> {
  const res = await authFetch(`${base()}/staff/${staffId}/schedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
}

export async function putStaffScheduleBundle(
  staffId: string,
  payload: {
    rows: {
      dayOfWeek: number
      opensAt: string
      closesAt: string
      isDayOff: boolean
      breakStartsAt?: string | null
      breakEndsAt?: string | null
    }[]
    absences?: { startsOn: string; endsOn: string; kind: string }[]
  },
): Promise<void> {
  const res = await authFetch(`${base()}/staff/${staffId}/schedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rows: payload.rows,
      absences: payload.absences,
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
}

export async function fetchSalonProfile(): Promise<SalonProfile> {
  const res = await authFetch(`${base()}/salon/profile`)
  return parseJson<SalonProfile>(res)
}

export async function putSalonProfile(partial: Partial<SalonProfile>): Promise<SalonProfile> {
  const res = await authFetch(`${base()}/salon/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial),
  })
  return parseJson<SalonProfile>(res)
}
