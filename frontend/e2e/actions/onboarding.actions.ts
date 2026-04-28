import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const onboardingActions: Record<string, ActionFn> = {
  async fillProfile(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    await page.waitForURL(/\/dashboard\/[^/]+\/onboarding/, { timeout: 15000 })
    await page.getByRole('heading', { name: /Настройка салона/i }).waitFor({ state: 'visible', timeout: 15000 })

    const { salonName, categoryScopes } = data as Record<string, unknown>

    if (salonName) {
      await page.getByLabel('Название салона').fill(salonName as string)
    }

    if (categoryScopes) {
      const scopeSelect = page.getByRole('combobox', { name: /Категории салона/i }).or(page.locator('[role="combobox"]').first())
      const canSelectScopes = (await scopeSelect.count()) > 0
      if (canSelectScopes) {
        await scopeSelect.first().click()
        for (const scope of categoryScopes as string[]) {
          const optionPattern =
            scope === 'hair'
              ? /(hair|волос|парик)/i
              : scope === 'nails'
                ? /(nails|ногт|маник)/i
                : new RegExp(scope, 'i')
          const option = page.getByRole('option', { name: optionPattern }).first()
          if (await option.count()) {
            await option.click()
          }
        }
        await page.keyboard.press('Escape')
      }
    }
  },

  async complete(page: Page, ctx: TestContext) {
    const nextButton = page.getByRole('button', { name: /^Далее$/i })
    const nextVisibleCount = await nextButton.count()
    if (nextVisibleCount > 0) {
      await nextButton.first().click()
      await nextButton.first().click()
    }

    await page.getByRole('button', { name: /Перейти в кабинет|Пропустить все/i }).first().click()
    await page.waitForURL(/\/dashboard\//)
    const match = page.url().match(/\/dashboard\/([^/?]+)/)
    if (match) ctx.set('salonId', match[1])
  },
}
