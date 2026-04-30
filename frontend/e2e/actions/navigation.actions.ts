import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const navigationActions: Record<string, ActionFn> = {
  async goto(page: Page, ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const rawPath = data?.path as string
    let resolved = rawPath
    try {
      resolved = ctx.resolve(rawPath)
    } catch {
      const fallbackSalonId = globalThis.process?.env?.E2E_SALON_ID
      if (!fallbackSalonId && rawPath.includes('{salonId}')) {
        throw new Error(
          'Missing salonId in TestContext. Ensure dev seed endpoint is enabled or set E2E_SALON_ID explicitly.'
        )
      }
      resolved = rawPath.replace(/\{salonId\}/g, fallbackSalonId || '')
    }
    await page.goto(resolved)
    await page.waitForLoadState('load')
  },
}
