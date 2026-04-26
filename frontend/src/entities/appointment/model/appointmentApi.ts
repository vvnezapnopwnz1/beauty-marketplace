import { rtkApi } from '@shared/api/rtkApi';
import { CreateAppointmentPayload, DashboardAppointment, DashboardAppointmentList, DashboardAppointmentListReq, UpdateAppointmentPayload } from './types';
import { AppointmentDetail } from './types';

type LegacyAppointment = DashboardAppointment & {
    serviceName?: string
    serviceId?: string
}

type LegacyAppointmentList = {
    items: LegacyAppointment[]
    total: number
}

function normalizeAppointment(raw: LegacyAppointment): DashboardAppointment {
    const serviceNames = Array.isArray(raw.serviceNames)
        ? raw.serviceNames.filter((name): name is string => Boolean(name && name.trim()))
        : []
    const serviceIds = Array.isArray(raw.serviceIds)
        ? raw.serviceIds.filter((id): id is string => Boolean(id && id.trim()))
        : []

    if (serviceNames.length === 0 && raw.serviceName) {
        serviceNames.push(raw.serviceName)
    }
    if (serviceIds.length === 0 && raw.serviceId) {
        serviceIds.push(raw.serviceId)
    }

    return {
        ...raw,
        serviceNames,
        serviceIds,
    }
}


// const q = new URLSearchParams()
// if (params.from) q.set('from', params.from)
// if (params.to) q.set('to', params.to)
// if (params.statuses?.length) q.set('status', params.statuses.join(','))
// if (params.staffId) q.set('salon_master_id', params.staffId)
// if (params.serviceId) q.set('service_id', params.serviceId)
// if (params.sortBy) q.set('sort_by', params.sortBy)
// if (params.sortDir) q.set('sort_dir', params.sortDir)
// if (params.search) q.set('search', params.search)
// if (params.page) q.set('page', String(params.page))
// if (params.pageSize) q.set('page_size', String(params.pageSize))
// const res = await authFetch(`${base()}/appointments?${q}`)
// return parseJson<DashboardAppointmentList>(res)

//rewrite old fetch request functions to rtk api queries and mutations
const appointmentApi = rtkApi.injectEndpoints({
    endpoints: (builder) => ({
        getAppointments: builder.query<DashboardAppointmentList, DashboardAppointmentListReq>({
            providesTags: ['Appointments'],
            query: (params: DashboardAppointmentListReq) => ({
                method: 'GET',
                url: '/appointments',
                params: {
                    from: params.from,
                    to: params.to,
                    status: params.statuses?.length ? params.statuses.join(',') : undefined,
                    salon_master_id: params.staffId || undefined,
                    service_id: params.serviceId || undefined,
                    sort_by: params.sortBy,
                    sort_dir: params.sortDir,
                    search: params.search,
                    page: params.page,
                    page_size: params.pageSize,
                },
            }),
            transformResponse: (response: LegacyAppointmentList): DashboardAppointmentList => ({
                total: response.total ?? 0,
                items: Array.isArray(response.items) ? response.items.map(normalizeAppointment) : [],
            }),
        }),
        getAppointmentById: builder.query<DashboardAppointment, string>({
            providesTags: ['Appointments'],
            query: (id) => ({
                url: '/appointments/' + id,
            }),
            transformResponse: (response: LegacyAppointment): DashboardAppointment => normalizeAppointment(response),
        }),
        patchAppointmentStatus: builder.mutation<void, { id: string, status: string }>({
            invalidatesTags: ['Appointments'],
            query: ({ id, status }) => {
                const payload: Record<string, unknown> = {}
                if (status !== undefined) payload.status = status
                return {
                    method: 'PATCH',
                    url: '/appointments/' + id + '/status',
                    body: payload,
                }
            },
        }),
        updateAppointment: builder.mutation<void, UpdateAppointmentPayload>({
            invalidatesTags: ['Appointments'],
            query: ({ id, body }: UpdateAppointmentPayload) => {
                const payload: Record<string, unknown> = {}
                if (body.startsAt !== undefined) payload.startsAt = body.startsAt
                if (body.endsAt !== undefined) payload.endsAt = body.endsAt
                if (body.serviceIds !== undefined) payload.serviceIds = body.serviceIds
                if (body.salonMasterId !== undefined) payload.salonMasterId = body.salonMasterId
                if (body.clearSalonMasterId === true) payload.clearSalonMasterId = true
                if (body.clientNote !== undefined) payload.clientNote = body.clientNote
                if (body.guestName !== undefined) payload.guestName = body.guestName
                if (body.guestPhone !== undefined) payload.guestPhone = body.guestPhone
                return {
                    method: 'PUT',
                    url: '/appointments/' + id,
                    body: payload,
                }
            },
        }),
        createAppointment: builder.mutation<AppointmentDetail, CreateAppointmentPayload>({
            invalidatesTags: ['Appointments'],
            query: (body: CreateAppointmentPayload) => ({
                method: 'POST',
                url: '/appointments',
                body: {
                    serviceIds: body.serviceIds,
                    salonMasterId: body.salonMasterId ?? undefined,
                    startsAt: body.startsAt,
                    guestName: body.guestName,
                    guestPhone: body.guestPhone,
                    clientNote: body.clientNote,
                },
            }),
        }),
    }),
});



