import { expect, test } from '@playwright/test'
import { testIds } from '../../../../apps/web/src/shared/lib/test-ids'
import { AppercotTestClient } from '../../src/index'

const endpoint = process.env.BOT_APPERCOT_TEST_ENDPOINT
const token = process.env.BOT_APPERCOT_TEST_TOKEN
const adminPassword = process.env.ADMIN_PASSWORD
if (!endpoint || !token || !adminPassword)
  throw new Error(
    'BOT_APPERCOT_TEST_ENDPOINT, BOT_APPERCOT_TEST_TOKEN and ADMIN_PASSWORD are required',
  )
const client = new AppercotTestClient({ endpoint, token })
const selector = (id: string) => `[data-test-id="${id}"]`

test.beforeEach(async () => {
  await client.ready()
  await client.flushState()
})

test('manages connection, token and lifecycle from bot settings', async ({ page }) => {
  await page.goto('/login')
  await page.locator(selector(testIds.auth.login.username)).fill('admin')
  await page.locator(selector(testIds.auth.login.password)).fill(adminPassword)
  await page.locator(selector(testIds.auth.login.submit)).click()
  await expect(page.locator(selector(testIds.navigation.settings))).toBeVisible()
  const bot = await page.evaluate(async () => {
    const result = await fetch('/graphql', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'mutation CreateSettingsBot { createBot(username: "settings_bot", name: "Settings Bot", description: "") { bot { id username } } }',
      }),
    }).then((response) => response.json())
    return result.data.createBot.bot as { id: string; username: string }
  })
  await page.goto(`/settings/bots/${bot.id}`)

  const avatarInput = page.locator(selector(testIds.settings.bot.avatarInput))
  const avatarRemove = page.locator(selector(testIds.settings.bot.avatarRemove))
  await expect(page.locator(selector(testIds.settings.bot.avatarUpload))).toBeVisible()
  await avatarInput.setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    ),
  })
  await expect(avatarRemove).toBeVisible()
  await page.locator(selector(testIds.settings.bot.saveProfile)).click()
  await expect
    .poll(() =>
      page.evaluate(async (botId) => {
        const result = await fetch('/graphql', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            query: 'query Avatar($botId: ID!) { adminBot(botId: $botId) { avatar } }',
            variables: { botId },
          }),
        }).then((response) => response.json())
        return result.data.adminBot.avatar as string | null
      }, bot.id),
    )
    .toMatch(/^\/api\/bots\/.+\/avatar\?v=/)
  await avatarRemove.click()
  await expect(avatarRemove).toHaveCount(0)
  await page.locator(selector(testIds.settings.bot.saveProfile)).click()

  const main = page.getByRole('main')
  const workspaceContent = page.locator(selector(testIds.workspace.content))
  expect(await main.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
  await main.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect(workspaceContent).toHaveCSS('overflow', 'hidden')
  expect(
    await workspaceContent.evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
  ).toBe(true)
  expect(
    await page.evaluate(
      () =>
        getComputedStyle(document.documentElement).overflow === 'hidden' &&
        getComputedStyle(document.body).overflow === 'hidden' &&
        window.scrollY === 0,
    ),
  ).toBe(true)
  if (test.info().project.name !== 'mobile-webkit') {
    await main.hover()
    await page.mouse.wheel(0, 500)
    expect(await workspaceContent.evaluate((element) => element.scrollTop)).toBe(0)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  }

  const endpointInput = page.locator(selector(testIds.settings.bot.endpoint))
  await expect(endpointInput).toHaveValue(/^ws(s)?:\/\/.+\/api\/bot\/ws$/)
  const status = page.locator(selector(testIds.onboarding.status))
  await expect(status).toHaveAttribute('data-state', 'idle')
  await page.locator(selector(testIds.onboarding.checkConnection)).click()
  await expect(status).toHaveAttribute('data-state', 'failed')

  await page.locator(selector(testIds.settings.bot.resetToken)).click()
  await page.locator(selector(testIds.dialog.confirm)).click()
  const setup = page.locator(selector(testIds.onboarding.dialog))
  await expect(setup.locator(selector(testIds.bot.token))).toBeVisible()
  await setup.locator(selector(testIds.onboarding.close)).click()
  await expect(setup).toHaveCount(0)

  await page.locator(selector(testIds.settings.bot.stop)).click()
  await page.locator(selector(testIds.dialog.confirm)).click()
  await expect(page.locator(selector(testIds.settings.bot.resume))).toBeVisible()
  await page.locator(selector(testIds.settings.bot.resume)).click()
  await page.locator(selector(testIds.dialog.confirm)).click()
  await expect(page.locator(selector(testIds.settings.bot.stop))).toBeVisible()

  await page.locator(selector(testIds.settings.bot.delete)).click()
  const confirmation = page.locator(selector(testIds.settings.bot.deleteConfirmation))
  const confirm = page.locator(selector(testIds.dialog.confirm))
  await expect(confirm).toBeDisabled()
  await confirmation.fill('incorrect_username')
  await expect(confirm).toBeDisabled()
  await confirmation.fill(bot.username)
  await expect(confirm).toBeEnabled()
  await confirm.click()
  await expect(page).toHaveURL('/settings/bots')
  await expect(page.locator(selector(testIds.settings.bot.delete))).toHaveCount(0)
  const remaining = await page.evaluate(async (botId) => {
    const result = await fetch('/graphql', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'query { adminBots { id } }' }),
    }).then((response) => response.json())
    return (result.data.adminBots as Array<{ id: string }>).some((item) => item.id === botId)
  }, bot.id)
  expect(remaining).toBe(false)
})
