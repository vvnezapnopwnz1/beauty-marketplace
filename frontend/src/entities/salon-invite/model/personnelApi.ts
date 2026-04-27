import { rtkApi } from '@shared/api/rtkApi'

export interface SalonMemberRow {
  userId: string
  phoneE164: string
  displayName?: string | null
  role: string
}

export interface StaffInviteRow {
  id: string
  salonId: string
  salonName?: string
  phoneE164: string
  role: string
  status: string
  invitedBy: string
  userId?: string | null
  createdAt: string
  expiresAt: string
}

const personnelApi = rtkApi.injectEndpoints({
  endpoints: builder => ({
    getSalonMembers: builder.query<SalonMemberRow[], void>({
      providesTags: [{ type: 'Personnel' as const, id: 'MEMBERS' }],
      query: () => ({ url: '/salon-members' }),
      transformResponse: (r: { items: SalonMemberRow[] }) => r.items ?? [],
    }),
    getStaffInvites: builder.query<StaffInviteRow[], void>({
      providesTags: [{ type: 'Personnel' as const, id: 'INVITES' }],
      query: () => ({ url: '/staff-invites' }),
      transformResponse: (r: { items: StaffInviteRow[] }) => r.items ?? [],
    }),
    createStaffInvite: builder.mutation<StaffInviteRow, { phoneE164: string; role: string }>({
      invalidatesTags: [{ type: 'Personnel' as const, id: 'INVITES' }],
      query: body => ({ url: '/staff-invites', method: 'POST', body }),
    }),
    revokeStaffInvite: builder.mutation<void, string>({
      invalidatesTags: [{ type: 'Personnel' as const, id: 'INVITES' }],
      query: id => ({ url: `/staff-invites/${id}`, method: 'DELETE' }),
    }),
    removeSalonMember: builder.mutation<void, string>({
      invalidatesTags: () => [
        { type: 'Personnel' as const, id: 'MEMBERS' },
        { type: 'Personnel' as const, id: 'INVITES' },
        { type: 'Staff' as const, id: 'LIST' },
      ],
      query: userId => ({ url: `/salon-members/${userId}`, method: 'DELETE' }),
    }),
    updateSalonMemberRole: builder.mutation<void, { userId: string; role: string }>({
      invalidatesTags: [{ type: 'Personnel' as const, id: 'MEMBERS' }],
      query: ({ userId, role }) => ({
        url: `/salon-members/${userId}`,
        method: 'PATCH',
        body: { role },
      }),
    }),
  }),
})

export const {
  useGetSalonMembersQuery,
  useGetStaffInvitesQuery,
  useCreateStaffInviteMutation,
  useRevokeStaffInviteMutation,
  useRemoveSalonMemberMutation,
  useUpdateSalonMemberRoleMutation,
} = personnelApi
