import { afterEach, expect, test } from 'bun:test'
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createDatabase } from '../src/db/client'
import { searchMessages } from '../src/domain/message-search'
import { sendBotMessage } from '../src/domain/messages'
import { Hub } from '../src/ws/hub'
import { createServerFixture, graphqlRequest } from './helpers'

const cleanup: string[] = []
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

// @anchor INV:message-search/synchronizes-index
test('upgrades an existing database and keeps external-content FTS synchronized', async () => {
  const dataDir = resolve(`.test-data/message-search-${Bun.randomUUIDv7()}`)
  cleanup.push(dataDir)
  const migrations = resolve(dataDir, 'drizzle')
  const source = resolve('apps/server/drizzle')
  await mkdir(migrations, { recursive: true })
  await mkdir(resolve(migrations, 'meta'), { recursive: true })
  const journal = JSON.parse(await readFile(resolve(source, 'meta/_journal.json'), 'utf8')) as {
    entries: Array<Record<string, unknown> & { idx: number; tag: string }>
  }
  const current = journal.entries.find((entry) => entry.tag === '0013_message_search')
  if (!current) throw new Error('Message search migration is missing')
  journal.entries = journal.entries.filter((entry) => entry.idx < 13)
  await writeFile(resolve(migrations, 'meta/_journal.json'), JSON.stringify(journal))
  for (const file of await readdir(source)) {
    if (file.endsWith('.sql') && file !== '0013_message_search.sql') {
      await copyFile(resolve(source, file), resolve(migrations, file))
    }
  }

  const databasePath = resolve(dataDir, 'existing.sqlite')
  const legacy = createDatabase(databasePath, migrations)
  const now = Date.now()
  legacy.sqlite.exec(`
    INSERT INTO users (id, username, display_name, password_hash, created_at)
    VALUES ('owner', 'owner', 'Owner', 'hash', ${now});
    INSERT INTO bots (id, username, name, description, token_hash, created_at)
    VALUES ('bot', 'searchbot', 'Search', '', 'token', ${now});
    INSERT INTO chats (id, user_id, bot_id, created_at) VALUES ('chat', 'owner', 'bot', ${now});
    INSERT INTO messages (id, chat_id, seq, sender, content, status, created_at) VALUES
      ('ru', 'chat', 1, 'bot', '{"text":"Древний русский текст"}', 'processed', 1),
      ('en', 'chat', 2, 'bot', '{"text":"Ancient English text 😀"}', 'processed', 2),
      ('deleted', 'chat', 3, 'bot', '{"text":"Deleted ancient text"}', 'processed', 3),
      ('media', 'chat', 4, 'bot', '{"media":[{"kind":"image","fileId":"file","caption":"Ancient"}]}', 'processed', 4);
    UPDATE messages SET deleted_at = 3 WHERE id = 'deleted';
  `)
  legacy.sqlite.close()
  await copyFile(
    resolve(source, '0013_message_search.sql'),
    resolve(migrations, '0013_message_search.sql'),
  )
  journal.entries.push(current)
  await writeFile(resolve(migrations, 'meta/_journal.json'), JSON.stringify(journal))

  const upgraded = createDatabase(databasePath, migrations)
  try {
    expect(upgraded.sqlite.query('SELECT count(*) AS count FROM message_search').get()).toEqual({
      count: 4,
    })
    expect(searchMessages(upgraded.db, 'owner', 'chat', 'древний').items).toHaveLength(1)
    expect(
      searchMessages(upgraded.db, 'owner', 'chat', 'ancient').items.map((hit) => hit.message.id),
    ).toEqual(['en'])
    expect(searchMessages(upgraded.db, 'owner', 'chat', '😀').items).toHaveLength(0)
    upgraded.sqlite
      .query('UPDATE messages SET content = ? WHERE id = ?')
      .run('{"text":"Edited needle"}', 'ru')
    expect(searchMessages(upgraded.db, 'owner', 'chat', 'edited').items[0]?.message.id).toBe('ru')
    expect(searchMessages(upgraded.db, 'owner', 'chat', 'древний').items).toHaveLength(0)
    upgraded.sqlite.query('DELETE FROM messages WHERE id = ?').run('en')
    expect(searchMessages(upgraded.db, 'owner', 'chat', 'ancient').items).toHaveLength(0)
    upgraded.sqlite.query('DELETE FROM chats WHERE id = ?').run('chat')
    expect(upgraded.sqlite.query('SELECT count(*) AS count FROM message_search').get()).toEqual({
      count: 0,
    })
  } finally {
    upgraded.sqlite.close()
  }
})

const searchQuery = `
  query Search($chatId: ID!, $query: String!, $beforeSeq: Int, $limit: Int) {
    searchMessages(chatId: $chatId, query: $query, beforeSeq: $beforeSeq, limit: $limit) {
      items { message { id chatId seq content } snippet }
      hasMore
    }
  }
`

