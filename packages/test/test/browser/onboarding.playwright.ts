import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { localeStorageKey } from '../../../../apps/web/src/shared/lib/locale'
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
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')

test.beforeEach(async () => {
  await client.ready()
  await client.flushState()
})

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`runs a real first bot through ${viewport.name} onboarding`, async ({
    page,
    context,
    browserName,
    isMobile,
  }) => {
    test.setTimeout(60_000)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    if (viewport.name === 'desktop' && browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    } else {
      await page.addInitScript(() => {
        let clipboard = ''
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: (text: string) => {
              if (window.innerWidth < 500)
                return Promise.reject(new DOMException('Denied', 'NotAllowedError'))
              clipboard = text
              return Promise.resolve()
            },
            readText: () => Promise.resolve(clipboard),
          },
        })
      })
    }

    await page.addInitScript((key) => localStorage.setItem(key, 'en'), localeStorageKey)
    await page.goto('/login')
    await page.locator(selector(testIds.auth.login.username)).fill('admin')
    await page.locator(selector(testIds.auth.login.password)).fill(adminPassword)
    await page.locator(selector(testIds.auth.login.submit)).click()
    await page.locator(selector(testIds.navigation.settings)).click()
    await page.locator(selector(testIds.settings.tab('bots'))).click()
    await page.locator(selector(testIds.onboarding.create)).click()

    const dialog = page.locator(selector(testIds.onboarding.dialog))
    const submit = dialog.locator(selector(testIds.onboarding.submit))
    const buttonSizes = await dialog.evaluate(
      (root, ids) => {
        const cancelButton = root.querySelector(`[data-test-id="${ids.cancel}"]`)
        const submitButton = root.querySelector(`[data-test-id="${ids.submit}"]`)
        if (!cancelButton || !submitButton) throw new Error('Create form buttons are missing')
        const cancelRect = cancelButton.getBoundingClientRect()
        const submitRect = submitButton.getBoundingClientRect()
        return {
          cancel: { width: cancelRect.width, height: cancelRect.height },
          submit: { width: submitRect.width, height: submitRect.height },
        }
      },
      { cancel: testIds.onboarding.cancel, submit: testIds.onboarding.submit },
    )
    expect(buttonSizes.cancel.width).toBeCloseTo(buttonSizes.submit.width, 1)
    expect(buttonSizes.cancel.height).toBeCloseTo(buttonSizes.submit.height, 1)
    const guideBox = await dialog.locator(selector(testIds.onboarding.guide)).boundingBox()
    const dialogBox = await dialog.boundingBox()
    if (!guideBox || !dialogBox) throw new Error('Onboarding guide is not visible')
    expect(guideBox.x - dialogBox.x).toBeLessThan(40)

    await dialog.locator(selector(testIds.onboarding.name)).fill('Playwright Bot')
    await dialog
      .locator(selector(testIds.onboarding.username))
      .fill(`onboarding${viewport.name}bot`)
    await dialog.locator(selector(testIds.onboarding.description)).fill('Browser onboarding')
    await submit.click()

    const tokenInput = dialog.locator(selector(testIds.bot.token))
    await expect(tokenInput).toBeVisible()
    await expect(tokenInput).toHaveAttribute('type', 'password')
    const botToken = await tokenInput.inputValue()
    const botUrl = await dialog.locator(selector(testIds.onboarding.url)).inputValue()
    expect(botToken).toMatch(/^.+:.+$/)
    expect(botUrl).toMatch(/^ws(s)?:\/\/.+\/api\/bot\/ws$/)
    await expect(dialog).not.toContainText('echo-bot')
    await expect(dialog.locator('input[type="checkbox"]')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    const reveal = dialog.locator(selector(testIds.bot.revealToken))
    await reveal.click()
    await expect(tokenInput).toHaveAttribute('type', 'text')
    await reveal.click()
    await expect(tokenInput).toHaveAttribute('type', 'password')

    const copyToken = dialog.locator(selector(testIds.bot.copyToken))
    await copyToken.click()
    if (viewport.name === 'desktop') {
      await expect(copyToken).toHaveAttribute('data-copy-status', 'copied')
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(botToken)
      const copyUrl = dialog.locator(selector(testIds.onboarding.copyUrl))
      await copyUrl.click()
      await expect(copyUrl).toHaveAttribute('data-copy-status', 'copied')
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(botUrl)
    } else {
      await expect(copyToken).toHaveAttribute('data-copy-status', 'failed')
      await expect(tokenInput).toHaveAttribute('readonly', '')
    }

    const status = dialog.locator(selector(testIds.onboarding.status))
    await expect(status).toHaveAttribute('data-state', 'idle')
    await dialog.locator(selector(testIds.onboarding.checkConnection)).click()
    await expect(status).toHaveAttribute('data-state', 'failed')
    await dialog.locator(selector(testIds.onboarding.refreshConnection)).click()
    await expect(status).toHaveAttribute('data-state', 'failed')

    const botProcess = spawn('bun', ['examples/echo-bot/index.ts'], {
      cwd: repositoryRoot,
      env: { ...process.env, BOT_TOKEN: botToken, BOT_URL: botUrl },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    try {
      await new Promise<void>((resolveConnected, reject) => {
        const timeout = setTimeout(() => reject(new Error('SDK bot did not start')), 10_000)
        botProcess.stdout.on('data', (chunk: Buffer) => {
          if (!String(chunk).includes('Echo bot connected')) return
          clearTimeout(timeout)
          resolveConnected()
        })
        botProcess.once('error', (error) => {
          clearTimeout(timeout)
          reject(error)
        })
        botProcess.once('exit', (code) => {
          if (code !== 0) {
            clearTimeout(timeout)
            reject(new Error(`SDK bot exited with code ${code}`))
          }
        })
      })
      await dialog.locator(selector(testIds.onboarding.refreshConnection)).click()
      await expect(status).toHaveAttribute('data-online', 'true')
      await expect(status).toHaveAttribute('data-state', 'online')

      await dialog.locator(selector(testIds.onboarding.close)).click()
      await expect(dialog).toBeHidden()
      if (!isMobile) await expect(page.locator(selector(testIds.onboarding.create))).toBeFocused()
      expect(await page.locator(selector(testIds.bot.token)).count()).toBe(0)
      expect(
        await page.evaluate(
          (secret) =>
            Object.values(localStorage).every((value) => !value.includes(secret)) &&
            Object.values(sessionStorage).every((value) => !value.includes(secret)),
          botToken,
        ),
      ).toBe(true)

      const checklist = page.locator(selector(testIds.onboarding.checklist))
      await expect(checklist.locator(selector(testIds.onboarding.status))).toHaveCount(0)
      await expect(checklist.locator('a[href^="/settings/bots/"]')).toHaveCount(0)
      const toggle = checklist.locator(selector(testIds.onboarding.toggle))
      await toggle.click({ position: { x: 10, y: 10 } })
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(checklist).toContainText('2 of 3')
      await toggle.click({ position: { x: 10, y: 10 } })
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      await expect(checklist).toContainText('Bot created')
      await expect(checklist).toContainText('Bot connected')
      await expect(checklist).toContainText('Open a chat and send /start')
      const chatId = await page.evaluate(async (username) => {
        const result = await fetch('/graphql', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            query:
              'mutation AddOnboardingBot($username: String!) { addBot(username: $username) { id } }',
            variables: { username },
          }),
        }).then((response) => response.json())
        return result.data.addBot.id as string
      }, `onboarding${viewport.name}bot`)
      await page.goto('/')
      await page.locator(selector(testIds.chats.item(chatId))).click()
      await expect(page.locator(selector(testIds.chat.composer.input))).toBeVisible()
      await page.locator(selector(testIds.chat.composer.input)).fill('/start')
      await page.locator(selector(testIds.chat.composer.send)).click()
      await expect(
        page.locator('[data-test-id^="message.item."]').filter({ hasText: 'Привет' }),
      ).toHaveCount(1)
      await page.goto('/settings/bots')
      await expect(page.locator(selector(testIds.onboarding.checklist))).toContainText('3 of 3')
      await expect(page.locator(selector(testIds.onboarding.checklist))).toContainText(
        'First conversation started',
      )
    } finally {
      botProcess.kill('SIGTERM')
    }
  })
}
