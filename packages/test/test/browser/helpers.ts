import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { testIds } from '../../../../apps/web/src/shared/lib/test-ids'
import { AppercotTestClient } from '../../src/index'

const endpoint = process.env.BOT_APPERCOT_TEST_ENDPOINT
const token = process.env.BOT_APPERCOT_TEST_TOKEN
if (!endpoint || !token)
  throw new Error('BOT_APPERCOT_TEST_ENDPOINT and BOT_APPERCOT_TEST_TOKEN are required')

export const client = new AppercotTestClient({ endpoint, token })
export const selector = (id: string) => `[data-test-id="${id}"]`

export const browserFixture = async () => {
  const manifest = await client.fixtures()
  const user = manifest.users[0]
  const chat = manifest.chats[0]
  if (!user || !chat) throw new Error('Playwright config requires one user and one chat')
  return { user, chat }
}

export const login = async (page: Page, username: string, password: string, chatId?: string) => {
  await page.goto('/login')
  await page.locator(selector(testIds.auth.login.username)).fill(username)
  await page.locator(selector(testIds.auth.login.password)).fill(password)
  await page.locator(selector(testIds.auth.login.submit)).click()
  await expect(page.locator(selector(testIds.navigation.chats))).toBeVisible()
  if (chatId) {
    await page.locator(selector(testIds.chats.item(chatId))).click()
    await expect(page.locator(selector(testIds.chat.composer.input))).toBeVisible()
  }
}

export const selectLanguage = async (page: Page, trigger: string, locale: 'ru' | 'en') => {
  await page.locator(selector(trigger)).click()
  await page.locator(selector(testIds.language.option(locale))).click()
  await expect(page.locator('html')).toHaveAttribute('lang', locale)
}

export const expectNoAxeViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  if (results.violations.length) {
    await test.info().attach('axe-violations', {
      body: JSON.stringify(results.violations, null, 2),
      contentType: 'application/json',
    })
  }
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map((node) => node.target),
      details: violation.nodes.map((node) => node.failureSummary),
    })),
  ).toEqual([])
}
