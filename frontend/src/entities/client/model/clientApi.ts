import { rtkApi } from '@shared/api/rtkApi'
import type {
  ClientListRequest,
  ClientListResponse,
  SalonClient,
  ClientTag,
  ClientAppointmentListResponse,
} from './types'

/** Ответ merge — сервер отдаёт урезанный объект; для кэша достаточно инвалидации тегов. */
export type MergeClientResponse = Pick<
  SalonClient,
  'id' | 'salonId' | 'displayName' | 'phoneE164' | 'notes' | 'userId'
>

const clientApi = rtkApi.injectEndpoints({
  endpoints: builder => ({
    getClients: builder.query<ClientListResponse, ClientListRequest>({
      providesTags: ['Clients'],
      query: params => ({
        method: 'GET',
        url: '/api/v1/dashboard/clients',
        params: {
          search: params.search || undefined,
          tag_ids: params.tagIds?.length ? params.tagIds.join(',') : undefined,
          sort_by: params.sortBy || undefined,
          sort_dir: params.sortDir || undefined,
          page: params.page,
          page_size: params.pageSize,
          include_deleted: params.includeDead ? 'true' : undefined,
        },
      }),
    }),
    getClientTags: builder.query<ClientTag[], void>({
      providesTags: ['Clients'],
      query: () => ({ url: '/api/v1/dashboard/clients/tags' }),
    }),
    getClientById: builder.query<SalonClient, string>({
      providesTags: ['Clients'],
      query: id => ({ url: `/api/v1/dashboard/clients/${id}` }),
    }),
    getClientAppointments: builder.query<
      ClientAppointmentListResponse,
      { clientId: string; page?: number; pageSize?: number }
    >({
      providesTags: ['Clients'],
      query: ({ clientId, page = 1, pageSize = 25 }) => ({
        url: `/api/v1/dashboard/clients/${clientId}/appointments`,
        params: { page, page_size: pageSize },
      }),
    }),
    createClient: builder.mutation<SalonClient, { displayName: string; phoneE164?: string }>({
      invalidatesTags: ['Clients'],
      query: body => ({ method: 'POST', url: '/api/v1/dashboard/clients', body }),
    }),
    updateClient: builder.mutation<
      SalonClient,
      { id: string; body: { displayName?: string; notes?: string; phoneE164?: string; extraContact?: string } }
    >({
      invalidatesTags: ['Clients'],
      query: ({ id, body }) => ({ method: 'PUT', url: `/api/v1/dashboard/clients/${id}`, body }),
    }),
    deleteClient: builder.mutation<void, string>({
      invalidatesTags: ['Clients'],
      query: id => ({ method: 'DELETE', url: `/api/v1/dashboard/clients/${id}` }),
    }),
    restoreClient: builder.mutation<SalonClient, string>({
      invalidatesTags: ['Clients'],
      query: id => ({ method: 'POST', url: `/api/v1/dashboard/clients/${id}/restore` }),
    }),
    assignTag: builder.mutation<void, { clientId: string; tagId: string }>({
      invalidatesTags: ['Clients'],
      query: ({ clientId, tagId }) => ({
        method: 'POST',
        url: `/api/v1/dashboard/clients/${clientId}/tags`,
        body: { tagId },
      }),
    }),
    removeTag: builder.mutation<void, { clientId: string; tagId: string }>({
      invalidatesTags: ['Clients'],
      query: ({ clientId, tagId }) => ({
        method: 'DELETE',
        url: `/api/v1/dashboard/clients/${clientId}/tags/${tagId}`,
      }),
    }),
    createClientTag: builder.mutation<ClientTag, { name: string; color: string }>({
      invalidatesTags: ['Clients'],
      query: body => ({ method: 'POST', url: '/api/v1/dashboard/clients/tags', body }),
    }),
    mergeClientToUser: builder.mutation<MergeClientResponse, { clientId: string; userId: string }>({
      invalidatesTags: ['Clients'],
      query: ({ clientId, userId }) => ({
        method: 'POST',
        url: `/api/v1/dashboard/clients/${clientId}/merge`,
        body: { userId },
      }),
    }),
  }),
})

export const {
  useGetClientsQuery,
  useGetClientTagsQuery,
  useGetClientByIdQuery,
  useGetClientAppointmentsQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
  useRestoreClientMutation,
  useAssignTagMutation,
  useRemoveTagMutation,
  useCreateClientTagMutation,
  useMergeClientToUserMutation,
} = clientApi
