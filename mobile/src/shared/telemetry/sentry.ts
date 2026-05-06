import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

let sentryInitialized = false;

export function initSentry(): void {
  if (sentryInitialized) return;
  if (Platform.OS === 'web') return;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }

      if (event.request?.data && typeof event.request.data === 'object') {
        const payload = event.request.data as Record<string, unknown>;
        ['phone', 'email', 'displayName', 'guestPhone', 'guestName'].forEach((key) => {
          delete payload[key];
        });
      }

      return event;
    },
  });

  sentryInitialized = true;
}
