import type {
  DashboardStaffFull,
  DashboardStaffListItem,
  StaffFormPayload,
} from '@shared/api/dashboardApi'

export type { DashboardStaffFull, DashboardStaffListItem, StaffFormPayload }

export interface StaffLookupResponse {
  found: boolean
  profile?: {
    id: string
    displayName: string
    bio?: string | null
    specializations: string[]
    avatarUrl?: string | null
    yearsExperience?: number | null
    phoneE164?: string | null
  }
}
