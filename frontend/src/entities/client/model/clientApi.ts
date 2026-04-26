import { rtkApi } from '@shared/api/rtkApi'
import type { ClientListRequest, ClientListResponse, SalonClient, ClientTag } from './types'

const clientApi = rtkApi.injectEndpoints({
  endpoints: builder => ({
    getClients: builder.query<ClientListResponse, ClientListRequest>({
      providesTags: ['Clients'],
      query: (params: ClientListRequest) => ({
        method: 'GET',
        url: '/clients',
        params: {
          search: params.search || undefined,
          tag_ids: params.tagIds?.length ? params.tagIds.join(',') : undefined,
          sort_by: params.sortBy || undefined,
          sort_dir: params.sortDir || undefined,
          page: params.page,
          page_size: params.pageSize,
        },
      }),
    }),
    getClientTags: builder.query<ClientTag[], void>({
      providesTags: ['Clients'],
      query: () => ({ url: '/clients/tags' }),
    }),
    getClientById: builder.query<SalonClient, string>({
      providesTags: ['Clients'],
      query: id => ({ url: `/clients/${id}` }),
    }),
  }),
})

export const {
  useGetClientsQuery,
  useGetClientTagsQuery,
  useGetClientByIdQuery,
} = clientApi
