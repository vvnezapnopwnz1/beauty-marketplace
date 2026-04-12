import { authFetch } from './authApi'
import { publicApiUrl } from '@shared/lib/apiPublicUrl'

const base = () => publicApiUrl('/api/v1/dashboard')

/** Локальная заглушка дашборда без JWT. В dev по умолчанию вкл.; отключить: VITE_DASHBOARD_STUB=0 */
export function isDashboardStub(): boolean {
  if (!import.meta.env.DEV) return false
  const v = import.meta.env.VITE_DASHBOARD_STUB
  return v !== '0' && v !== 'false'
}

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
}

export interface DashboardStaffRow {
  id: string
  salonId: string
  displayName: string
  isActive: boolean
  createdAt: string
}

export interface WorkingHourRow {
  id: string
  salonId: string
  dayOfWeek: number
  opensAt: string
  closesAt: string
  isClosed: boolean
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
}

export interface SalonProfile {
  id: string
  nameOverride?: string | null
  description?: string | null
  phonePublic?: string | null
  categoryId?: string | null
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

// --- in-memory stub (DEV only when isDashboardStub()) ---
const STUB_SALON_ID = '00000000-0000-0000-0000-00000000da01'
const STUB_SVC1 = '00000000-0000-0000-0000-00000000da02'
const STUB_SVC2 = '00000000-0000-0000-0000-00000000da03'
const STUB_ST1 = '00000000-0000-0000-0000-00000000da04'

function stubIso(hours: number, mins = 0) {
  const d = new Date()
  d.setHours(hours, mins, 0, 0)
  return d.toISOString()
}

let stubAppointments: DashboardAppointment[] = [
  {
    id: '00000000-0000-0000-0000-00000000a101',
    startsAt: stubIso(10, 0),
    endsAt: stubIso(11, 0),
    status: 'confirmed',
    serviceName: 'Стрижка',
    staffName: 'Мария',
    clientLabel: 'Анна К.',
    clientPhone: '+79990001122',
    serviceId: STUB_SVC1,
    staffId: STUB_ST1,
  },
  {
    id: '00000000-0000-0000-0000-00000000a102',
    startsAt: stubIso(14, 30),
    endsAt: stubIso(16, 0),
    status: 'pending',
    serviceName: 'Окрашивание',
    staffName: 'Мария',
    clientLabel: 'Елена В.',
    clientPhone: '+79990003344',
    serviceId: STUB_SVC2,
    staffId: STUB_ST1,
  },
]

let stubServices: DashboardServiceRow[] = [
  { id: STUB_SVC1, salonId: STUB_SALON_ID, name: 'Стрижка', durationMinutes: 60, priceCents: 250000, isActive: true, sortOrder: 0 },
  { id: STUB_SVC2, salonId: STUB_SALON_ID, name: 'Окрашивание', durationMinutes: 90, priceCents: 450000, isActive: true, sortOrder: 1 },
]

let stubStaff: DashboardStaffRow[] = [
  {
    id: STUB_ST1,
    salonId: STUB_SALON_ID,
    displayName: 'Мария',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
]

let stubProfile: SalonProfile = {
  id: STUB_SALON_ID,
  nameOverride: 'Studio Blanc (заглушка)',
  description: 'Данные только в браузере, без бэкенда.',
  phonePublic: '+74951234567',
  categoryId: 'hair',
  businessType: 'venue',
  onlineBookingEnabled: true,
  address: 'ул. Тверская, 12',
  timezone: 'Europe/Moscow',
  cachedRating: 4.8,
  cachedReviewCount: 42,
}

let stubSchedule: WorkingHourRow[] = [0, 1, 2, 3, 4, 5, 6].map(d => ({
  id: `00000000-0000-0000-0000-${(100 + d).toString().padStart(12, '0')}`,
  salonId: STUB_SALON_ID,
  dayOfWeek: d,
  opensAt: '10:00:00',
  closesAt: '20:00:00',
  isClosed: d === 6,
}))

const stubDelay = (ms = 120) => new Promise<void>(r => setTimeout(r, ms))

async function stubFetchStats(): Promise<DashboardStats> {
  await stubDelay()
  const today = stubAppointments.filter(a => a.startsAt.slice(0, 10) === new Date().toISOString().slice(0, 10))
  const conf = today.filter(a => a.status === 'confirmed').length
  const pend = stubAppointments.filter(a => a.status === 'pending').length
  return {
    appointmentsToday: today.length,
    appointmentsTodayConfirmed: conf,
    newAppointmentsWeek: stubAppointments.length,
    newAppointmentsPrevWeek: 2,
    weekChangePct: 12,
    loadPct: today.length ? (conf / today.length) * 100 : 0,
    rating: 4.8,
    reviewCount: 42,
    pendingCount: pend,
  }
}

async function stubFetchAppointments(params: {
  from?: string
  to?: string
  status?: string
}): Promise<DashboardAppointmentList> {
  await stubDelay()
  let items = [...stubAppointments]
  if (params.from && params.to && params.from === params.to) {
    items = items.filter(a => a.startsAt.slice(0, 10) === params.from)
  } else {
    if (params.from) {
      items = items.filter(a => a.startsAt.slice(0, 10) >= params.from!)
    }
    if (params.to) {
      items = items.filter(a => a.startsAt.slice(0, 10) < params.to!)
    }
  }
  if (params.status) {
    items = items.filter(a => a.status === params.status)
  }
  return { items, total: items.length }
}

async function stubPatchAppointmentStatus(id: string, status: string): Promise<void> {
  await stubDelay()
  const a = stubAppointments.find(x => x.id === id)
  if (a) a.status = status
}

async function stubCreateAppointment(body: {
  serviceId: string
  staffId?: string | null
  startsAt: string
  guestName: string
  guestPhone: string
}): Promise<void> {
  await stubDelay()
  const svc = stubServices.find(s => s.id === body.serviceId)
  const st = body.staffId ? stubStaff.find(s => s.id === body.staffId) : null
  const start = new Date(body.startsAt)
  const end = new Date(start.getTime() + (svc?.durationMinutes ?? 60) * 60000)
  stubAppointments.push({
    id: crypto.randomUUID(),
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    status: 'pending',
    serviceName: svc?.name ?? 'Услуга',
    staffName: st?.displayName ?? null,
    clientLabel: body.guestName,
    clientPhone: body.guestPhone,
    serviceId: body.serviceId,
    staffId: body.staffId ?? null,
  })
}

async function stubFetchServices(): Promise<DashboardServiceRow[]> {
  await stubDelay()
  return [...stubServices]
}

async function stubCreateService(row: {
  name: string
  durationMinutes: number
  priceCents?: number | null
  isActive?: boolean
  sortOrder?: number
}): Promise<DashboardServiceRow> {
  await stubDelay()
  const r: DashboardServiceRow = {
    id: crypto.randomUUID(),
    salonId: STUB_SALON_ID,
    name: row.name,
    durationMinutes: row.durationMinutes,
    priceCents: row.priceCents ?? null,
    isActive: row.isActive ?? true,
    sortOrder: row.sortOrder ?? stubServices.length,
  }
  stubServices.push(r)
  return r
}

async function stubUpdateService(
  id: string,
  row: Partial<Pick<DashboardServiceRow, 'name' | 'durationMinutes' | 'priceCents' | 'isActive' | 'sortOrder'>>,
): Promise<DashboardServiceRow> {
  await stubDelay()
  const s = stubServices.find(x => x.id === id)
  if (!s) throw new Error('not found')
  if (row.name != null) s.name = row.name
  if (row.durationMinutes != null) s.durationMinutes = row.durationMinutes
  if (row.priceCents !== undefined) s.priceCents = row.priceCents
  if (row.isActive != null) s.isActive = row.isActive
  if (row.sortOrder != null) s.sortOrder = row.sortOrder
  return { ...s }
}

async function stubDeleteService(id: string): Promise<void> {
  await stubDelay()
  const i = stubServices.findIndex(x => x.id === id)
  if (i >= 0) stubServices[i] = { ...stubServices[i]!, isActive: false }
}

async function stubFetchStaffList(): Promise<DashboardStaffRow[]> {
  await stubDelay()
  return [...stubStaff]
}

async function stubCreateStaff(displayName: string): Promise<DashboardStaffRow> {
  await stubDelay()
  const r: DashboardStaffRow = {
    id: crypto.randomUUID(),
    salonId: STUB_SALON_ID,
    displayName,
    isActive: true,
    createdAt: new Date().toISOString(),
  }
  stubStaff.push(r)
  return r
}

async function stubUpdateStaff(id: string, displayName: string, isActive: boolean): Promise<DashboardStaffRow> {
  await stubDelay()
  const s = stubStaff.find(x => x.id === id)
  if (!s) throw new Error('not found')
  if (displayName.trim()) s.displayName = displayName
  s.isActive = isActive
  return { ...s }
}

async function stubDeleteStaff(id: string): Promise<void> {
  await stubDelay()
  const s = stubStaff.find(x => x.id === id)
  if (s) s.isActive = false
}

async function stubFetchSchedule(): Promise<WorkingHourRow[]> {
  await stubDelay()
  return [...stubSchedule]
}

async function stubPutSchedule(
  rows: { dayOfWeek: number; opensAt: string; closesAt: string; closed: boolean }[],
): Promise<void> {
  await stubDelay()
  for (const r of rows) {
    const wh = stubSchedule.find(x => x.dayOfWeek === r.dayOfWeek)
    if (wh) {
      wh.isClosed = r.closed
      wh.opensAt = r.opensAt.includes(':') && r.opensAt.split(':').length === 2 ? `${r.opensAt}:00` : r.opensAt
      wh.closesAt = r.closesAt.includes(':') && r.closesAt.split(':').length === 2 ? `${r.closesAt}:00` : r.closesAt
    }
  }
}

async function stubFetchStaffSchedule(staffId: string): Promise<StaffWorkingHourRow[]> {
  await stubDelay()
  return [0, 1, 2, 3, 4, 5, 6].map(d => ({
    id: crypto.randomUUID(),
    staffId,
    dayOfWeek: d,
    opensAt: '10:00:00',
    closesAt: '18:00:00',
    isDayOff: false,
  }))
}

async function stubPutStaffSchedule(
  staffId: string,
  rows: { dayOfWeek: number; opensAt: string; closesAt: string; isDayOff: boolean }[],
): Promise<void> {
  await stubDelay()
  void staffId
  void rows
}

async function stubFetchProfile(): Promise<SalonProfile> {
  await stubDelay()
  return { ...stubProfile }
}

async function stubPutProfile(partial: Partial<SalonProfile>): Promise<SalonProfile> {
  await stubDelay()
  stubProfile = { ...stubProfile, ...partial }
  return { ...stubProfile }
}

export async function fetchDashboardStats(period = 'week'): Promise<DashboardStats> {
  if (isDashboardStub()) return stubFetchStats()
  const res = await authFetch(`${base()}/stats?period=${encodeURIComponent(period)}`)
  return parseJson<DashboardStats>(res)
}

export async function fetchDashboardAppointments(params: {
  from?: string
  to?: string
  status?: string
  staffId?: string
  page?: number
  pageSize?: number
}): Promise<DashboardAppointmentList> {
  if (isDashboardStub()) return stubFetchAppointments(params)
  const q = new URLSearchParams()
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  if (params.status) q.set('status', params.status)
  if (params.staffId) q.set('staff_id', params.staffId)
  if (params.page) q.set('page', String(params.page))
  if (params.pageSize) q.set('page_size', String(params.pageSize))
  const res = await authFetch(`${base()}/appointments?${q}`)
  return parseJson<DashboardAppointmentList>(res)
}

export async function patchAppointmentStatus(id: string, status: string): Promise<void> {
  if (isDashboardStub()) return stubPatchAppointmentStatus(id, status)
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
  if (isDashboardStub()) return stubCreateAppointment(body)
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

export async function fetchDashboardServices(): Promise<DashboardServiceRow[]> {
  if (isDashboardStub()) return stubFetchServices()
  const res = await authFetch(`${base()}/services`)
  return parseJson<DashboardServiceRow[]>(res)
}

export async function createDashboardService(row: {
  name: string
  durationMinutes: number
  priceCents?: number | null
  isActive?: boolean
  sortOrder?: number
}): Promise<DashboardServiceRow> {
  if (isDashboardStub()) return stubCreateService(row)
  const res = await authFetch(`${base()}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: row.name,
      durationMinutes: row.durationMinutes,
      priceCents: row.priceCents ?? null,
      isActive: row.isActive ?? true,
      sortOrder: row.sortOrder ?? 0,
    }),
  })
  return parseJson<DashboardServiceRow>(res)
}

export async function updateDashboardService(
  id: string,
  row: Partial<Pick<DashboardServiceRow, 'name' | 'durationMinutes' | 'priceCents' | 'isActive' | 'sortOrder'>>,
): Promise<DashboardServiceRow> {
  if (isDashboardStub()) return stubUpdateService(id, row)
  const res = await authFetch(`${base()}/services/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: row.name ?? '',
      durationMinutes: row.durationMinutes ?? 0,
      priceCents: row.priceCents ?? null,
      isActive: row.isActive ?? true,
      sortOrder: row.sortOrder ?? 0,
    }),
  })
  return parseJson<DashboardServiceRow>(res)
}

