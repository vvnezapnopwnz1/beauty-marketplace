export interface User {
  id: string;
  phone: string;
  displayName?: string | null;
  role?: string;
  globalRole?: string;
  sessionId?: string | null;
  masterProfileId?: string | null;
  effectiveRoles?: EffectiveRoles;
  createdAt?: string;
  updatedAt?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

export interface EffectiveRoles {
  isClient: boolean;
  isMaster: boolean;
  isPlatformAdmin: boolean;
  salonMemberships: Array<{
    salonId: string;
    salonName: string;
    role: 'owner' | 'admin' | 'receptionist';
  }>;
  pendingInvites: number;
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

export interface OTPRequestPayload {
  phone: string;
  channel: 'sms' | 'telegram';
}

export interface VerifyOtpPayload {
  phone: string;
  code: string;
}

export interface VerifyOtpResponse {
  tokenPair: TokenPair;
  user: {
    id: string;
    phone: string;
    displayName?: string | null;
    role: string;
    sessionId?: string | null;
    masterProfileId?: string | null;
  };
  isNew: boolean;
}

export interface MeResponse {
  id: string;
  phone: string;
  displayName?: string | null;
  globalRole: string;
  effectiveRoles: EffectiveRoles;
  masterProfileId?: string | null;
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