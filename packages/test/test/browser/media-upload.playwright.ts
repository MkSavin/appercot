import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, type Page, test } from '@playwright/test'
import { testIds } from '../../../../apps/web/src/shared/lib/test-ids'
import { AppercotTestClient } from '../../src/index'

const endpoint = process.env.BOT_APPERCOT_TEST_ENDPOINT
const token = process.env.BOT_APPERCOT_TEST_TOKEN
if (!endpoint || !token)
  throw new Error('BOT_APPERCOT_TEST_ENDPOINT and BOT_APPERCOT_TEST_TOKEN are required')
const client = new AppercotTestClient({ endpoint, token })
const selector = (id: string) => `[data-test-id="${id}"]`
const fixtureDirectory = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const fixturePath = (name: string) => resolve(fixtureDirectory, name)

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

const attachmentRows = (page: Page) => page.locator('[data-test-id^="chat.attachment.item."]')
const messageWithText = (page: Page, text: string) =>
  page.locator('[data-test-id^="message.item."]').filter({ hasText: text })

const serverMessages = async (page: Page, chatId: string) =>
  page.evaluate(async (chatId) => {
    const result = await fetch('/graphql', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'query UploadedMessages($chatId: ID!) { messages(chatId: $chatId, limit: 50) { id content } }',
        variables: { chatId },
      }),
    }).then((response) => response.json())
    return result.data.messages as Array<{
      id: string
      content: { text?: string; media?: Array<{ fileId: string }> }
    }>
  }, chatId)

const failMessageResponse = (page: Page) =>
  page.route('**/graphql', async (route) => {
    if (!route.request().postData()?.includes('SendMessage')) return route.continue()
    await route.fetch()
    await route.abort()
  })

test.beforeEach(async () => {
  await client.ready()
  await client.flushState()
})

test('sends multiple mobile picker files with caption through the durable outbox', async ({
  page,
}) => {
  test.setTimeout(30_000)
  const { user, chat } = await fixture()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    const state = { created: 0, revoked: 0 }
    Object.defineProperty(window, '__uploadUrls', { value: state })
    const create = URL.createObjectURL.bind(URL)
    const revoke = URL.revokeObjectURL.bind(URL)
    URL.createObjectURL = (blob) => {
      state.created += 1
      return create(blob)
    }
    URL.revokeObjectURL = (url) => {
      state.revoked += 1
      revoke(url)
    }
  })
  await login(page, user.username, user.password, chat.id)
  await page
    .locator(selector(testIds.chat.composer.fileInput))
    .setInputFiles([fixturePath('one.png'), fixturePath('two.png'), fixturePath('notes.txt')])
  await expect(attachmentRows(page)).toHaveCount(3)
  await expect(
    page.locator(selector(testIds.chat.composer.attachments)).getByRole('img'),
  ).toHaveCount(2)

  await page.route('**/api/files?*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400))
    await route.continue()
  })
  await failMessageResponse(page)
  await page.locator(selector(testIds.chat.composer.input)).fill('Three files caption')
  await page.locator(selector(testIds.chat.composer.send)).click()
  await expect(page.locator('[data-test-id^="chat.attachment.progress."]')).toHaveCount(2)
  await expect(page.locator(selector(testIds.chat.composer.waiting))).toBeVisible()

  await expect
    .poll(async () => {
      const messages = await serverMessages(page, chat.id)
      return messages.filter((message) => message.content.text === 'Three files caption').length
    })
    .toBe(1)
  await expect(attachmentRows(page)).toHaveCount(0)
  await expect(page.locator(selector(testIds.chat.composer.input))).toHaveValue('')
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __uploadUrls: { created: number; revoked: number } })
            .__uploadUrls,
      ),
    )
    .toEqual({ created: 2, revoked: 2 })

  await page.reload()
  await page.unroute('**/graphql')
  await expect(messageWithText(page, 'Three files caption')).toHaveCount(1)
  const messages = await serverMessages(page, chat.id)
  const sent = messages.find((message) => message.content.text === 'Three files caption')
  expect(sent?.content.media).toHaveLength(3)
  expect(messages.filter((message) => message.content.text === 'Three files caption')).toHaveLength(
    1,
  )
  for (const media of sent?.content.media ?? []) {
    await expect(page.locator(selector(testIds.message.attachment(media.fileId)))).toBeVisible()
  }
})

