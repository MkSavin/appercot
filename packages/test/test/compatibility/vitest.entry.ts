import { beforeAll, beforeEach, test } from 'vitest'
import { AppercotTestClient } from '../../src/index'
import { runBotEnvironmentScenario } from './scenario'

const endpoint = process.env.BOT_APPERCOT_TEST_ENDPOINT
const token = process.env.BOT_APPERCOT_TEST_TOKEN
if (!endpoint || !token)
  throw new Error('BOT_APPERCOT_TEST_ENDPOINT and BOT_APPERCOT_TEST_TOKEN are required')
const client = new AppercotTestClient({ endpoint, token })

beforeAll(() => client.ready())
beforeEach(() => client.flushState())

test('runs the real SDK command, callback and reconnect lifecycle', async () => {
  await runBotEnvironmentScenario(client, endpoint)
}, 30_000)
