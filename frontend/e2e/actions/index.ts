import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'

import { authActions } from './auth.actions'
import { dashboardActions } from './dashboard.actions'
import { navigationActions } from './navigation.actions'
import { staffActions } from './staff.actions'
import { servicesActions } from './services.actions'
import { appointmentsActions } from './appointments.actions'
import { bookingActions } from './booking.actions'
import { clientsActions } from './clients.actions'
import { calendarActions } from './calendar.actions'
import { claimActions } from './claim.actions'
import { onboardingActions } from './onboarding.actions'
import { profileActions } from './profile.actions'
import { searchActions } from './search.actions'
import { personnelActions } from './personnel.actions'
import { meActions } from './me.actions'
import { masterDashboardActions } from './master-dashboard.actions'
import { adminActions } from './admin.actions'
import { salonPageActions } from './salon-page.actions'
import { scheduleActions } from './schedule.actions'
import { assertActions } from './assert.actions'
import { joinActions } from './join.actions'

export type ActionFn = (
  page: Page,
  ctx: TestContext,
  api: ApiHelpers,
  data?: Record<string, unknown>,
) => Promise<void>

/**
 * Registry: maps "namespace.action" strings from YAML to executable functions.
 * Each module exports a Record<string, ActionFn>.
 */
const registry: Record<string, ActionFn> = {
  ...prefixActions('auth', authActions),
  ...prefixActions('dashboard', dashboardActions),
  ...prefixActions('navigation', navigationActions),
  ...prefixActions('staff', staffActions),
  ...prefixActions('services', servicesActions),
  ...prefixActions('appointments', appointmentsActions),
  ...prefixActions('booking', bookingActions),
  ...prefixActions('clients', clientsActions),
  ...prefixActions('calendar', calendarActions),
  ...prefixActions('claim', claimActions),
  ...prefixActions('onboarding', onboardingActions),
  ...prefixActions('profile', profileActions),
  ...prefixActions('search', searchActions),
  ...prefixActions('personnel', personnelActions),
  ...prefixActions('me', meActions),
  ...prefixActions('masterDashboard', masterDashboardActions),
  ...prefixActions('admin', adminActions),
  ...prefixActions('salonPage', salonPageActions),
  ...prefixActions('schedule', scheduleActions),
  ...prefixActions('assert', assertActions),
  ...prefixActions('join', joinActions),
}

function prefixActions(prefix: string, actions: Record<string, ActionFn>): Record<string, ActionFn> {
  const result: Record<string, ActionFn> = {}
  for (const [key, fn] of Object.entries(actions)) {
    result[`${prefix}.${key}`] = fn
  }
  return result
}

export function getAction(actionName: string): ActionFn {
  const fn = registry[actionName]
  if (!fn) {
    const available = Object.keys(registry).sort().join('\n  ')
    throw new Error(
      `Action "${actionName}" not found in registry.\nAvailable actions:\n  ${available}`
    )
  }
  return fn
}

export { registry }