test('keeps a slow upload across navigation and supports keyboard cancel and retry', async ({
  page,
}) => {
  const { user, chat } = await fixture()
  await login(page, user.username, user.password, chat.id)
  await page
    .locator(selector(testIds.chat.composer.fileInput))
    .setInputFiles(fixturePath('one.png'))
  await page.route('**/api/files?*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await route.continue()
  })
  await page.locator(selector(testIds.chat.composer.send)).click()
  await expect(page.locator('[data-test-id^="chat.attachment.progress."]')).toHaveCount(1)

  await page.locator(selector(testIds.navigation.chats)).click()
  await page.locator(selector(testIds.chats.item(chat.id))).click()
  await expect(attachmentRows(page)).toHaveCount(1)
  const cancel = page.locator('[data-test-id^="chat.attachment.cancel."]')
  await cancel.focus()
  await cancel.press('Enter')
  await expect(page.locator('[data-test-id^="chat.attachment.retry."]')).toHaveCount(1)
  expect(
    (await serverMessages(page, chat.id)).filter((message) => message.content.media),
  ).toHaveLength(0)

  await page.unroute('**/api/files?*')
  const retry = page.locator('[data-test-id^="chat.attachment.retry."]')
  await retry.focus()
  await retry.press('Enter')
  await expect(page.locator('[data-test-id^="chat.attachment.remove."]')).toHaveCount(1)
  await page.locator(selector(testIds.chat.composer.send)).click()
  await expect
    .poll(async () => {
      const messages = await serverMessages(page, chat.id)
      return messages.filter((message) => message.content.media?.length === 1).length
    })
    .toBe(1)
  await expect(attachmentRows(page)).toHaveCount(0)
})

test('uses the same queue for paste and drop without breaking text paste', async ({
  page,
  context,
}) => {
  const { user, chat } = await fixture()
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await login(page, user.username, user.password, chat.id)
  const input = selector(testIds.chat.composer.input)
  await page.evaluate(() => navigator.clipboard.writeText('Plain pasted caption'))
  await page.locator(input).focus()
  await page.locator(input).press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V')
  await expect(page.locator(input)).toHaveValue('Plain pasted caption')
  await expect(attachmentRows(page)).toHaveCount(0)

  const png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
  await page.evaluate(
    ({ inputSelector, png }) => {
      const transfer = new DataTransfer()
      transfer.items.add(
        new File(
          [Uint8Array.from(atob(png), (character) => character.charCodeAt(0))],
          'pasted.png',
          {
            type: 'image/png',
          },
        ),
      )
      document
        .querySelector(inputSelector)
        ?.dispatchEvent(
          new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }),
        )
    },
    { inputSelector: input, png },
  )
  await expect(attachmentRows(page)).toHaveCount(1)

  const target = selector(testIds.chat.composer.dropTarget)
  await page.evaluate((targetSelector) => {
    const transfer = new DataTransfer()
    transfer.items.add(new File(['Dropped text'], 'dropped.txt', { type: 'text/plain' }))
    const target = document.querySelector(targetSelector)
    target?.dispatchEvent(
      new DragEvent('dragenter', { dataTransfer: transfer, bubbles: true, cancelable: true }),
    )
  }, target)
  await expect(page.locator(selector(testIds.chat.composer.dropOverlay))).toBeVisible()
  await page.evaluate((targetSelector) => {
    const transfer = new DataTransfer()
    transfer.items.add(new File(['Dropped text'], 'dropped.txt', { type: 'text/plain' }))
    document
      .querySelector(targetSelector)
      ?.dispatchEvent(
        new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }),
      )
  }, target)
  await expect(attachmentRows(page)).toHaveCount(2)
  await expect(page.locator(selector(testIds.chat.composer.dropOverlay))).toHaveCount(0)

  await page.locator(selector(testIds.chat.composer.send)).click()
  await expect
    .poll(async () => {
      const messages = await serverMessages(page, chat.id)
      return messages.filter(
        (message) =>
          message.content.text === 'Plain pasted caption' && message.content.media?.length === 2,
      ).length
    })
    .toBe(1)
})
