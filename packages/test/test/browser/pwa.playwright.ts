import { expect, test } from '@playwright/test'
import { testIds } from '../../../../apps/web/src/shared/lib/test-ids'
import { client, selector } from './helpers'

test.use({ serviceWorkers: 'allow' })

test.beforeEach(async () => {
  await client.ready()
  await client.flushState()
})

test('serves the application shell offline through the service worker', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Chromium service-worker verification')
  await page.goto('/login')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect(page.locator(selector(testIds.auth.login.username))).toBeVisible()
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator(selector(testIds.auth.login.username))).toBeVisible()
  await expect(page.locator(selector(testIds.auth.login.submit))).toBeVisible()
  await context.setOffline(false)
})
