import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const staffActions: Record<string, ActionFn> = {
  async create(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const { displayName, phone, specialization, color } = data as Record<string, string>
    const [firstName, ...rest] = displayName.split(' ')
    const lastName = rest.join(' ')

    await page.getByRole('button', { name: /добавить мастера/i }).click()
    await page.getByRole('dialog').waitFor({ state: 'visible' })

    await page.getByLabel('Имя').fill(firstName)
    if (lastName) await page.getByLabel('Фамилия').fill(lastName)
    if (phone) await page.getByLabel('Телефон').fill(phone)
    if (specialization) {
      const specInput = page.getByLabel('Специализация')
      if (await specInput.isVisible()) await specInput.fill(specialization)
    }
    if (color) {
      const colorInput = page.locator(`[data-color="${color}"]`)
      if (await colorInput.isVisible()) await colorInput.click()
    }

    await page.getByRole('button', { name: 'Сохранить' }).click()
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })
  },

  async assignServices(page: Page, ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const staffName = data?.staffName as string
    const services = data?.services as string[]

    // Click on staff row to open detail
    await page.click(`text="${staffName}"`)
    await page.waitForLoadState('networkidle')

    // Open service assignment
    await page.click('[data-testid="assign-services"], button:has-text("Настроить услуги")')
    await page.waitForSelector('[data-testid="service-assignment-form"], [role="dialog"]')

    for (const svc of services) {
      await page.click(`[data-testid="service-checkbox-${svc}"], label:has-text("${svc}")`)
    }

    await page.click('[data-testid="save-services"], button:has-text("Сохранить")')
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })
  },

  async openDetail(page: Page, ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const name = data?.name as string
    await page.click(`text="${name}"`)
    await page.waitForLoadState('networkidle')
  },

  async editSchedule(page: Page, ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    // Click schedule edit button on staff detail
    await page.click('[data-testid="edit-schedule"], button:has-text("Расписание")')
    await page.waitForSelector('[data-testid="schedule-drawer"], [role="dialog"]')

    // Fill in schedule data for each day
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    for (const day of days) {
      const dayData = (data as Record<string, unknown>)?.[day]
      if (!dayData) continue

      if (dayData === 'dayOff') {
        const dayOffToggle = page.locator(`[data-testid="day-off-${day}"]`)
        if (await dayOffToggle.isVisible()) await dayOffToggle.click()
        continue
      }

      const d = dayData as Record<string, string>
      if (d.opens) await page.fill(`[data-testid="${day}-opens"]`, d.opens)
      if (d.closes) await page.fill(`[data-testid="${day}-closes"]`, d.closes)
      if (d.breakStart) await page.fill(`[data-testid="${day}-break-start"]`, d.breakStart)
      if (d.breakEnd) await page.fill(`[data-testid="${day}-break-end"]`, d.breakEnd)
    }

    await page.click('[data-testid="save-schedule"], button:has-text("Сохранить")')
  },
}
