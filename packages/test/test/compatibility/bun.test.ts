import { beforeAll, beforeEach, test } from 'bun:test'
import { AppercotTestClient } from '../../src/index'
import { runBotEnvironmentScenario } from './scenario'

const endpoint = process.env.BOT_APPERCOT_TEST_ENDPOINT
const token = process.env.BOT_APPERCOT_TEST_TOKEN

if (!endpoint || !token) {
  test.skip('runs the real SDK lifecycle against an external CLI', () => {})
} else {
  const client = new AppercotTestClient({ endpoint, token })
  beforeAll(() => client.ready())
  beforeEach(() => client.flushState())
  test('runs the real SDK command, callback and reconnect lifecycle', async () => {
    await runBotEnvironmentScenario(client, endpoint)
  }, 30_000)
}
