import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const dashboardActions: Record<string, ActionFn> = {
  /** Navigate to a dashboard section via sidebar click */
  async navigate(page: Page, ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const section = data?.section as string
    const salonId = ctx.has('salonId') ? ctx.get('salonId') : ''

    // If not on dashboard, go there first
    if (!page.url().includes('/dashboard')) {
      if (salonId) {
        await page.goto(`/dashboard/${salonId}?section=${section}`)
      } else {
        await page.goto(`/dashboard?section=${section}`)
      }
    } else {
      // Click sidebar nav item
      const sidebarItem = page
        .locator('nav')
        .getByText(sectionLabel(section), { exact: true })
        .first()
      await sidebarItem.click()
    }

    await page.waitForLoadState('networkidle')
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
