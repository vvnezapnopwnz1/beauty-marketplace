import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { HOST_API_KEY_MIDDLEWARE } from '@shared/config/config-global';
import { publicApiUrl } from '@shared/lib/apiPublicUrl';
import { getStoredAccessToken, getStoredSessionId } from './authApi';
import { getActiveSalonId } from '@shared/lib/activeSalon';

export const rtkApi = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: HOST_API_KEY_MIDDLEWARE || publicApiUrl('/api/v1/dashboard'),
        prepareHeaders: (headers) => {
            const token = getStoredAccessToken();
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
            const sessionId = getStoredSessionId();
            if (sessionId) {
                headers.set('X-Session-Id', sessionId);
            }
            const salonId = getActiveSalonId();
            if (salonId) {
                headers.set('X-Salon-Id', salonId);
            }
            return headers;
        },
    }),
    tagTypes: [
        'Appointments',
        'Clients',
        'Staff',
        'Personnel',
    ],
    endpoints: () => ({}),
});
