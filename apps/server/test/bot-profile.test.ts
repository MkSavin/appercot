import { expect, test } from 'bun:test'
import { files } from '../src/db/schema'
import { deleteBotMessage, sendBotMessage, sendUserMessage } from '../src/domain/messages'
import { Hub } from '../src/ws/hub'
import { createServerFixture, graphqlRequest } from './helpers'

const avatar =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Y7xoAAAAASUVORK5CYII='

// @anchor INV:bot-profile/chat-deletion
test('loads bot metadata and media and deletes a chat while keeping the membership', async () => {
  const fixture = createServerFixture()
  try {
    const login = await graphqlRequest(
      fixture.baseUrl,
      'mutation { login(username: "admin", password: "password123") { user { id } } }',
    )
    const cookie = login.response.headers.get('set-cookie') ?? ''
    const actor = (login.body.data.login as { user: { id: string } }).user
    const call = async (query: string, variables: Record<string, unknown> = {}) =>
      (await graphqlRequest(fixture.baseUrl, query, variables, cookie)).body

    const created = await call(
      'mutation { createBot(username: "profilebot", name: "Profile Bot", description: "") { bot { id } } }',
    )
    const botId = (created.data.createBot as { bot: { id: string } }).bot.id
    const updated = await call(
      'mutation($bot: ID!, $avatar: String!) { updateBotProfile(botId: $bot, description: "Bot profile", welcome: "Ready to start", avatar: $avatar) { avatar } }',
      { bot: botId, avatar },
    )
    expect(updated.errors).toBeUndefined()
    const tagged = await call(
      'mutation($bot: ID!) { updateBotProfile(botId: $bot, description: "Bot profile", welcome: "Ready to start", tags: ["productivity", "tools"]) { tags } }',
      { bot: botId },
    )
    expect(tagged.errors).toBeUndefined()
    expect(tagged.data.updateBotProfile).toMatchObject({ tags: ['productivity', 'tools'] })
    expect(
      (await call('query { browseBots(query: "productivity") { id tags } }')).data.browseBots,
    ).toEqual([{ id: botId, tags: ['productivity', 'tools'] }])
    const avatarPath = (updated.data.updateBotProfile as { avatar: string }).avatar
    const image = await fetch(fixture.baseUrl + avatarPath, { headers: { cookie } })
    expect(image.headers.get('content-type')).toBe('image/png')
    expect(Buffer.from(await image.arrayBuffer())).toEqual(
      Buffer.from(avatar.split(',')[1] ?? '', 'base64'),
    )
    expect((await fetch(fixture.baseUrl + avatarPath)).status).toBe(404)

    const add = 'mutation { addBot(username: "profilebot") { id bot { welcome } } }'
    const added = await call(add)
    const chatId = (added.data.addBot as { id: string }).id
    expect(added.data.addBot).toMatchObject({ bot: { welcome: 'Ready to start' } })
    const hub = new Hub()
    const media = { kind: 'image' as const, fileId: 'avatar-file', caption: 'Example' }
    fixture.db
      .insert(files)
      .values({
        id: media.fileId,
        chatId,
        ownerType: 'bot',
        ownerId: botId,
        name: 'avatar.png',
        mime: 'image/png',
        size: 1,
        createdAt: Date.now(),
      })
      .run()
    sendBotMessage(fixture.db, hub, botId, { chatId, content: { media: [media] } })
    const profile =
      'query($chat: ID!) { chatProfile(chatId: $chat) { bot { description welcome } media blocked notifications } }'
    expect((await call(profile, { chat: chatId })).data.chatProfile).toMatchObject({
      bot: { description: 'Bot profile', welcome: 'Ready to start' },
      media: [media],
      blocked: false,
      notifications: 'all',
    })

    const input = { chatId, clientId: 'wizard-reply', content: { text: 'Wizard answer' } }
    const message = sendUserMessage(fixture.db, hub, actor.id, input)
    const sessionWithPreview = await call(
      'query { session { chats { id preview { id content createdAt } } } }',
    )
    expect(sessionWithPreview.errors).toBeUndefined()
    expect(sessionWithPreview.data.session).toMatchObject({
      chats: [{ id: chatId, preview: { id: message.id, content: { text: 'Wizard answer' } } }],
    })
    deleteBotMessage(fixture.db, hub, botId, { chatId, messageId: message.id })
    expect(sendUserMessage(fixture.db, hub, actor.id, input)).toMatchObject({
      id: message.id,
      deleted: true,
    })
    const history = 'query($chat: ID!) { messages(chatId: $chat) { id } }'
    expect((await call(history, { chat: chatId })).data.messages).toHaveLength(1)
    expect(
      JSON.stringify((await call('query { sync(since: 0) { updates { payload } } }')).data),
    ).not.toContain('Wizard answer')

    expect(
      (
        await call('mutation($chat: ID!) { blockBot(chatId: $chat, blocked: true) }', {
          chat: chatId,
        })
      ).data.blockBot,
    ).toBe(true)
    expect(
      (await call('mutation($chat: ID!) { deleteChat(chatId: $chat) }', { chat: chatId })).data
        .deleteChat,
    ).toBe(true)
    expect((await call('query { session { chats { id } } }')).data.session).toEqual({ chats: [] })
    expect((await call(history, { chat: chatId })).data.messages).toEqual([])
    expect((await call(add)).data.addBot).toMatchObject({ id: chatId })
    expect((await call(profile, { chat: chatId })).data.chatProfile).toMatchObject({
      media: [],
      blocked: true,
    })
  } finally {
    fixture.stop()
  }
})