interface SearchPage {
  items: Array<{ message: { id: string; chatId: string; seq: number }; snippet: string }>
  hasMore: boolean
}

// @anchor INV:message-search/protects-results
test('escapes MATCH input, isolates chats and returns stable pages and bounded context', async () => {
  const fixture = createServerFixture()
  try {
    const login = await graphqlRequest(
      fixture.baseUrl,
      'mutation { login(username: "admin", password: "password123") { user { id } } }',
    )
    const cookie = login.response.headers.get('set-cookie') ?? ''
    const call = (query: string, variables: Record<string, unknown> = {}, session = cookie) =>
      graphqlRequest(fixture.baseUrl, query, variables, session)
    const createChat = async (username: string) => {
      await call(
        `mutation { createBot(username: "${username}", name: "${username}", description: "") { bot { id } } }`,
      )
      const added = await call(`mutation { addBot(username: "${username}") { id bot { id } } }`)
      return added.body.data.addBot as { id: string; bot: { id: string } }
    }
    const first = await createChat('firstsearchbot')
    const second = await createChat('secondsearchbot')
    const hub = new Hub()
    const texts = [
      'Common first',
      'Древний русский результат',
      'Ancient English result',
      'Literal OR NEAR * : (parentheses) "quote" 😀',
      'Common second',
      'Common third',
      'Shared secret',
    ]
    for (const text of texts) {
      sendBotMessage(fixture.db, hub, first.bot.id, {
        chatId: first.id,
        content: { text },
      })
    }
    sendBotMessage(fixture.db, hub, second.bot.id, {
      chatId: second.id,
      content: { text: 'Shared secret' },
    })

    const search = async (
      query: string,
      variables: Record<string, unknown> = {},
      session = cookie,
    ) => {
      const response = await call(searchQuery, { chatId: first.id, query, ...variables }, session)
      return {
        ...response,
        page: (response.body.data?.searchMessages ?? { items: [], hasMore: false }) as SearchPage,
      }
    }
    expect((await search('древний')).page.items).toHaveLength(1)
    expect((await search('ancient')).page.items[0]?.snippet).toContain('Ancient')
    expect((await search('OR')).page.items).toHaveLength(1)
    expect((await search('"')).page.items).toHaveLength(0)
    expect((await search('😀')).page.items).toHaveLength(0)
    expect((await search('shared')).page.items[0]?.message.chatId).toBe(first.id)
    expect((await search('   ')).page).toEqual({ items: [], hasMore: false })
    expect((await search('x'.repeat(201))).body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST')

    const pageOne = (await search('common', { limit: 1 })).page
    expect(pageOne.items).toHaveLength(1)
    expect(pageOne.hasMore).toBe(true)
    const pageOneSeq = pageOne.items[0]?.message.seq
    if (!pageOneSeq) throw new Error('First search page is empty')
    const pageTwo = (await search('common', { limit: 1, beforeSeq: pageOneSeq })).page
    expect(pageTwo.items[0]?.message.seq).toBeLessThan(pageOneSeq)
    expect(pageTwo.items[0]?.message.id).not.toBe(pageOne.items[0]?.message.id)

    const contextQuery = `
      query Context($chatId: ID!, $seq: Int!, $before: Int, $after: Int) {
        messageContext(chatId: $chatId, seq: $seq, before: $before, after: $after) {
          messages { seq }
          targetSeq hasEarlier hasLater latestSeq
        }
      }
    `
    const context = await call(contextQuery, {
      chatId: first.id,
      seq: 2,
      before: 1,
      after: 1,
    })
    expect(context.body.data.messageContext).toMatchObject({
      messages: [{ seq: 1 }, { seq: 2 }, { seq: 3 }],
      targetSeq: 2,
      hasEarlier: false,
      hasLater: true,
      latestSeq: 7,
    })
    const firstContext = await call(contextQuery, {
      chatId: first.id,
      seq: 1,
      before: 1,
      after: 1,
    })
    expect((firstContext.body.data.messageContext as { hasEarlier: boolean }).hasEarlier).toBe(
      false,
    )

    await call(
      'mutation { register(username: "searchoutsider", password: "password123", displayName: "Outsider", invite: "bootstrap-invite") { user { id } } }',
    )
    const outsiderLogin = await graphqlRequest(
      fixture.baseUrl,
      'mutation { login(username: "searchoutsider", password: "password123") { user { id } } }',
    )
    const outsiderCookie = outsiderLogin.response.headers.get('set-cookie') ?? ''
    expect((await search('shared', {}, outsiderCookie)).body.errors?.[0]?.extensions?.code).toBe(
      'FORBIDDEN',
    )
    expect(
      (await call(contextQuery, { chatId: first.id, seq: 99 }, cookie)).body.errors?.[0]?.extensions
        ?.code,
    ).toBe('NOT_FOUND')
  } finally {
    fixture.stop()
  }
})
