export type DatePreset = 'today' | 'tomorrow' | 'week' | 'custom'

export interface FilterState {
    preset: DatePreset
    from: string
    to: string
    statuses: string[]
    staffId: string
    serviceId: string
    search: string
}

export interface DashboardAppointment {
    id: string
    startsAt: string
    endsAt: string
    status: string
    serviceNames: string[]
    clientLabel: string
    clientPhone?: string | null
    serviceIds: string[]
    salonMasterId?: string | null
}

export interface DashboardAppointmentList {
    items: DashboardAppointment[]
    total: number
}


export interface DashboardAppointmentListReq {
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
}

export interface CreateAppointmentPayload {
    serviceIds: string[],
    salonMasterId?: string | null
    startsAt: string
    guestName: string
    guestPhone: string
    clientNote?: string
}

export interface UpdateAppointmentBody {
    startsAt?: string
    endsAt?: string
    serviceIds?: string[]
    salonMasterId?: string | null
    clearSalonMasterId?: boolean
    clientNote?: string
    guestName?: string | null
    guestPhone?: string | null
}

export interface UpdateAppointmentPayload {
    id: string
    body: UpdateAppointmentBody
}


export interface AppointmentDetail extends DashboardAppointment {
    salonClientId?: string | null
    createdAt: string
    services: { id: string; name: string; durationMinutes: number; priceCents: number }[]
}
