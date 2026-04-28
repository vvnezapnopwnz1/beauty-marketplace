import { defineConfig, devices } from '@playwright/test'

const env = globalThis.process?.env ?? {}

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // flows are sequential by design
  forbidOnly: !!env.CI,
  retries: env.CI ? 2 : 0,
  workers: env.CI ? 1 : 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  timeout: 60_000,

  use: {
    baseURL: env.E2E_BASE_URL || 'http://localhost:5173',
    headless: env.E2E_HEADED === '1' ? false : true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run backend + frontend before tests */
  webServer: [
    {
      command: 'cd .. && DEV_OTP_BYPASS_ANY=1 DEV_ENDPOINTS=1 make backend-local',
      port: 8080,
      timeout: 120_000,
      reuseExistingServer: !env.CI,
    },
    {
      command: 'npm run dev',
      port: 5173,
      timeout: 15_000,
      reuseExistingServer: !env.CI,
    },
  ],
})
