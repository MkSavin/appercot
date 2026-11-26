import { expect, test } from '@playwright/test'
import { testIds } from '../../../../apps/web/src/shared/lib/test-ids'
import { browserFixture, client, expectNoAxeViolations, login, selector } from './helpers'

test.beforeEach(async () => {
  await client.ready()
  await client.flushState()
})

test('supports multiline text and does not submit during IME composition', async ({
  page,
  isMobile,
}) => {
  const { user, chat } = await browserFixture()
  await login(page, user.username, user.password, chat.id)
  const input = page.locator(selector(testIds.chat.composer.input))
  await input.fill('First line')
  await input.press('Shift+Enter')
  await input.pressSequentially('Second line')
  await expect(input).toHaveValue('First line\nSecond line')
  await expect(
    page.locator('[data-test-id^="message.item."]').filter({ hasText: 'Second line' }),
  ).toHaveCount(0)

  await input.dispatchEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 229,
    which: 229,
    isComposing: true,
    bubbles: true,
    cancelable: true,
  })
  await expect(input).toHaveValue('First line\nSecond line')
  await expect(
    page.locator('[data-test-id^="message.item."]').filter({ hasText: 'Second line' }),
  ).toHaveCount(0)
  await input.dispatchEvent('compositionend', { data: 'Second line', bubbles: true })
  await input.press('Enter')
  if (isMobile) {
    await expect(input).toHaveValue('First line\nSecond line\n')
    await page.locator(selector(testIds.chat.composer.send)).click()
  }
  await expect(
    page.locator('[data-test-id^="message.item."]').filter({ hasText: 'Second line' }),
  ).toHaveCount(1)
  await expect(input).toHaveValue('')
})

test('preserves the reading position across earlier history and incoming messages', async ({
  page,
}) => {
  test.setTimeout(60_000)
  const { user, chat } = await browserFixture()
  const sent = await Promise.all(
    Array.from({ length: 55 }, (_, index) =>
      client.sendMessage({ chatId: chat.id, sender: 'bot', content: { text: `History ${index}` } }),
    ),
  )
  sent.sort((left, right) => left.seq - right.seq)
  const anchor = sent[5]
  if (!anchor) throw new Error('History anchor is missing')
  await login(page, user.username, user.password, chat.id)
  const viewport = page.locator(selector(testIds.chat.history.viewport))
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  await viewport.evaluate((element) => element.scrollTo({ top: 0 }))
  const anchorRow = page.locator(selector(testIds.message.item(anchor.id)))
  await expect(anchorRow).toBeVisible()
  const before = await anchorRow.evaluate((element) => element.getBoundingClientRect().top)
  await page.locator(selector(testIds.chat.history.earlier)).click()
  await expect(page.locator(selector(testIds.chat.history.earlier))).toHaveCount(0)
  await expect(anchorRow).toBeVisible()
  const after = await anchorRow.evaluate((element) => element.getBoundingClientRect().top)
  expect(Math.abs(after - before)).toBeLessThan(120)

  const scrollBeforeIncoming = await viewport.evaluate((element) => element.scrollTop)
  const incoming = await client.sendMessage({
    chatId: chat.id,
    sender: 'bot',
    content: { text: 'Incoming above the tail' },
  })
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  await expect(page.locator(selector(testIds.message.item(incoming.id)))).toHaveCount(0)
  expect(await viewport.evaluate((element) => element.scrollTop)).toBeCloseTo(
    scrollBeforeIncoming,
    0,
  )

  await page.locator(selector(testIds.chat.history.latest)).click()
  await expect(page.locator(selector(testIds.message.item(incoming.id)))).toBeVisible()
  const nearBottom = await client.sendMessage({
    chatId: chat.id,
    sender: 'bot',
    content: { text: 'Incoming near the bottom' },
  })
  await expect(page.locator(selector(testIds.message.item(nearBottom.id)))).toBeVisible()
  await expect
    .poll(() =>
      viewport.evaluate(
        (element) => element.scrollHeight - element.scrollTop - element.clientHeight,
      ),
    )
    .toBeLessThan(100)
})

test('keeps composer, touch actions and long content usable at 320 pixels', async ({
  page,
  isMobile,
}) => {
  const { user, chat } = await browserFixture()
  await page.setViewportSize({ width: 320, height: 740 })
  await login(page, user.username, user.password, chat.id)
  const composer = page.locator(selector(testIds.chat.composer.input))
  await expect(composer).toBeVisible()
  const box = await composer.boundingBox()
  expect(box).not.toBeNull()
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320)
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(740)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (isMobile) {
    for (const id of [testIds.chat.composer.send, testIds.chat.notifications.trigger]) {
      const target = await page.locator(selector(id)).boundingBox()
      expect(target?.width).toBeGreaterThanOrEqual(44)
      expect(target?.height).toBeGreaterThanOrEqual(44)
    }
  }

  const notifications = page.locator(selector(testIds.chat.notifications.trigger))
  await notifications.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator(selector(testIds.chat.notifications.mode('all')))).toBeVisible()
  await expect(page.locator(selector(testIds.chat.notifications.menu))).toHaveCSS('opacity', '1')
  await expectNoAxeViolations(page)
  await page.keyboard.press('Escape')
  await expect(notifications).toBeFocused()
  await expect(page.locator(selector(testIds.chat.composer.fileInput))).toBeAttached()

  const longText = `https://example.test/${'very-long-segment/'.repeat(20)}`
  const longMessage = await client.sendMessage({
    chatId: chat.id,
    sender: 'bot',
    content: { text: longText },
  })
  await expect(page.locator(selector(testIds.message.item(longMessage.id)))).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.goBack()
  await expect(page.locator(selector(testIds.chats.search))).toBeVisible()
})
