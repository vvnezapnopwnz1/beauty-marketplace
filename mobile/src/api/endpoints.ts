import Constants from 'expo-constants';

const AUTH_PREFIX = '/api/auth';

function normalizeApiOrigin(input: string): string {
  const trimmed = input.trim().replace(/\/$/, '');
  // Accept env values in forms:
  // - http://host:8080
  // - http://host:8080/api
  // - http://host:8080/api/v1
  return trimmed.replace(/\/api(?:\/v1)?$/, '');
}

function isLoopbackHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function getMetroLanHost(): string | null {
  const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (expoHost) return expoHost;

  const expoGoHost = Constants.expoGoConfig?.debuggerHost?.split(':')[0];
  if (expoGoHost) return expoGoHost;

  return null;
}

function replaceLoopbackWithMetroHost(origin: string): string {
  try {
    const url = new URL(origin);
    if (!isLoopbackHost(url.hostname)) return origin;

    const metroHost = getMetroLanHost();
    if (!metroHost) return origin;

    url.hostname = metroHost;
    return url.toString().replace(/\/$/, '');
  } catch {
    return origin;
  }
}

function resolveApiOrigin(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL ?? process.env.API_URL;
  if (fromEnv?.trim()) {
    const normalized = normalizeApiOrigin(fromEnv);
    return replaceLoopbackWithMetroHost(normalized);
  }

  // Expo dev fallback: use LAN host from Metro when env is absent.
  const host = getMetroLanHost();
  if (host) return `http://${host}:8080`;

  return 'http://localhost:8080';
}

const apiOrigin = resolveApiOrigin();
export const API_V1 = `${apiOrigin}/api/v1`;

export const AUTH = {
  requestOTP: `${apiOrigin}${AUTH_PREFIX}/otp/request`,
  verifyOTP: `${apiOrigin}${AUTH_PREFIX}/otp/verify`,
  refresh: `${apiOrigin}${AUTH_PREFIX}/refresh`,
  me: `${apiOrigin}${AUTH_PREFIX}/me`,
  logout: `${apiOrigin}${AUTH_PREFIX}/logout`,
} as const;
export const AUTH_ENDPOINTS = AUTH;

export const USER = {
  me: `${API_V1}/me`,
} as const;
export const USER_ENDPOINTS = USER;

export const MASTER = {
  today: `${API_V1}/master-dashboard/today`,
  appointments: `${API_V1}/master-dashboard/appointments`,
  appointment: (id: string) => `${API_V1}/master-dashboard/appointments/${id}`,
  appointmentStatus: (id: string) =>
    `${API_V1}/master-dashboard/appointments/${id}/status`,
  appointmentsHeatmap: `${API_V1}/master-dashboard/appointments/heatmap`,
  profile: `${API_V1}/master-dashboard/profile`,
  services: `${API_V1}/master-dashboard/services`,
  service: (id: string) => `${API_V1}/master-dashboard/services/${id}`,
  clients: `${API_V1}/master-dashboard/clients`,
  client: (id: string) => `${API_V1}/master-dashboard/clients/${id}`,
  serviceCategories: `${API_V1}/master-dashboard/service-categories`,
  invites: `${API_V1}/master-dashboard/invites`,
  salons: `${API_V1}/master-dashboard/salons`,
  schedule: `${API_V1}/master-dashboard/schedule`,
  financesSummary: `${API_V1}/master-dashboard/finances/summary`,
  financesTrend: `${API_V1}/master-dashboard/finances/trends`,
  financesTopServices: `${API_V1}/master-dashboard/finances/top-services`,
  financesExpenseCategories: `${API_V1}/master-dashboard/finances/expense-categories`,
  financesExpenses: `${API_V1}/master-dashboard/finances/expenses`,
} as const;
export const MASTER_ENDPOINTS = MASTER;

export const DASHBOARD = {
  root: `${API_V1}/dashboard/`,
  appointment: (id: string) => `${API_V1}/dashboard/appointments/${id}`,
  appointmentStatus: (id: string) =>
    `${API_V1}/dashboard/appointments/${id}/status`,
} as const;
export const DASHBOARD_ENDPOINTS = DASHBOARD;

export const NOTIFICATIONS = {
  list: `${API_V1}/notifications`,
  unreadCount: `${API_V1}/notifications/unread-count`,
  markSeen: (id: string) => `${API_V1}/notifications/${id}/seen`,
  markAllSeen: `${API_V1}/notifications/seen-all`,
  markRead: (id: string) => `${API_V1}/notifications/${id}/read`,
  markAllRead: `${API_V1}/notifications/read-all`,
  stream: `${API_V1}/notifications/stream`,
} as const;
export const NOTIFICATION_ENDPOINTS = NOTIFICATIONS;

export const DEVICES = {
  register: `${API_V1}/devices`,
} as const;
export const DEVICE_ENDPOINTS = DEVICES;

export const CHAT = {
  roomForAppointment: (appointmentId: string) =>
    `${API_V1}/chat/appointments/${appointmentId}/room`,
  roomByToken: (token: string) => `${API_V1}/chat/external/rooms/${token}`,
  messages: (roomId: string) => `${API_V1}/chat/rooms/${roomId}/messages`,
  read: (roomId: string) => `${API_V1}/chat/rooms/${roomId}/read`,
} as const;
export const CHAT_ENDPOINTS = CHAT;

export default {
  API_V1,
  AUTH,
  USER,
  MASTER,
  DASHBOARD,
  NOTIFICATIONS,
  DEVICES,
};