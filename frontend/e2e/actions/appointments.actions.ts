import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const appointmentsActions: Record<string, ActionFn> = {
  async createFromDashboard(page: Page, ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const { serviceName, staffName, clientName, clientPhone, date, time } = data as Record<string, string>

    await page.click('[data-testid="create-appointment"], button:has-text("Новая запись")')
    await page.waitForSelector('[data-testid="appointment-form"], [role="dialog"]')

    // Select service
    if (serviceName) {
      const svcSelect = page.locator('[name="serviceId"], [data-testid="service-select"]')
      await svcSelect.click()
      await page.click(`[role="option"]:has-text("${serviceName}")`)
    }

    // Select staff
    if (staffName) {
      const staffSelect = page.locator('[name="salonMasterId"], [data-testid="staff-select"]')
      await staffSelect.click()
      await page.click(`[role="option"]:has-text("${staffName}")`)
    }

    // Fill client info
    if (clientName) await page.fill('[name="guestName"], [data-testid="client-name"]', clientName)
    if (clientPhone) await page.fill('[name="guestPhone"], [data-testid="client-phone"]', clientPhone)

    // Select slot (SlotPicker)
    if (date || time) {
      // Date picker
      if (date === 'tomorrow') {
        await page.click('[data-testid="next-date"], [aria-label="Следующий день"]')
      }
      // Time slot
      if (time) {
        await page.click(`[data-testid="slot-${time}"], button:has-text("${time}")`)
      }
    }

    await page.click('[data-testid="submit-appointment"], button:has-text("Создать")')
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })
  },

  async findByClient(page: Page, ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const clientName = data?.clientName as string
    // Search or scroll to find the appointment
    const searchInput = page.locator('[data-testid="appointment-search"], input[placeholder*="Поиск"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill(clientName)
      await page.waitForTimeout(500) // debounce
    }
    // Click on the appointment row
    await page.click(`tr:has-text("${clientName}"), [data-testid="appointment-row"]:has-text("${clientName}")`)
    await page.waitForSelector('[data-testid="appointment-drawer"], [data-testid="appointment-detail"]')
  },

  async changeStatus(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const newStatus = data?.newStatus as string
    const statusLabels: Record<string, string> = {
      confirmed: 'Подтвердить',
      completed: 'Завершить',
      cancelled_by_client: 'Отмена клиентом',
      cancelled_by_salon: 'Отмена салоном',
      no_show: 'Не пришёл',
    }
    const label = statusLabels[newStatus] || newStatus
    await page.click(`[data-testid="status-${newStatus}"], button:has-text("${label}")`)

    // Some status changes need confirmation
    const confirmBtn = page.locator('[data-testid="confirm-status"], button:has-text("Да")')
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click()
    }
  },

  async edit(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const { newDate, newTime, newStaffName } = data as Record<string, string>

    await page.click('[data-testid="edit-appointment"], button:has-text("Редактировать")')
    await page.waitForSelector('[data-testid="appointment-form"], [role="dialog"]')

    if (newStaffName) {
      const staffSelect = page.locator('[name="salonMasterId"], [data-testid="staff-select"]')
      await staffSelect.click()
      await page.click(`[role="option"]:has-text("${newStaffName}")`)
    }

    if (newDate === 'day-after-tomorrow') {
      await page.click('[data-testid="next-date"]')
      await page.click('[data-testid="next-date"]')
    }

    if (newTime) {
      await page.click(`[data-testid="slot-${newTime}"], button:has-text("${newTime}")`)
    }

    await page.click('[data-testid="submit-appointment"], button:has-text("Сохранить")')
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })
  },
}