export async function deleteDashboardService(id: string): Promise<void> {
  if (isDashboardStub()) return stubDeleteService(id)
  const res = await authFetch(`${base()}/services/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
}

export async function fetchDashboardStaff(): Promise<DashboardStaffRow[]> {
  if (isDashboardStub()) return stubFetchStaffList()
  const res = await authFetch(`${base()}/staff`)
  return parseJson<DashboardStaffRow[]>(res)
}

export async function createDashboardStaff(displayName: string): Promise<DashboardStaffRow> {
  if (isDashboardStub()) return stubCreateStaff(displayName)
  const res = await authFetch(`${base()}/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  })
  return parseJson<DashboardStaffRow>(res)
}

export async function updateDashboardStaff(id: string, displayName: string, isActive: boolean): Promise<DashboardStaffRow> {
  if (isDashboardStub()) return stubUpdateStaff(id, displayName, isActive)
  const res = await authFetch(`${base()}/staff/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName, isActive }),
  })
  return parseJson<DashboardStaffRow>(res)
}

export async function deleteDashboardStaff(id: string): Promise<void> {
  if (isDashboardStub()) return stubDeleteStaff(id)
  const res = await authFetch(`${base()}/staff/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
}

export async function fetchSalonSchedule(): Promise<WorkingHourRow[]> {
  if (isDashboardStub()) return stubFetchSchedule()
  const res = await authFetch(`${base()}/schedule`)
  return parseJson<WorkingHourRow[]>(res)
}

export async function putSalonSchedule(rows: { dayOfWeek: number; opensAt: string; closesAt: string; closed: boolean }[]): Promise<void> {
  if (isDashboardStub()) return stubPutSchedule(rows)
  const res = await authFetch(`${base()}/schedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
}

export async function fetchStaffSchedule(staffId: string): Promise<StaffWorkingHourRow[]> {
  if (isDashboardStub()) return stubFetchStaffSchedule(staffId)
  const res = await authFetch(`${base()}/staff/${staffId}/schedule`)
  return parseJson<StaffWorkingHourRow[]>(res)
}

export async function putStaffSchedule(
  staffId: string,
  rows: { dayOfWeek: number; opensAt: string; closesAt: string; isDayOff: boolean }[],
): Promise<void> {
  if (isDashboardStub()) return stubPutStaffSchedule(staffId, rows)
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

export async function fetchSalonProfile(): Promise<SalonProfile> {
  if (isDashboardStub()) return stubFetchProfile()
  const res = await authFetch(`${base()}/salon/profile`)
  return parseJson<SalonProfile>(res)
}

export async function putSalonProfile(partial: Partial<SalonProfile>): Promise<SalonProfile> {
  if (isDashboardStub()) return stubPutProfile(partial)
  const res = await authFetch(`${base()}/salon/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial),
  })
  return parseJson<SalonProfile>(res)
}
