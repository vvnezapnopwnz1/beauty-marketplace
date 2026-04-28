import type { Page } from '@playwright/test'
import type { ActionFn } from './index'

export const salonPageActions: Record<string, ActionFn> = {
  async openBookingWizard(page: Page) {
    const cta = page.getByRole('button', { name: /записаться|записаться онлайн/i }).first()
    await cta.click()
    await page.getByRole('dialog').waitFor({ state: 'visible' })
  },
}
