export interface User {
  id: string;
  phone: string;
  effectiveRoles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface Appointment {
  id: string;
  userId: string;
  masterId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  phone: string;
  code: string;
}

export interface LoginResponse {
  tokenPair: TokenPair;
  user: User;
}

export interface RegisterDeviceRequest {
  deviceToken: string;
  platform: 'ios' | 'android';
  appVersion?: string;
}

export interface RegisterDeviceResponse {
  deviceId: string;
  userId: string;
  deviceToken: string;
  platform: string;
  appVersion?: string;
  createdAt: string;
  updatedAt: string;
}