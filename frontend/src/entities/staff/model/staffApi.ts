import { rtkApi } from '@shared/api/rtkApi'
import type {
  DashboardStaffFull,
  DashboardStaffListItem,
  SalonMasterListApiRow,
  StaffFormPayload,
} from '@shared/api/dashboardApi'
import type { StaffLookupResponse } from './types'

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

function staffPayloadJson(body: StaffFormPayload) {
  const assignments =
    body.serviceAssignments && body.serviceAssignments.length > 0
      ? body.serviceAssignments
      : body.serviceIds.map(serviceId => ({
          serviceId,
          priceOverrideCents: null,
          durationOverrideMinutes: null,
        }))

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
    phoneVerificationProof: body.phoneVerificationProof ?? undefined,
  }
}

const staffApi = rtkApi.injectEndpoints({
  endpoints: builder => ({
    getStaffList: builder.query<DashboardStaffListItem[], void>({
      providesTags: result =>
        result
          ? [
              ...result.map(item => ({ type: 'Staff' as const, id: item.staff.id })),
              { type: 'Staff' as const, id: 'LIST' },
            ]
          : [{ type: 'Staff' as const, id: 'LIST' }],
      query: () => ({ url: '/api/v1/dashboard/salon-masters' }),
      transformResponse: (response: SalonMasterListApiRow[]) =>
        response.map(row => ({
          staff: rowToStaffFull(row),
          connectedServices: row.services.map(s => ({ id: s.serviceId, name: s.serviceName })),
          loadPercentWeek: row.loadPercentWeek,
          ratingAvg: row.ratingAvg,
          reviewCount: row.reviewCount,
          completedVisits: row.completedVisits,
          revenueMonthCents: row.revenueMonthCents,
        })),
    }),
    getStaffById: builder.query<DashboardStaffFull, string>({
      providesTags: (result, error, id) => [{ type: 'Staff' as const, id }],
      query: id => ({ url: `/api/v1/dashboard/salon-masters/${id}` }),
    }),
    createStaff: builder.mutation<DashboardStaffFull, StaffFormPayload>({
      invalidatesTags: [{ type: 'Staff' as const, id: 'LIST' }],
      query: body => ({ method: 'POST', url: '/api/v1/dashboard/salon-masters', body: staffPayloadJson(body) }),
    }),
    updateStaff: builder.mutation<DashboardStaffFull, { id: string; body: StaffFormPayload }>({
      invalidatesTags: (result, error, { id }) => [
        { type: 'Staff' as const, id },
        { type: 'Staff' as const, id: 'LIST' },
      ],
      query: ({ id, body }) => ({ method: 'PUT', url: `/api/v1/dashboard/salon-masters/${id}`, body: staffPayloadJson(body) }),
    }),
    deleteStaff: builder.mutation<void, string>({
      invalidatesTags: (result, error, id) => [
        { type: 'Staff' as const, id },
        { type: 'Staff' as const, id: 'LIST' },
      ],
      query: id => ({ method: 'DELETE', url: `/api/v1/dashboard/salon-masters/${id}` }),
    }),
    lookupMasterByPhone: builder.query<StaffLookupResponse, string>({
      query: phone => ({ url: `/api/v1/dashboard/masters/lookup`, params: { phone } }),
    }),
    createMasterInvite: builder.mutation<DashboardStaffFull, string>({
      invalidatesTags: [{ type: 'Staff' as const, id: 'LIST' }],
      query: masterProfileId => ({ method: 'POST', url: '/api/v1/dashboard/master-invites', body: { masterProfileId } }),
    }),
    requestStaffPhoneOtp: builder.mutation<
      { expiresAt: string },
      { phone: string; channel: 'sms' | 'telegram' }
    >({
      query: (body) => ({
        url: '/api/v1/dashboard/phone-otp/request',
        method: 'POST',
        body,
      }),
    }),
    verifyStaffPhoneOtp: builder.mutation<
      { phoneVerificationProof: string },
      { phone: string; code: string }
    >({
      query: (body) => ({
        url: '/api/v1/dashboard/phone-otp/verify',
        method: 'POST',
        body,
      }),
    }),
  }),
})

export const {
  useGetStaffListQuery,
  useGetStaffByIdQuery,
  useLazyGetStaffByIdQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
  useLazyLookupMasterByPhoneQuery,
  useCreateMasterInviteMutation,
  useRequestStaffPhoneOtpMutation,
  useVerifyStaffPhoneOtpMutation,
} = staffApi
