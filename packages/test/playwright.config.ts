import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './test/browser',
  testMatch: '**/*.playwright.ts',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.BOT_APPERCOT_TEST_ENDPOINT,
    headless: true,
    browserName: 'chromium',
  },
})
