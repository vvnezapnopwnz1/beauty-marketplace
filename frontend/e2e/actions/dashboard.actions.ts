import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

function resolveSalonId(ctx: TestContext, page: Page): string {
  if (ctx.has('salonId')) {
    const v = ctx.get<string>('salonId')
    const s = String(v ?? '').trim()
    if (s) return s
  }
  const m = page.url().match(/\/dashboard\/([^/?]+)/)
  if (!m?.[1]) return ''
  const id = m[1].trim()
  if (!id || id === 'onboarding') return ''
  ctx.set('salonId', id)
  return id
}

export const dashboardActions: Record<string, ActionFn> = {
  /** Navigate to a dashboard section (URL when salonId known — works with mobile Drawer sidebar). */
  async navigate(page: Page, ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const section = data?.section as string
    const salonId = resolveSalonId(ctx, page)

    // Prefer URL: on narrow viewports the sidebar lives in a closed Drawer, so there is no visible <nav> to click.
    if (salonId) {
      await page.goto(`/dashboard/${salonId}?section=${encodeURIComponent(section)}`)
    } else if (!page.url().includes('/dashboard')) {
      await page.goto(`/dashboard?section=${encodeURIComponent(section)}`)
    } else {
      const sidebarItem = page
        .locator('nav')
        .getByText(sectionLabel(section), { exact: true })
        .first()
      await sidebarItem.click()
    }

    await page.waitForLoadState('load')
    ctx.set('currentSection', section)
  },
}

function sectionLabel(section: string): string {
  const labels: Record<string, string> = {
    overview: 'Обзор',
    calendar: 'Календарь',
    appointments: 'Записи',
    clients: 'Клиенты',
    services: 'Услуги',
    staff: 'Мастера',
    schedule: 'Расписание',
    personnel: 'Персонал',
    profile: 'Профиль',
  }
  return labels[section] || section
}
