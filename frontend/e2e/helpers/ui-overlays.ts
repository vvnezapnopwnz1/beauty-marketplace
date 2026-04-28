import type { Page } from '@playwright/test'

const DEFAULT_CITY_NAME_PATTERN =
  /Москва|Санкт-Петербург|Казань|Екатеринбург|Новосибирск|Краснодар|Нижний Новгород|Самара/i

/**
 * Some pages open city selection modal on top of content.
 * Close it to keep assertions deterministic.
 */
export async function closeCitySelectionModalIfVisible(page: Page): Promise<void> {
  const cityDialog = page.getByRole('dialog', { name: /Выберите ваш город/i })
  const isVisible = await cityDialog.isVisible().catch(() => false)
  if (!isVisible) return

  await cityDialog
    .getByRole('button')
    .filter({ hasText: DEFAULT_CITY_NAME_PATTERN })
    .first()
    .click()
}
