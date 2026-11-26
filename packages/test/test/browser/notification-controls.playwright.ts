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

const muteFor = async (page: Page, preset: string) => {
  await page.locator(selector(testIds.chat.notifications.trigger)).click()
  await page.locator(selector(testIds.chat.notifications.mute(preset))).click()
  await expect(page.locator(selector(testIds.chat.notifications.trigger))).toHaveAttribute(
    'aria-label',
    /Отключены до/,
  )
}

test.beforeEach(async () => {
  await client.ready()
  await client.flushState()
})

test('persists mute, keeps unread filtering and expires without reload', async ({ page }) => {
  const { user, chat } = await fixture()
  await login(page, user.username, user.password, chat.id)
  await muteFor(page, '1h')
  await page.reload()
  await expect(page.locator(selector(testIds.chat.notifications.trigger))).toHaveAttribute(
    'aria-label',
    /Отключены до/,
  )

  await page.goto('/')
  await client.sendMessage({ chatId: chat.id, sender: 'bot', content: { text: 'Muted unread' } })
  const item = page.locator(selector(testIds.chats.item(chat.id)))
  await expect(item).toContainText('Muted unread')
  await expect(item).toContainText('1')
  await page.locator(selector(testIds.chats.unreadFilter)).click()
  await expect(item).toBeVisible()
  await item.click()
  await expect(page.locator(selector(testIds.chat.composer.input))).toBeVisible()
  await page.goto('/')
  await expect(page.getByText('Нет непрочитанных чатов', { exact: true })).toBeVisible()
  await page.locator(selector(testIds.chats.unreadFilter)).click()

  await page.goto(`/c/${chat.id}`)
  await page.evaluate(async (chatId) => {
    await fetch('/graphql', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'mutation ExpireSoon($chatId: ID!, $until: Float!) { setChatMute(chatId: $chatId, mutedUntil: $until) { notificationsMutedUntil } }',
        variables: { chatId, until: Date.now() + 1200 },
      }),
    })
  }, chat.id)
  const trigger = page.locator(selector(testIds.chat.notifications.trigger))
  await expect(trigger).toHaveAttribute('aria-label', /Отключены до/)
  await expect(trigger).toHaveAttribute('aria-label', /Уведомления: все/, { timeout: 4000 })
})

test('synchronizes profile and header controls and returns keyboard focus on mobile', async ({
  page,
  context,
}) => {
  const { user, chat } = await fixture()
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, user.username, user.password, chat.id)
  await muteFor(page, '8h')
  await page.goto(`/c/${chat.id}/profile`)
  const profileTrigger = page.locator(selector(testIds.chat.notifications.profileTrigger))
  await expect(profileTrigger).toHaveAttribute('aria-label', /Отключены до/)
  const second = await context.newPage()
  await second.setViewportSize({ width: 390, height: 844 })
  await second.goto(`/c/${chat.id}`)
  const headerTrigger = second.locator(selector(testIds.chat.notifications.trigger))
  await expect(headerTrigger).toHaveAttribute('aria-label', /Отключены до/)

  await profileTrigger.focus()
  await page.keyboard.press('Enter')
  await page.locator(selector(testIds.chat.notifications.resume)).click()
  await expect(headerTrigger).toHaveAttribute('aria-label', /Уведомления: все/)
  await expect(profileTrigger).toHaveAttribute('aria-label', /Уведомления: все/)
  await profileTrigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator(selector(testIds.chat.notifications.mode('all')))).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(profileTrigger).toBeFocused()
})
