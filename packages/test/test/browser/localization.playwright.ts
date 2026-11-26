import { expect, test } from '@playwright/test'
import { testIds } from '../../../../apps/web/src/shared/lib/test-ids'
import {
  browserFixture,
  client,
  expectNoAxeViolations,
  login,
  selectLanguage,
  selector,
} from './helpers'

test.beforeEach(async () => {
  await client.ready()
  await client.flushState()
})

test('selects English before auth and preserves it across settings, reload and narrow layouts', async ({
  page,
  context,
  isMobile,
}) => {
  const { user, chat } = await browserFixture()
  await page.goto('/login')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await expectNoAxeViolations(page)
  await selectLanguage(page, testIds.auth.language, 'en')
  await expect(page.locator(selector(testIds.auth.login.submit))).toHaveText('Sign in')

  await page.locator(selector(testIds.auth.login.username)).fill(user.username)
  await page.locator(selector(testIds.auth.login.password)).fill('incorrect-password')
  await page.locator(selector(testIds.auth.login.submit)).click()
  await expect(page.locator(selector(testIds.auth.login.error))).toHaveText(
    'Invalid username or password.',
  )
  await expectNoAxeViolations(page)

  await login(page, user.username, user.password, chat.id)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  const second = await context.newPage()
  await second.goto('/login')
  await expect(second.locator('html')).toHaveAttribute('lang', 'en')
  await page.reload()
  await expect(page.locator(selector(testIds.chat.composer.input))).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expectNoAxeViolations(page)

  await page.locator(selector(testIds.chat.notifications.trigger)).click()
  await expect(page.locator(selector(testIds.chat.notifications.mode('all')))).toBeVisible()
  await expect(page.locator(selector(testIds.chat.notifications.menu))).toHaveCSS('opacity', '1')
  await expectNoAxeViolations(page)
  await page.keyboard.press('Escape')
  await expect(page.locator(selector(testIds.chat.notifications.trigger))).toBeFocused()

  if (isMobile) await page.locator(selector(testIds.chat.back)).click()
  await page.locator(selector(testIds.navigation.settings)).click()
  await page.locator(selector(testIds.settings.tab('appearance'))).click()
  const language = page.locator(selector(testIds.settings.language))
  await expect(language).toHaveText('English')
  await selectLanguage(page, testIds.settings.language, 'ru')
  await expect(page.locator(selector(testIds.settings.tab('appearance')))).toHaveText('Оформление')
  await expect(second.locator('html')).toHaveAttribute('lang', 'ru')
  await selectLanguage(page, testIds.settings.language, 'en')
  await expect(page.locator(selector(testIds.settings.tab('appearance')))).toHaveText('Appearance')
  await expect(second.locator('html')).toHaveAttribute('lang', 'en')
  await second.close()
  expect(await page.evaluate(() => localStorage.getItem('appercot:locale:v1'))).toBe('en')

  const dark = page.locator(selector(testIds.settings.theme('dark')))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await dark.check({ force: true })
  await expect(dark).toBeChecked()
  await expect(page.locator('h1')).toHaveCSS('color', /0\.9173/)
  await expectNoAxeViolations(page)
  await page.setViewportSize({ width: 320, height: 740 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(language).toBeVisible()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator(selector(testIds.settings.language))).toHaveText('English')

  await page.goto('/browse')
  await expect(page.locator(selector(testIds.catalog.search))).toBeVisible()
  await expectNoAxeViolations(page)
})
