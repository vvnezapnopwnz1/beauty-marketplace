const rawApiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";
const AUTH_PREFIX = "/api/auth";
export const API_V1 = `${rawApiUrl.replace(/\/$/, "")}/api/v1`;

export const AUTH = {
  requestOTP: `${rawApiUrl.replace(/\/$/, "")}${AUTH_PREFIX}/otp/request`,
  verifyOTP: `${rawApiUrl.replace(/\/$/, "")}${AUTH_PREFIX}/otp/verify`,
  refresh: `${rawApiUrl.replace(/\/$/, "")}${AUTH_PREFIX}/refresh`,
  me: `${rawApiUrl.replace(/\/$/, "")}${AUTH_PREFIX}/me`,
  logout: `${rawApiUrl.replace(/\/$/, "")}${AUTH_PREFIX}/logout`,
} as const;

export const USER = {
  me: `${API_V1}/me`,
} as const;

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
  financesSummary: `${API_V1}/master-dashboard/finances/summary`,
  financesExpenseCategories: `${API_V1}/master-dashboard/finances/expense-categories`,
  financesExpenses: `${API_V1}/master-dashboard/finances/expenses`,
} as const;

export const DASHBOARD = {
  root: `${API_V1}/dashboard/`,
} as const;

export const NOTIFICATIONS = {
  list: `${API_V1}/notifications`,
  unreadCount: `${API_V1}/notifications/unread-count`,
  markSeen: (id: string) => `${API_V1}/notifications/${id}/seen`,
  markAllSeen: `${API_V1}/notifications/seen-all`,
  markRead: (id: string) => `${API_V1}/notifications/${id}/read`,
  markAllRead: `${API_V1}/notifications/read-all`,
  stream: `${API_V1}/notifications/stream`,
} as const;

export const DEVICES = {
  register: `${API_V1}/devices`,
} as const;

export default {
  API_V1,
  AUTH,
  USER,
  MASTER,
  DASHBOARD,
  NOTIFICATIONS,
  DEVICES,
};
// Environment variables
const API_URL = process.env.API_URL || 'http://localhost:8080/api/v1';

// Auth endpoints
export const AUTH_ENDPOINTS = {
  requestOTP: `${API_URL}/auth/request-otp`,
  verifyOTP: `${API_URL}/auth/verify-otp`,
};

// User endpoints
export const USER_ENDPOINTS = {
  me: `${API_URL}/users/me`,
};

// Appointment endpoints
export const APPOINTMENT_ENDPOINTS = {
  list: `${API_URL}/appointments`,
  getById: (id: string) => `${API_URL}/appointments/${id}`,
  create: `${API_URL}/appointments`,
  update: (id: string) => `${API_URL}/appointments/${id}`,
  delete: (id: string) => `${API_URL}/appointments/${id}`,
};

// Device endpoints
export const DEVICE_ENDPOINTS = {
  register: `${API_URL}/devices`,
};

// Notification endpoints
export const NOTIFICATION_ENDPOINTS = {
  list: `${API_URL}/notifications`,
  markAsRead: (id: string) => `${API_URL}/notifications/${id}/read`,
};