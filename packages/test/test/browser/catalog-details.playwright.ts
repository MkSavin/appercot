import { expect, type Page, test } from '@playwright/test'
import { testIds } from '../../../../apps/web/src/shared/lib/test-ids'
import { AppercotTestClient } from '../../src/index'

const endpoint = process.env.BOT_APPERCOT_TEST_ENDPOINT
const token = process.env.BOT_APPERCOT_TEST_TOKEN
if (!endpoint || !token)
  throw new Error('BOT_APPERCOT_TEST_ENDPOINT and BOT_APPERCOT_TEST_TOKEN are required')
const client = new AppercotTestClient({ endpoint, token })
const selector = (id: string) => `[data-test-id="${id}"]`

const login = async (page: Page, username: string, password: string) => {
  await page.goto('/login')
  await page.locator(selector(testIds.auth.login.username)).fill(username)
  await page.locator(selector(testIds.auth.login.password)).fill(password)
  await page.locator(selector(testIds.auth.login.submit)).click()
  await expect(page.locator(selector(testIds.navigation.catalog))).toBeVisible()
}

const botChatCount = async (page: Page, botId: string) =>
  page.evaluate(async (id) => {
    const result = await fetch('/graphql', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'query { session { chats { bot { id } } } }' }),
    }).then((response) => response.json())
    return result.data.session.chats.filter((chat: { bot: { id: string } }) => chat.bot.id === id)
      .length
  }, botId)

test.beforeEach(async () => {
  await client.ready()
  await client.flushState()
})

test('opens details without adding, preserves filters and starts one chat after retry', async ({
  page,
  browserName,
}) => {
  const manifest = await client.fixtures()
  const user = manifest.users[0]
  if (!user) throw new Error('Playwright config requires one user')
  const bot = await client.createBot({
    id: 'bot-catalog-details',
    username: 'catalog_details_bot',
    name: 'Catalog Details',
    ownerId: user.id,
    description: 'Full catalog description',
    tags: ['discovery', 'testing'],
  })
  await login(page, user.username, user.password)
  await page.goto('/browse')
  await page.locator(selector(testIds.catalog.search)).fill('Catalog Details')
  await page.locator(selector(testIds.catalog.tag('discovery'))).click()
  const card = page.locator(selector(testIds.catalog.bot(bot.id)))
  await expect(card).toBeVisible()
  expect(await botChatCount(page, bot.id)).toBe(0)
  await card.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(`/browse/${bot.id}?q=Catalog+Details&tag=discovery`)
  await expect(page.getByText('Full catalog description', { exact: true })).toBeVisible()
  await expect(page.getByText('/start', { exact: true })).toHaveCount(0)
  expect(await botChatCount(page, bot.id)).toBe(0)
  await page.reload()
  await expect(page.locator(selector(testIds.catalog.details.start))).toBeVisible()

  await page.locator(selector(testIds.catalog.details.back)).click()
  await expect(page.locator(selector(testIds.catalog.search))).toHaveValue('Catalog Details')
  await expect(page.locator(selector(testIds.catalog.tag('discovery')))).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.locator(selector(testIds.catalog.bot(bot.id))).click()
  await page.route('**/graphql', async (route) => {
    if (!route.request().postData()?.includes('AddBot')) return route.continue()
    if (browserName === 'webkit')
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
    return route.abort()
  })
  await page.locator(selector(testIds.catalog.details.start)).click()
  await expect(page.getByText('Не удалось начать чат. Попробуйте ещё раз.')).toBeVisible()
  expect(await botChatCount(page, bot.id)).toBe(0)
  await page.unroute('**/graphql')
  await page.locator(selector(testIds.catalog.details.start)).dblclick()
  await expect(page.locator(selector(testIds.chat.composer.input))).toBeVisible()
  expect(await botChatCount(page, bot.id)).toBe(1)
})

test('supports mobile deep links, existing chats and unavailable bots', async ({ page }) => {
  const manifest = await client.fixtures()
  const user = manifest.users[0]
  const chat = manifest.chats[0]
  if (!user || !chat) throw new Error('Playwright config requires one user and one chat')
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, user.username, user.password)
  await page.goto(`/browse/${chat.botId}`)
  const start = page.locator(selector(testIds.catalog.details.start))
  await expect(start).toHaveText('Открыть чат')
  await expect(start).toBeVisible()
  await page.reload()
  await expect(start).toHaveText('Открыть чат')
  await start.click()
  await expect(page.locator(selector(testIds.chat.composer.input))).toBeVisible()
  expect(await botChatCount(page, chat.botId)).toBe(1)

  await page.goto('/browse/missing-bot')
  await expect(page.getByText('Бот не найден или недоступен в каталоге.')).toBeVisible()
  await page.locator(selector(testIds.catalog.details.back)).click()
  await expect(page.locator(selector(testIds.catalog.search))).toBeVisible()
})

test('returns to the requested bot details after sign in', async ({ page }) => {
  const manifest = await client.fixtures()
  const user = manifest.users[0]
  const chat = manifest.chats[0]
  if (!user || !chat) throw new Error('Playwright config requires one user and one chat')
  await page.goto(`/browse/${chat.botId}`)
  await page.locator(selector(testIds.auth.login.username)).fill(user.username)
  await page.locator(selector(testIds.auth.login.password)).fill(user.password)
  await page.locator(selector(testIds.auth.login.submit)).click()
  await expect(page).toHaveURL(`/browse/${chat.botId}`)
  await expect(page.locator(selector(testIds.catalog.details.start))).toHaveText('Открыть чат')
})
