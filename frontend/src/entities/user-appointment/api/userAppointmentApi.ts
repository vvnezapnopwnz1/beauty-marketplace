import { rtkApi } from '@shared/api/rtkApi'
import type { UserAppointmentsResponse } from '../model/types'

export const userAppointmentApi = rtkApi.injectEndpoints({
  endpoints: (build) => ({
    getMyAppointments: build.query<UserAppointmentsResponse, { page?: number; pageSize?: number }>({
      query: ({ page = 1, pageSize = 20 } = {}) =>
        `/api/v1/me/appointments?page=${page}&page_size=${pageSize}`,
      providesTags: ['MyAppointments'],
    }),
  }),
})

export const { useGetMyAppointmentsQuery } = userAppointmentApi
