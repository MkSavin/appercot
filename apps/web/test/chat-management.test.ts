import { describe, expect, test } from 'bun:test'
import type { BotCommand, ClientChat } from '@appercot/protocol'
import {
  createChatStore,
  isTypingActive,
  type SessionPayload,
} from '../src/entities/chat/model/store'
import { updateChatBlocked } from '../src/features/block-bot/model/update-chat-blocked'
import { clearChatHistory } from '../src/features/clear-chat/model/clear-chat-history'
import { filterBotCommands } from '../src/features/command-menu/model/filter-commands'

const chat: ClientChat = {
  id: 'chat-1',
  bot: {
    id: 'bot-1',
    username: 'echobot',
    name: 'Echo',
    description: '',
    online: true,
    listed: true,
  },
  roles: [],
  blocked: false,
  unread: 2,
  lastMessageAt: null,
  createdAt: 1,
}

const session: SessionPayload = {
  user: { id: 'user-1', username: 'alice', displayName: 'Alice', role: 'user' },
  chats: [chat],
  vapidPublicKey: null,
}

describe('chat management', () => {
  test('expires typing after five seconds', () => {
    const store = createChatStore({ now: () => 1000 })
    store.getState().setSession(session)
    store.getState().applyUpdate(1, { type: 'bot.typing', chatId: chat.id })

    expect(store.getState().typingByChat[chat.id]).toBe(6000)
    expect(isTypingActive(store.getState().typingByChat[chat.id], 5999)).toBe(true)
    expect(isTypingActive(store.getState().typingByChat[chat.id], 6000)).toBe(false)

    store.getState().expireTyping(chat.id, 5999)
    expect(store.getState().typingByChat[chat.id]).toBe(6000)
    store.getState().expireTyping(chat.id, 6000)
    expect(store.getState().typingByChat[chat.id]).toBeUndefined()
  })

  test('updates blocked state only after the server mutation', async () => {
    const store = createChatStore()
    store.getState().setSession(session)
    let requested = false
    await updateChatBlocked(store, chat.id, true, async () => {
      requested = true
      expect(store.getState().chats[0]?.blocked).toBe(false)
      return true
    })

    expect(requested).toBe(true)
    expect(store.getState().chats[0]?.blocked).toBe(true)
  })

  test('clears local messages after a successful clear mutation', async () => {
    const store = createChatStore()
    store.getState().setSession(session)
    store.getState().beginOptimisticMessage(chat.id, 'client-1', { text: 'Hello' }, 1000)
    await clearChatHistory(store, chat.id, async () => true)

    expect(store.getState().messagesByChat[chat.id]).toEqual([])
    expect(store.getState().pendingByChat[chat.id]).toEqual([])
  })

  test('filters commands by their names without a leading slash', () => {
    const commands: BotCommand[] = [
      { name: 'start', description: 'Начать' },
      { name: 'help', description: 'Помощь' },
    ]
    expect(filterBotCommands(commands, '/he')).toEqual([commands[1]])
    expect(filterBotCommands(commands, 'hello')).toEqual([])
  })
})
