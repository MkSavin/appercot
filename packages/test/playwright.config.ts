import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './test/browser',
  testMatch: '**/*.playwright.ts',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.BOT_APPERCOT_TEST_ENDPOINT,
    headless: true,
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'desktop-webkit', use: { ...devices['Desktop WebKit'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
})
