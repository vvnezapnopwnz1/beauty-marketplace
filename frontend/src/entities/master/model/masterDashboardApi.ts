import { rtkApi } from '@shared/api/rtkApi'

export interface MasterAppointmentDTO {
  id: string
  salonId?: string | null
  salonName?: string | null
  startsAt: string
  endsAt: string
  status: string
  serviceName: string
  clientLabel: string
  clientPhone?: string | null
  clientNote?: string | null
  serviceId: string
  salonMasterId?: string | null
  totalPriceCents?: number
}

export interface MasterAppointmentListResponse {
  items: MasterAppointmentDTO[]
  total: number
}

export interface MasterAppointmentListRequest {
  from?: string
  to?: string
  status?: string
  search?: string
  source?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface MasterClientDTO {
  id: string
  userId?: string | null
  phone?: string | null
  displayName: string
  notes?: string | null
  extraContact?: string | null
}

export interface MasterClientListResponse {
  items: MasterClientDTO[]
  total: number
}

export interface MasterClientListRequest {
  search?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export type CreateMasterPersonalAppointmentBody = {
  serviceIds: string[]
  startsAt: string
  guestName: string
  guestPhone: string
  clientNote?: string
  clientUserId?: string
}

export type UpdateMasterPersonalAppointmentBody = {
  startsAt?: string
  endsAt?: string
  serviceIds?: string[]
  clientNote?: string | null
  guestName?: string | null
  guestPhone?: string | null
}

export type CreateMasterClientBody = {
  displayName: string
  phone?: string
  notes?: string
  extraContact?: string
}

/** PUT /clients/:id — include userId when updating linked clients so the link is preserved. */
export type UpdateMasterClientBody = CreateMasterClientBody & {
  userId?: string | null
}

export interface MasterSalonMembershipDTO {
  salonMasterId: string
  salonId: string
  salonName: string
  salonAddress?: string | null
  joinedAt?: string | null
}

const masterDashboardApi = rtkApi.injectEndpoints({
  endpoints: builder => ({
    getMasterAppointments: builder.query<MasterAppointmentListResponse, MasterAppointmentListRequest>({
      providesTags: ['MasterAppointments', 'MasterClients'],
      query: params => ({
        url: '/api/v1/master-dashboard/appointments',
        params: {
          from: params.from || undefined,
          to: params.to || undefined,
          status: params.status || undefined,
          search: params.search || undefined,
          source: params.source || undefined,
          sort_by: params.sortBy || undefined,
          sort_dir: params.sortDir || undefined,
          page: params.page,
          page_size: params.pageSize,
        },
      }),
      transformResponse: (res: MasterAppointmentListResponse) => ({
        items: res.items ?? [],
        total: res.total ?? 0,
      }),
    }),

    getMasterClients: builder.query<MasterClientListResponse, MasterClientListRequest>({
      providesTags: ['MasterClients'],
      query: params => ({
        url: '/api/v1/master-dashboard/clients',
        params: {
          search: params.search || undefined,
          sort_by: params.sortBy || undefined,
          sort_dir: params.sortDir || undefined,
          page: params.page,
          page_size: params.pageSize,
        },
      }),
      transformResponse: (res: MasterClientListResponse) => ({
        items: res.items ?? [],
        total: res.total ?? 0,
      }),
    }),

    getMasterSalons: builder.query<MasterSalonMembershipDTO[], void>({
      query: () => '/api/v1/master-dashboard/salons',
    }),

    createMasterPersonalAppointment: builder.mutation<unknown, CreateMasterPersonalAppointmentBody>({
      invalidatesTags: ['MasterAppointments', 'FinanceSummary', 'FinanceExpenses'],
      query: body => ({
        url: '/api/v1/master-dashboard/appointments',
        method: 'POST',
        body,
      }),
    }),

    updateMasterPersonalAppointment: builder.mutation<
      void,
      { id: string; body: UpdateMasterPersonalAppointmentBody }
    >({
      invalidatesTags: ['MasterAppointments', 'FinanceSummary', 'FinanceExpenses'],
      query: ({ id, body }) => ({
        url: `/api/v1/master-dashboard/appointments/${id}`,
        method: 'PUT',
        body,
      }),
    }),

    patchMasterAppointmentStatus: builder.mutation<void, { id: string; status: string }>({
      invalidatesTags: ['MasterAppointments', 'FinanceSummary', 'FinanceExpenses'],
      query: ({ id, status }) => ({
        url: `/api/v1/master-dashboard/appointments/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
    }),

    createMasterClient: builder.mutation<MasterClientDTO, CreateMasterClientBody>({
      invalidatesTags: ['MasterClients'],
      query: body => ({
        url: '/api/v1/master-dashboard/clients',
        method: 'POST',
        body: {
          displayName: body.displayName,
          ...(body.phone !== undefined && body.phone !== '' ? { phone: body.phone } : {}),
          ...(body.notes !== undefined && body.notes !== '' ? { notes: body.notes } : {}),
          ...(body.extraContact !== undefined && body.extraContact !== ''
            ? { extraContact: body.extraContact }
            : {}),
        },
      }),
    }),

    updateMasterClient: builder.mutation<MasterClientDTO, { id: string; body: UpdateMasterClientBody }>({
      invalidatesTags: ['MasterClients', 'MasterAppointments'],
      query: ({ id, body }) => ({
        url: `/api/v1/master-dashboard/clients/${id}`,
        method: 'PUT',
        body: {
          displayName: body.displayName,
          phone: body.phone ?? null,
          notes: body.notes ?? null,
          extraContact: body.extraContact ?? null,
          ...(body.userId ? { userId: body.userId } : {}),
        },
      }),
    }),

    deleteMasterClient: builder.mutation<void, string>({
      invalidatesTags: ['MasterClients'],
      query: id => ({
        url: `/api/v1/master-dashboard/clients/${id}`,
        method: 'DELETE',
      }),
    }),
  }),
})

export const {
  useGetMasterAppointmentsQuery,
  useLazyGetMasterAppointmentsQuery,
  useGetMasterClientsQuery,
  useLazyGetMasterClientsQuery,
  useGetMasterSalonsQuery,
  useCreateMasterPersonalAppointmentMutation,
  useUpdateMasterPersonalAppointmentMutation,
  usePatchMasterAppointmentStatusMutation,
  useCreateMasterClientMutation,
  useUpdateMasterClientMutation,
  useDeleteMasterClientMutation,
} = masterDashboardApi
