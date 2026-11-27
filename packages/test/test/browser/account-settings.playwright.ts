import { expect, test } from '@playwright/test'
import { testIds } from '../../../../apps/web/src/shared/lib/test-ids'
import { browserFixture, client, login, selector } from './helpers'

test.beforeEach(async () => {
  await client.ready()
  await client.flushState()
})

test('ends every other session and separates logout from account deletion', async ({
  page,
  browser,
}) => {
  const { user } = await browserFixture()
  const otherContext = await browser.newContext()
  const otherPage = await otherContext.newPage()
  try {
    await login(page, user.username, user.password)
    await login(otherPage, user.username, user.password)
    await page.goto('/settings/account')
    const currentId = await page.evaluate(async () => {
      const result = await fetch('/graphql', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'query { mySessions { id current } }' }),
      }).then((response) => response.json())
      return (result.data.mySessions as Array<{ id: string; current: boolean }>).find(
        (session) => session.current,
      )?.id
    })
    if (!currentId) throw new Error('Current session is missing')
    const endAll = page.locator(selector(testIds.settings.sessions.endAll))
    await expect(endAll).toBeVisible()
    await expect(page.locator(selector(testIds.settings.sessions.end(currentId)))).toHaveCount(0)
    await expect(page.locator(selector(testIds.settings.account.logout))).toBeVisible()
    await expect(page.locator(selector(testIds.settings.account.delete))).toBeVisible()

    await endAll.click()
    await page.locator(selector(testIds.dialog.confirm)).click()
    await expect(endAll).toHaveCount(0)
    await otherPage.reload()
    await expect(otherPage.locator(selector(testIds.auth.login.submit))).toBeVisible()
    await page.reload()
    await expect(page.locator(selector(testIds.settings.account.logout))).toBeVisible()
  } finally {
    await otherContext.close()
  }
})
