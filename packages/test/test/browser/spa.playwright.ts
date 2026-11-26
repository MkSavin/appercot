import { expect, test } from '@playwright/test'
import { testIds } from '../../../../apps/web/src/shared/lib/test-ids'
import { browserFixture, client, login, selector } from './helpers'

test.beforeEach(async () => {
  await client.ready()
  await client.flushState()
})

test('logs in, opens a fixture chat and sends through visible controls', async ({
  page,
  isMobile,
}) => {
  const { user, chat } = await browserFixture()
  await login(page, user.username, user.password)
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

  if (isMobile) await page.locator(selector(testIds.chat.back)).click()
  await page.locator(selector(testIds.navigation.settings)).click()
  await expect(page.locator(selector(testIds.navigation.settings))).toHaveAttribute(
    'aria-current',
    'page',
  )
})
