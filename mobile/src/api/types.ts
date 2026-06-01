export interface User {
  id: string;
  phone: string;
  displayName?: string | null;
  avatarUrl?: string | null;
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
  status:
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled_by_salon'
  | 'cancelled_by_client'
  | 'no_show';
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

export interface MasterProfileBlock {
  specializations?: string[];
  yearsExperience?: number | null;
  publishedAt?: string | null;
  onboardingStep?: string | null;
}

export interface MeResponse {
  id: string;
  phone: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  globalRole: string;
  effectiveRoles: EffectiveRoles;
  masterProfileId?: string | null;
  master?: MasterProfileBlock | null;
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

export interface MasterCabinetProfile {
  id: string;
  displayName: string;
  bio?: string | null;
  specializations: string[];
  yearsExperience?: number | null;
  avatarUrl?: string | null;
  phoneE164: string;
  publishedAt?: string | null;
  onboardingStep?: string | null;
}

export interface UpdateMasterCabinetProfile {
  displayName: string;
  bio?: string | null;
  specializations: string[];
  yearsExperience?: number | null;
  avatarUrl?: string | null;
}

export type MasterOnboardingStartStatus = 'existing' | 'claimed' | 'created';

export interface MasterOnboardingStartResult {
  masterProfileId: string;
  status: MasterOnboardingStartStatus;
  onboardingStep?: string | null;
  redirect: string;
}

export interface PublishMasterProfileResult {
  masterProfileId: string;
  publishedAt: string;
  onboardingStep: string;
}

export interface DashboardServiceCategoryItem {
  slug: string;
  nameRu: string;
  nameEn?: string | null;
  parentSlug: string;
  sortOrder: number;
}

export interface DashboardServiceCategoryGroup {
  parentSlug: string;
  label: string;
  labelRu?: string;
  labelEn?: string | null;
  specialistTitleRu?: string;
  specialistTitleEn?: string | null;
  items: DashboardServiceCategoryItem[];
}

export interface DashboardServiceCategoriesResponse {
  salonType?: string | null;
  salonCategoryScopes?: string[];
  groups: DashboardServiceCategoryGroup[];
}

export interface MasterServiceDTO {
  id: string;
  name: string;
  categorySlug?: string | null;
  description?: string | null;
  priceCents?: number | null;
  durationMinutes: number;
  isActive: boolean;
}

export interface CreateMasterServiceInput {
  name: string;
  categorySlug?: string | null;
  description?: string | null;
  priceCents?: number | null;
  durationMinutes: number;
}