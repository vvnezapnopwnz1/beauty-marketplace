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
  /** One service name, or several joined with ", " when the visit has appointment_line_items. */
  serviceName: string
  staffName?: string | null
  clientLabel: string
  clientPhone?: string | null
  guestName?: string | null
  guestPhone?: string | null
  clientUserId?: string | null
  serviceId: string
  /** Assigned master in this salon (appointments.salon_master_id). */
  salonMasterId?: string | null
  clientNote?: string | null
  services?: { id: string; name: string; durationMinutes: number; priceCents: number }[]
}

export interface AppointmentDetail extends DashboardAppointment {
  salonClientId?: string | null
  createdAt: string
  services: { id: string; name: string; durationMinutes: number; priceCents: number }[]
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

export interface MasterProfileDTO {
  id: string
  bio?: string | null
  specializations: string[]
  avatarUrl?: string | null
  yearsExperience?: number | null
  /** When true, salon cannot edit profile fields (master owns the profile). */
  ownedByUser: boolean
}

export interface SalonMasterServiceRow {
  serviceId: string
  serviceName: string
  salonPriceCents?: number | null
  salonDurationMinutes: number
  priceOverrideCents?: number | null
  durationOverrideMinutes?: number | null
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
  status?: string
  createdAt: string
  serviceIds?: string[]
  masterProfile?: MasterProfileDTO | null
  services?: SalonMasterServiceRow[]
}

/** Raw list row from GET /salon-masters (before normalizing to DashboardStaffListItem). */
export interface SalonMasterListApiRow {
  id: string
  salonId: string
  displayName: string
  color?: string | null
  isActive: boolean
  status: string
  role?: string | null
  level?: string | null
  joinedAt?: string | null
  dashboardAccess: boolean
  telegramNotifications: boolean
  masterProfile?: MasterProfileDTO | null
  services: SalonMasterServiceRow[]
  loadPercentWeek: number
  ratingAvg: number | null
  reviewCount: number
  completedVisits: number
  revenueMonthCents: number
}

export const SPECIALIZATION_PRESETS = [
  { value: 'colorist', label: 'Колорист' },
  { value: 'nail_master', label: 'Мастер маникюра' },
  { value: 'stylist', label: 'Стилист' },
  { value: 'browist', label: 'Бровист' },
  { value: 'massage', label: 'Массажист' },
  { value: 'barber', label: 'Барбер' },
  { value: 'haircut', label: 'Стрижки' },
] as const

export function specializationLabel(slug: string): string {
  const p = SPECIALIZATION_PRESETS.find(x => x.value === slug)
  return p?.label ?? slug
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

export type StaffServiceAssignmentPayload = {
  serviceId: string
  priceOverrideCents?: number | null
  durationOverrideMinutes?: number | null
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
  specializations: string[]
  yearsExperience?: number | null
  serviceAssignments?: StaffServiceAssignmentPayload[]
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

const salonMastersPath = () => `${base()}/salon-masters`

function rowToStaffFull(r: SalonMasterListApiRow): DashboardStaffFull {
  const mpBio = r.masterProfile?.bio
  return {
    id: r.id,
    salonId: r.salonId,
    displayName: r.displayName,
    role: r.role ?? undefined,
    level: r.level ?? undefined,
    bio: mpBio ?? undefined,
    phone: undefined,
    telegramUsername: undefined,
    email: undefined,
    color: r.color ?? undefined,
    joinedAt: r.joinedAt ?? undefined,
    dashboardAccess: r.dashboardAccess,
    telegramNotifications: r.telegramNotifications,
    isActive: r.isActive,
    status: r.status,
    createdAt: '',
    serviceIds: r.services.map(s => s.serviceId),
    masterProfile: r.masterProfile ?? null,
    services: r.services,
  }
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

export interface AvailableSlot {
  startsAt: string
  endsAt: string
  salonMasterId: string
  masterName: string
}

export interface SlotMasterInfo {
  salonMasterId: string
  masterName: string
}

export interface SlotsResponse {
  date: string
  slotDurationMinutes: number
  slots: AvailableSlot[]
  masters: SlotMasterInfo[]
}

export async function fetchAvailableSlots(params: {
  date: string
  serviceId?: string
  serviceIds?: string[]
  salonMasterId?: string
}): Promise<SlotsResponse> {
  const q = new URLSearchParams()
  q.set('date', params.date)
  if (params.serviceIds && params.serviceIds.length > 0) {
    q.set('serviceIds', params.serviceIds.join(','))
  } else if (params.serviceId) {
    q.set('serviceId', params.serviceId)
  }
  if (params.salonMasterId) q.set('salonMasterId', params.salonMasterId)
  const res = await authFetch(`${base()}/slots?${q}`)
  return parseJson<SlotsResponse>(res)
}

export async function fetchDashboardStats(period = 'week'): Promise<DashboardStats> {
  const res = await authFetch(`${base()}/stats?period=${encodeURIComponent(period)}`)
  return parseJson<DashboardStats>(res)
}

export async function fetchDashboardAppointments(params: {
  from?: string
  to?: string
  statuses?: string[]
  staffId?: string
  /** Matches primary `appointments.service_id` or any `appointment_line_items.service_id` (multi-service guest visits). */
  serviceId?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  search?: string
  page?: number
  pageSize?: number
}): Promise<DashboardAppointmentList> {
  const q = new URLSearchParams()
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  if (params.statuses?.length) q.set('status', params.statuses.join(','))
  if (params.staffId) q.set('salon_master_id', params.staffId)
  if (params.serviceId) q.set('service_id', params.serviceId)
  if (params.sortBy) q.set('sort_by', params.sortBy)
  if (params.sortDir) q.set('sort_dir', params.sortDir)
  if (params.search) q.set('search', params.search)
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

export async function fetchAppointmentDetail(id: string): Promise<AppointmentDetail> {
  const res = await authFetch(`${base()}/appointments/${id}`)
  return parseJson<AppointmentDetail>(res)
}

export async function createDashboardAppointment(body: {
  serviceIds: string[]
  salonMasterId?: string | null
  startsAt: string
  guestName: string
  guestPhone: string
  clientNote?: string
}): Promise<void> {
  const res = await authFetch(`${base()}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceIds: body.serviceIds,
      salonMasterId: body.salonMasterId ?? undefined,
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
    serviceIds?: string[]
    salonMasterId?: string
    clearSalonMasterId?: boolean
    clientNote?: string
    guestName?: string | null
    guestPhone?: string | null
  },
): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (body.startsAt !== undefined) payload.startsAt = body.startsAt
  if (body.endsAt !== undefined) payload.endsAt = body.endsAt
  if (body.serviceIds !== undefined) payload.serviceIds = body.serviceIds
  if (body.salonMasterId !== undefined) payload.salonMasterId = body.salonMasterId
  if (body.clearSalonMasterId === true) payload.clearSalonMasterId = true
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
  const res = await authFetch(salonMastersPath())
  const raw = await parseJson<SalonMasterListApiRow[]>(res)
  return raw.map(row => ({
    staff: rowToStaffFull(row),
    connectedServices: row.services.map(s => ({ id: s.serviceId, name: s.serviceName })),
    loadPercentWeek: row.loadPercentWeek,
    ratingAvg: row.ratingAvg,
    reviewCount: row.reviewCount,
    completedVisits: row.completedVisits,
    revenueMonthCents: row.revenueMonthCents,
  }))
}

export async function fetchStaffDetail(staffId: string): Promise<DashboardStaffFull> {
  const res = await authFetch(`${salonMastersPath()}/${staffId}`)
  return parseJson<DashboardStaffFull>(res)
}

export async function fetchStaffMetrics(staffId: string, period = 'month'): Promise<StaffMetrics> {
  const res = await authFetch(
    `${salonMastersPath()}/${staffId}/metrics?period=${encodeURIComponent(period)}`,
  )
  return parseJson<StaffMetrics>(res)
}

function staffPayloadJson(body: StaffFormPayload) {
  const assignments =
    body.serviceAssignments && body.serviceAssignments.length > 0
      ? body.serviceAssignments
      : body.serviceIds.map(serviceId => ({ serviceId, priceOverrideCents: null, durationOverrideMinutes: null }))
  return {
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
    specializations: body.specializations,
    yearsExperience: body.yearsExperience ?? undefined,
    serviceAssignments: assignments,
  }
}

export async function createDashboardStaff(body: StaffFormPayload): Promise<DashboardStaffFull> {
  const res = await authFetch(salonMastersPath(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(staffPayloadJson(body)),
  })
  return parseJson<DashboardStaffFull>(res)
}

export async function updateDashboardStaffFull(id: string, body: StaffFormPayload): Promise<DashboardStaffFull> {
  const res = await authFetch(`${salonMastersPath()}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(staffPayloadJson(body)),
  })
  return parseJson<DashboardStaffFull>(res)
}

export async function deleteDashboardStaff(id: string): Promise<void> {
  const res = await authFetch(`${salonMastersPath()}/${id}`, { method: 'DELETE' })
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
  const res = await authFetch(`${salonMastersPath()}/${staffId}/schedule`)
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
  const res = await authFetch(`${salonMastersPath()}/${staffId}/schedule`, {
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
  const res = await authFetch(`${salonMastersPath()}/${staffId}/schedule`, {
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

export async function lookupMasterByPhone(phone: string): Promise<{
  found: boolean
  profile?: {
    id: string
    displayName: string
    bio?: string | null
    specializations: string[]
    avatarUrl?: string | null
    yearsExperience?: number | null
    phoneE164?: string | null
  }
}> {
  const q = new URLSearchParams({ phone })
  const res = await authFetch(`${base()}/masters/lookup?${q}`)
  return parseJson(res)
}

export async function createMasterInvite(masterProfileId: string): Promise<DashboardStaffFull> {
  const res = await authFetch(`${base()}/master-invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ masterProfileId }),
  })
  return parseJson<DashboardStaffFull>(res)
}

export async function updateSalonMasterServices(
  salonMasterId: string,
  rows: { serviceId: string; priceOverrideCents?: number | null; durationOverrideMinutes?: number | null }[],
): Promise<DashboardStaffFull> {
  const res = await authFetch(`${salonMastersPath()}/${salonMasterId}/services`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rows),
  })
  return parseJson<DashboardStaffFull>(res)
}
