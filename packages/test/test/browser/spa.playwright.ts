import { expect, test } from '@playwright/test'
import { testIds } from '../../../../apps/web/src/shared/lib/test-ids'
import { AppercotTestClient } from '../../src/index'

const endpoint = process.env.BOT_APPERCOT_TEST_ENDPOINT
const token = process.env.BOT_APPERCOT_TEST_TOKEN
if (!endpoint || !token)
  throw new Error('BOT_APPERCOT_TEST_ENDPOINT and BOT_APPERCOT_TEST_TOKEN are required')
const client = new AppercotTestClient({ endpoint, token })
const selector = (id: string) => `[data-test-id="${id}"]`

test.beforeEach(async () => {
  await client.ready()
  await client.flushState()
})

test('logs in, opens a fixture chat and sends through visible controls', async ({ page }) => {
  const manifest = await client.fixtures()
  const user = manifest.users[0]
  const chat = manifest.chats[0]
  if (!user || !chat) throw new Error('Playwright config requires one user and one chat')

  await page.goto('/login')
  await page.locator(selector(testIds.auth.login.username)).fill(user.username)
  await page.locator(selector(testIds.auth.login.password)).fill(user.password)
  await page.locator(selector(testIds.auth.login.submit)).click()
  const item = page.locator(selector(testIds.chats.item(chat.id)))
  const baseline = chat.messages.at(-1)
  if (baseline?.content.text) await expect(item).toContainText(baseline.content.text)
  await item.click()
  if (baseline)
    await expect(page.locator(selector(testIds.message.item(baseline.id)))).toBeVisible()

  const messages = page.locator('[data-test-id^="message.item."]')
  const count = await messages.count()
  await page.locator(selector(testIds.chat.composer.input)).fill('Hello from Playwright')
  await page.locator(selector(testIds.chat.composer.send)).click()
  await expect(messages).toHaveCount(count + 1)

  await page.locator(selector(testIds.navigation.settings)).click()
  await expect(page.locator(selector(testIds.navigation.settings))).toHaveAttribute(
    'aria-current',
    'page',
  )
})