/** PUT /dashboard/appointments/:id — partial body, omitted keys unchanged on server. */
// export async function updateDashboardAppointment(
//     id: string,
//     body: {
//         startsAt?: string
//         endsAt?: string
//         serviceIds?: string[]
//         salonMasterId?: string
//         clearSalonMasterId?: boolean
//         clientNote?: string
//         guestName?: string | null
//         guestPhone?: string | null
//     },
// ): Promise<void> {
//     const payload: Record<string, unknown> = {}
//     if (body.startsAt !== undefined) payload.startsAt = body.startsAt
//     if (body.endsAt !== undefined) payload.endsAt = body.endsAt
//     if (body.serviceIds !== undefined) payload.serviceIds = body.serviceIds
//     if (body.salonMasterId !== undefined) payload.salonMasterId = body.salonMasterId
//     if (body.clearSalonMasterId === true) payload.clearSalonMasterId = true
//     if (body.clientNote !== undefined) payload.clientNote = body.clientNote
//     if (body.guestName !== undefined) payload.guestName = body.guestName
//     if (body.guestPhone !== undefined) payload.guestPhone = body.guestPhone
//     const res = await authFetch(`${base()}/appointments/${id}`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//     })
//     if (!res.ok) {
//         const t = await res.text()
//         throw new Error(t || `HTTP ${res.status}`)
//     }
// }



// export async function fetchDashboardAppointments(params: {
//     from?: string
//     to?: string
//     statuses?: string[]
//     staffId?: string
//     /** Matches primary `appointments.service_id` or any `appointment_line_items.service_id` (multi-service guest visits). */
//     serviceId?: string
//     sortBy?: string
//     sortDir?: 'asc' | 'desc'
//     search?: string
//     page?: number
//     pageSize?: number
// }): Promise<DashboardAppointmentList> {
//     const q = new URLSearchParams()
//     if (params.from) q.set('from', params.from)
//     if (params.to) q.set('to', params.to)
//     if (params.statuses?.length) q.set('status', params.statuses.join(','))
//     if (params.staffId) q.set('salon_master_id', params.staffId)
//     if (params.serviceId) q.set('service_id', params.serviceId)
//     if (params.sortBy) q.set('sort_by', params.sortBy)
//     if (params.sortDir) q.set('sort_dir', params.sortDir)
//     if (params.search) q.set('search', params.search)
//     if (params.page) q.set('page', String(params.page))
//     if (params.pageSize) q.set('page_size', String(params.pageSize))
//     const res = await authFetch(`${base()}/appointments?${q}`)
//     return parseJson<DashboardAppointmentList>(res)
// }

// export async function patchAppointmentStatus(id: string, status: string): Promise<void> {
//     const res = await authFetch(`${base()}/appointments/${id}/status`, {
//         method: 'PATCH',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ status }),
//     })
//     if (!res.ok) {
//         const t = await res.text()
//         throw new Error(t || `HTTP ${res.status}`)
//     }
//     // 204 No Content
// }






export const {
    useGetAppointmentsQuery,
    useLazyGetAppointmentsQuery,
    useGetAppointmentByIdQuery,
    useLazyGetAppointmentByIdQuery,
    usePatchAppointmentStatusMutation,
    useUpdateAppointmentMutation,
    useCreateAppointmentMutation,
} = appointmentApi;
