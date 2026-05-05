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