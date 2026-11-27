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

const unread = async (page: Page) =>
  page.evaluate(async () => {
    const result = await fetch('/graphql', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'query { session { chats { unread } } }' }),
    }).then((response) => response.json())
    return result.data.session.chats[0]?.unread as number
  })

const send = (chatId: string, text: string) =>
  client.sendMessage({ chatId, sender: 'bot', content: { text } })

test.beforeEach(async () => {
  await client.ready()
  await client.flushState()
})

test('finds old RU and EN messages in a large history and preserves context and unread', async ({
  page,
  isMobile,
}) => {
  test.setTimeout(90_000)
  const { user, chat } = await fixture()
  await Promise.all(
    Array.from({ length: 60 }, (_, index) => send(chat.id, `Filler early ${index}`)),
  )
  const russian = await send(chat.id, 'Древний русский результат')
  const english = await send(chat.id, 'Ancient English result')
  await Promise.all(
    Array.from({ length: 60 }, (_, index) => send(chat.id, `Filler later ${index}`)),
  )
  await login(page, user.username, user.password, chat.id)
  await expect.poll(() => unread(page)).toBe(0)

  await page.locator(selector(testIds.chat.search.trigger)).click()
  await page.locator(selector(testIds.chat.search.input)).fill('Filler')
  const results = page.locator('[data-test-id^="chat.search.result."]')
  await expect(results).toHaveCount(30)
  await page.locator(selector(testIds.chat.search.loadMore)).click()
  await expect(results).toHaveCount(60)
  await page.locator(selector(testIds.chat.search.input)).fill('Древний')
  await page.locator(selector(testIds.chat.search.result(russian.id))).click()
  const target = page.locator(selector(testIds.message.item(russian.id)))
  await expect(target).toBeVisible()
  await expect(target).toHaveAttribute('data-search-target', 'true')
  if (!isMobile) await expect(target).toBeFocused()
  await expect(page.locator(selector(testIds.chat.history.earlier))).toBeVisible()
  await expect(page.locator(selector(testIds.chat.history.later))).toBeVisible()
  await page.locator(selector(testIds.chat.history.earlier)).click()
  await expect(target).toBeVisible()
  await page.locator(selector(testIds.chat.history.later)).click()
  await expect(target).toBeVisible()

  const incoming = await send(chat.id, 'Incoming while reading context')
  await expect.poll(() => unread(page)).toBe(1)
  await expect(page.locator(selector(testIds.message.item(incoming.id)))).toHaveCount(0)
  await page.locator(selector(testIds.chat.history.latest)).click()
  await expect(page.locator(selector(testIds.message.item(incoming.id)))).toBeVisible()
  await expect.poll(() => unread(page)).toBe(0)

  await page.locator(selector(testIds.chat.search.trigger)).click()
  await page.locator(selector(testIds.chat.search.input)).fill('Ancient')
  await expect(page.locator(selector(testIds.chat.search.result(english.id)))).toBeVisible()
  await page.locator(selector(testIds.chat.search.close)).click()
  if (!isMobile) await expect(page.locator(selector(testIds.chat.search.trigger))).toBeFocused()
})

test('opens over the bot header with a layout-independent dedicated shortcut', async ({
  page,
  isMobile,
}) => {
  const { user, chat } = await fixture()
  await login(page, user.username, user.password, chat.id)
  const trigger = page.locator(selector(testIds.chat.search.trigger))
  const triggerBox = await trigger.boundingBox()
  const apple = await page.evaluate(() => /Mac|iPhone|iPad/.test(navigator.platform))
  await page.locator(selector(testIds.chat.composer.input)).dispatchEvent('keydown', {
    key: 'а',
    code: 'KeyF',
    ctrlKey: !apple,
    metaKey: apple,
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  })
  const input = page.locator(selector(testIds.chat.search.input))
  await expect(input).toBeFocused()
  await expect(input).toHaveValue('')
  await expect(page.locator(selector(testIds.chat.search.results))).toHaveCount(0)
  await expect(page.locator('#chat-title')).toHaveCount(0)
  await expect(trigger).toHaveCount(0)
  const close = page.locator(selector(testIds.chat.search.close))
  const closeBox = await close.boundingBox()
  expect(closeBox?.width).toBeCloseTo(triggerBox?.width ?? 0, 1)
  expect(closeBox?.height).toBeCloseTo(triggerBox?.height ?? 0, 1)
  expect(closeBox?.x).toBeCloseTo(triggerBox?.x ?? 0, 1)
  await page.locator(selector(testIds.chat.composer.input)).dispatchEvent('keydown', {
    key: 'а',
    code: 'KeyF',
    ctrlKey: !apple,
    metaKey: apple,
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  })
  await expect(page.locator('#chat-title')).toBeVisible()
  if (!isMobile) await expect(trigger).toBeFocused()
  await trigger.click()
  await expect(input).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('#chat-title')).toBeVisible()
  if (!isMobile) await expect(trigger).toBeFocused()
  await trigger.click()
  await expect(input).toBeFocused()
  await close.click()
  await expect(page.locator('#chat-title')).toBeVisible()
  if (!isMobile) await expect(trigger).toBeFocused()
})

test('supports mobile search, refresh and failure retry without losing focus', async ({
  page,
  isMobile,
  browserName,
}) => {
  const { user, chat } = await fixture()
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, user.username, user.password, chat.id)
  await page.locator(selector(testIds.chat.search.trigger)).click()
  const input = page.locator(selector(testIds.chat.search.input))
  await expect(input).toBeFocused()
  await page.route('**/graphql', async (route) => {
    if (!route.request().postData()?.includes('SearchMessages')) return route.continue()
    if (browserName === 'webkit')
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
    return route.abort()
  })
  await input.fill('Ready')
  await expect(page.locator(selector(testIds.chat.search.retry))).toBeVisible()
  await page.unroute('**/graphql')
  await page.locator(selector(testIds.chat.search.retry)).click()
  const ready = chat.messages.find((message) => message.content.text === 'Ready')
  if (!ready) throw new Error('Ready fixture is missing')
  await expect(page.locator(selector(testIds.chat.search.result(ready.id)))).toBeVisible()
  const another = await send(chat.id, 'Ready again')
  await page.locator(selector(testIds.chat.search.refresh)).click()
  await expect(page.locator(selector(testIds.chat.search.result(another.id)))).toBeVisible()
  await page.locator(selector(testIds.chat.search.close)).click()
  if (!isMobile) await expect(page.locator(selector(testIds.chat.search.trigger))).toBeFocused()
})
