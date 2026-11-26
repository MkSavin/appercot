import { expect, type Page, test } from '@playwright/test'
import { testIds } from '../../../../apps/web/src/shared/lib/test-ids'
import { AppercotTestClient } from '../../src/index'

const endpoint = process.env.BOT_APPERCOT_TEST_ENDPOINT
const token = process.env.BOT_APPERCOT_TEST_TOKEN
if (!endpoint || !token)
  throw new Error('BOT_APPERCOT_TEST_ENDPOINT and BOT_APPERCOT_TEST_TOKEN are required')
const client = new AppercotTestClient({ endpoint, token })
const selector = (id: string) => `[data-test-id="${id}"]`

const fixture = async () => {
  const manifest = await client.fixtures()
  const user = manifest.users[0]
  const chat = manifest.chats[0]
  if (!user || !chat) throw new Error('Playwright config requires one user and one chat')
  return { user, chat }
}

const login = async (page: Page, username: string, password: string, chatId: string) => {
  await page.goto('/login')
  await page.locator(selector(testIds.auth.login.username)).fill(username)
  await page.locator(selector(testIds.auth.login.password)).fill(password)
  await page.locator(selector(testIds.auth.login.submit)).click()
  await page.locator(selector(testIds.chats.item(chatId))).click()
  await expect(page.locator(selector(testIds.chat.composer.input))).toBeVisible()
}

const messageWithText = (page: Page, text: string) =>
  page.locator('[data-test-id^="message.item."]').filter({ hasText: text })

const serverTextCount = async (page: Page, chatId: string, text: string) =>
  page.evaluate(
    async ({ chatId, text }) => {
      const result = await fetch('/graphql', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query:
            'query OutboxMessages($chatId: ID!) { messages(chatId: $chatId, limit: 50) { content } }',
          variables: { chatId },
        }),
      }).then((response) => response.json())
      return result.data.messages.filter(
        (message: { content: { text?: string } }) => message.content.text === text,
      ).length
    },
    { chatId, text },
  )

const failSend = (page: Page, afterCommit = false) =>
  page.route('**/graphql', async (route) => {
    if (!route.request().postData()?.includes('SendMessage')) return route.continue()
    if (afterCommit) await route.fetch()
    await route.abort()
  })

test.beforeEach(async () => {
  await client.ready()
  await client.flushState()
})

test('restores a draft and retries an offline message after reload exactly once', async ({
  page,
}) => {
  const { user, chat } = await fixture()
  await login(page, user.username, user.password, chat.id)

  await page.locator(selector(testIds.chat.composer.input)).fill('Draft survives reload')
  await page.waitForTimeout(350)
  await page.reload()
  await expect(page.locator(selector(testIds.chat.composer.input))).toHaveValue(
    'Draft survives reload',
  )
  await expect(messageWithText(page, 'Draft survives reload')).toHaveCount(0)

  await failSend(page)
  await page.locator(selector(testIds.chat.composer.input)).fill('Offline survives reload')
  await page.locator(selector(testIds.chat.composer.send)).click()
  await expect(messageWithText(page, 'Offline survives reload')).toHaveCount(1)
  await expect(page.locator(selector(testIds.chat.composer.input))).toHaveValue('')
  await page.waitForTimeout(100)
  await page.reload()
  await expect(messageWithText(page, 'Offline survives reload')).toHaveCount(1)
  await page.unroute('**/graphql')

  await expect.poll(() => serverTextCount(page, chat.id, 'Offline survives reload')).toBe(1)
  await expect(messageWithText(page, 'Offline survives reload')).toHaveCount(1)
  await expect(page.locator('[data-test-id^="message.retry."]')).toHaveCount(0)
})

test('uses the same client id when the response is lost after the server commit', async ({
  page,
}) => {
  const { user, chat } = await fixture()
  await login(page, user.username, user.password, chat.id)
  await failSend(page, true)
  await page.locator(selector(testIds.chat.composer.input)).fill('Committed without response')
  await page.locator(selector(testIds.chat.composer.send)).click()
  await expect.poll(() => serverTextCount(page, chat.id, 'Committed without response')).toBe(1)
  await expect(page.locator('[data-test-id^="message.retry."]')).toHaveCount(1)
  await expect(messageWithText(page, 'Committed without response')).toHaveCount(2)

  await page.reload()
  await page.unroute('**/graphql')
  await expect.poll(() => serverTextCount(page, chat.id, 'Committed without response')).toBe(1)
  await expect(messageWithText(page, 'Committed without response')).toHaveCount(1)
  await expect(page.locator('[data-test-id^="message.retry."]')).toHaveCount(0)
})

test('serializes sends from two tabs without duplicates', async ({ page, context }) => {
  const { user, chat } = await fixture()
  await login(page, user.username, user.password, chat.id)
  const second = await context.newPage()
  await second.goto(`/c/${chat.id}`)
  await expect(second.locator(selector(testIds.chat.composer.input))).toBeVisible()

  await page.locator(selector(testIds.chat.composer.input)).fill('First tab message')
  await second.locator(selector(testIds.chat.composer.input)).fill('Second tab message')
  await Promise.all([
    page.locator(selector(testIds.chat.composer.send)).click(),
    second.locator(selector(testIds.chat.composer.send)).click(),
  ])

  await expect.poll(() => serverTextCount(page, chat.id, 'First tab message')).toBe(1)
  await expect.poll(() => serverTextCount(page, chat.id, 'Second tab message')).toBe(1)
  await expect(messageWithText(page, 'First tab message')).toHaveCount(1)
  await expect(messageWithText(second, 'Second tab message')).toHaveCount(1)
  await expect(page.locator('[data-test-id^="message.retry."]')).toHaveCount(0)
  await expect(second.locator('[data-test-id^="message.retry."]')).toHaveCount(0)
})

test('falls back to in-memory sending when IndexedDB is denied', async ({ page }) => {
  const { user, chat } = await fixture()
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: {
        open: () => {
          throw new DOMException('Storage denied', 'NotAllowedError')
        },
      },
    })
  })
  await login(page, user.username, user.password, chat.id)
  await page.locator(selector(testIds.chat.composer.input)).fill('Memory fallback')
  await page.locator(selector(testIds.chat.composer.send)).click()

  await expect.poll(() => serverTextCount(page, chat.id, 'Memory fallback')).toBe(1)
  await expect(messageWithText(page, 'Memory fallback')).toHaveCount(1)
  await page.locator(selector(testIds.chat.composer.input)).fill('Not durable')
  await page.waitForTimeout(350)
  await page.reload()
  await expect(page.locator(selector(testIds.chat.composer.input))).toHaveValue('')
})
