import { describe, expect, test } from 'bun:test'
import { files } from '../src/db/schema'
import { createServerFixture, graphqlRequest } from './helpers'

describe('file upload policy', () => {
  test('exposes env-based limits and recommended concurrency', async () => {
    const fixture = createServerFixture(undefined, {
      MEDIA_MAX_BYTES: '12345',
      MEDIA_UPLOADS_PER_ACTOR: '1',
    })
    try {
      const response = await fetch(`${fixture.baseUrl}/api/files/limits`)
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({
        maxBytes: 12345,
        maxFiles: 10,
        recommendedConcurrency: 1,
      })
    } finally {
      fixture.stop()
    }
  })

  // @anchor INV:file-upload-policy/sends-multiple
  test('sends multiple owned media once with the same client id', async () => {
    const fixture = createServerFixture()
    try {
      const login = await graphqlRequest(
        fixture.baseUrl,
        'mutation { login(username: "admin", password: "password123") { user { id } } }',
      )
      const cookie = login.response.headers.get('set-cookie')
      if (!cookie) throw new Error('Admin cookie is missing')
      const created = await graphqlRequest(
        fixture.baseUrl,
        'mutation { createBot(username: "uploadpolicybot", name: "Uploads", description: "Uploads") { bot { id } } }',
        {},
        cookie,
      )
      expect(created.body.errors).toBeUndefined()
      const added = await graphqlRequest(
        fixture.baseUrl,
        'mutation { addBot(username: "uploadpolicybot") { id } }',
        {},
        cookie,
      )
      const chatId = (added.body.data.addBot as { id: string }).id
      const userId = (login.body.data.login as { user: { id: string } }).user.id
      const media = ['file-one', 'file-two'].map((fileId, index) => {
        fixture.db
          .insert(files)
          .values({
            id: fileId,
            ownerType: 'user',
            ownerId: userId,
            chatId,
            originChatId: chatId,
            mime: 'image/png',
            size: 3,
            name: index === 0 ? 'one.png' : 'two.png',
            attached: false,
            createdAt: Date.now(),
          })
          .run()
        return { fileId, kind: 'image' }
      })
      const mutation =
        'mutation($input: SendMessageInput!) { sendMessage(input: $input) { id content } }'
      const input = {
        chatId,
        clientId: 'multi-media-message',
        content: { text: 'Two files', media },
      }
      const first = await graphqlRequest(fixture.baseUrl, mutation, { input }, cookie)
      const retry = await graphqlRequest(fixture.baseUrl, mutation, { input }, cookie)
      expect(first.body.errors).toBeUndefined()
      expect(retry.body.data.sendMessage).toEqual(first.body.data.sendMessage)

      const history = await graphqlRequest(
        fixture.baseUrl,
        'query($chatId: ID!) { messages(chatId: $chatId) { id content } }',
        { chatId },
        cookie,
      )
      const rows = history.body.data.messages as Array<{ id: string; content: unknown }>
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        content: { text: 'Two files', media },
      })
      expect(
        fixture.db
          .select({ attached: files.attached })
          .from(files)
          .all()
          .map((file) => file.attached),
      ).toEqual([true, true])
    } finally {
      fixture.stop()
    }
  })
})
