import { expect, test } from 'bun:test'
import { createServerFixture, graphqlRequest } from './helpers'

// @anchor INV:large-history/bounds-replay
test('paginates history and update replay when a chat contains more than twenty thousand events', async () => {
  const fixture = createServerFixture()
  try {
    const login = await graphqlRequest(
      fixture.baseUrl,
      'mutation { login(username: "admin", password: "password123") { user { id } } }',
    )
    const cookie = login.response.headers.get('set-cookie') ?? ''
    const { user } = login.body.data.login as { user: { id: string } }
    const call = (query: string, variables: Record<string, unknown> = {}) =>
      graphqlRequest(fixture.baseUrl, query, variables, cookie)
    await call(
      'mutation { createBot(username: "archivebot", name: "Archive", description: "") { token } }',
    )
    const joined = await call('mutation { addBot(username: "archivebot") { id bot { id } } }')
    const { id: chatId, bot } = joined.body.data.addBot as { id: string; bot: { id: string } }
    fixture.sqlite
      .query(`WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x + 1 FROM n WHERE x < 20050)
      INSERT INTO messages (id, chat_id, seq, sender, content, status, created_at)
      SELECT 'archive-' || x, ?1, x, 'bot', '{"text":"Archive event"}', 'processed', x FROM n`)
      .run(chatId)
    fixture.sqlite
      .query(`WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x + 1 FROM n WHERE x < 20050)
      INSERT INTO user_updates (user_id, payload, created_at)
      SELECT ?1, json_object('type','bot.presence','botId',?2,'online',json('true')), x FROM n`)
      .run(user.id, bot.id)
    const messages =
      'query($chat: ID!, $before: Int) { messages(chatId: $chat, before: $before) { seq } }'
    const latest = (await call(messages, { chat: chatId })).body.data.messages as Array<{
      seq: number
    }>
    expect(latest).toHaveLength(50)
    expect(latest.at(-1)?.seq).toBe(20050)
    const previous = (await call(messages, { chat: chatId, before: latest[0]?.seq })).body.data
      .messages as Array<{ seq: number }>
    expect(previous).toHaveLength(50)
    expect(previous.at(-1)?.seq).toBe(20000)
    const found = await call(
      'query($chat: ID!) { searchMessages(chatId: $chat, query: "Archive", limit: 30) { items { message { seq } } hasMore } }',
      { chat: chatId },
    )
    const foundPage = found.body.data.searchMessages as {
      items: Array<{ message: { seq: number } }>
      hasMore: boolean
    }
    expect(foundPage.items[0]).toEqual({ message: { seq: 20050 } })
    expect(foundPage.hasMore).toBe(true)
    expect(foundPage.items).toHaveLength(30)
    const replay =
      'query($since: Int!) { sync(since: $since) { hasMore checkpoint updates { seq } } }'
    const first = (await call(replay, { since: 0 })).body.data.sync as {
      hasMore: boolean
      checkpoint: number
      updates: Array<{ seq: number }>
    }
    expect(first.updates).toHaveLength(256)
    expect(first.hasMore).toBe(true)
    const second = (await call(replay, { since: first.checkpoint })).body.data.sync as typeof first
    expect(second.updates[0]?.seq).toBe(first.checkpoint + 1)
    const snapshot = (await call('query { session { checkpoint } }')).body.data.session as {
      checkpoint: number
    }
    expect(snapshot.checkpoint).toBeGreaterThanOrEqual(20050)
    expect((await call(replay, { since: snapshot.checkpoint })).body.data.sync).toMatchObject({
      hasMore: false,
      updates: [],
    })
  } finally {
    fixture.stop()
  }
})
