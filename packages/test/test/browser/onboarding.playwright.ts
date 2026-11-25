import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
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
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')

test.beforeEach(async () => {
  await client.ready()
  await client.flushState()
})

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`runs a real first bot through ${viewport.name} onboarding`, async ({ page, context }) => {
    test.setTimeout(45_000)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    if (viewport.name === 'desktop') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    } else {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) },
        })
      })
    }

    let diagnosticsRequests = 0
    page.on('request', (request) => {
      if (request.postData()?.includes('adminBotDiagnostics')) diagnosticsRequests += 1
    })
    await page.goto('/login')
    await page.locator(selector(testIds.auth.login.username)).fill('admin')
    await page.locator(selector(testIds.auth.login.password)).fill(adminPassword)
    await page.locator(selector(testIds.auth.login.submit)).click()
    await page.locator(selector(testIds.navigation.settings)).click()
    await page.locator(selector(testIds.settings.tab('bots'))).click()
    await page.locator(selector(testIds.onboarding.create)).click()

    const dialog = page.locator(selector(testIds.onboarding.dialog))
    await dialog.locator(selector(testIds.onboarding.name)).fill('Playwright Echo')
    await dialog
      .locator(selector(testIds.onboarding.username))
      .fill(`onboarding${viewport.name}bot`)
    await dialog.locator(selector(testIds.onboarding.description)).fill('Browser onboarding')
    await dialog.locator(selector(testIds.onboarding.submit)).click()
    await expect(dialog.locator(selector(testIds.onboarding.token))).toBeVisible()

    const botToken = await dialog.locator(selector(testIds.onboarding.token)).inputValue()
    const botUrl = await dialog.locator(selector(testIds.onboarding.url)).inputValue()
    const command = await dialog.locator(selector(testIds.onboarding.command)).inputValue()
    expect(botToken).toMatch(/^.+:.+$/)
    expect(botUrl).toMatch(/^ws(s)?:\/\/.+\/api\/bot\/ws$/)
    expect(command).toContain('bun examples/echo-bot/index.ts')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    const copyCommand = dialog.locator(selector(testIds.onboarding.copyCommand))
    await copyCommand.click()
    if (viewport.name === 'desktop') {
      await expect(copyCommand).toHaveAttribute('data-copy-status', 'copied')
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(command)
      await expect(dialog.locator(selector(testIds.onboarding.tokenSaved))).toBeChecked()
    } else {
      await expect(copyCommand).toHaveAttribute('data-copy-status', 'failed')
      await expect(dialog.locator(selector(testIds.onboarding.token))).toHaveAttribute(
        'readonly',
        '',
      )
      await dialog.locator(selector(testIds.onboarding.tokenSaved)).check()
    }

    const botProcess = spawn('bun', ['examples/echo-bot/index.ts'], {
      cwd: repositoryRoot,
      env: { ...process.env, BOT_TOKEN: botToken, BOT_URL: botUrl },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    try {
      await new Promise<void>((resolveConnected, reject) => {
        const timeout = setTimeout(() => reject(new Error('Echo bot did not start')), 10_000)
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
            reject(new Error(`Echo bot exited with code ${code}`))
          }
        })
      })
      await expect(dialog.locator(selector(testIds.onboarding.status))).toHaveAttribute(
        'data-online',
        'true',
      )

      await dialog.locator(selector(testIds.onboarding.close)).click()
      await expect(dialog).toBeHidden()
      await expect(page.locator(selector(testIds.onboarding.create))).toBeFocused()
      expect(await page.locator(selector(testIds.onboarding.token)).count()).toBe(0)
      expect(
        await page.evaluate(
          (secret) =>
            Object.values(localStorage).every((value) => !value.includes(secret)) &&
            Object.values(sessionStorage).every((value) => !value.includes(secret)),
          botToken,
        ),
      ).toBe(true)
      const requestsAfterClose = diagnosticsRequests
      await page.waitForTimeout(2700)
      expect(diagnosticsRequests).toBe(requestsAfterClose)

      const checklist = page.locator(selector(testIds.onboarding.checklist))
      await checklist.locator(selector(testIds.onboarding.openChat)).click()
      await expect(page.locator(selector(testIds.chat.composer.input))).toBeVisible()
      await page.locator(selector(testIds.chat.composer.input)).fill('/start')
      await page.locator(selector(testIds.chat.composer.send)).click()
      await expect(
        page.locator('[data-test-id^="message.item."]').filter({ hasText: 'Привет' }),
      ).toHaveCount(1)
    } finally {
      botProcess.kill('SIGTERM')
    }
  })
}
