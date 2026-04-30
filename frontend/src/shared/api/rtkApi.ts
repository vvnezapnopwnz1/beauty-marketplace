import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { HOST_API_KEY_MIDDLEWARE } from '@shared/config/config-global';
import { getStoredAccessToken, getStoredSessionId } from './authApi';
import { getActiveSalonId } from '@shared/lib/activeSalon';

const API_ORIGIN = HOST_API_KEY_MIDDLEWARE || import.meta.env.VITE_API_URL || '';

export const rtkApi = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: API_ORIGIN,
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
        'Notifications',
    ],
    endpoints: () => ({}),
});
