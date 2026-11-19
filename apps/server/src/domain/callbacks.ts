import { eq } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { messages } from '../db/schema'
import type { Hub } from '../ws/hub'
import { getChatForUser, toChatRef, toUserRef } from './chats'
import { DomainError } from './errors'
import { enqueueBotEvent } from './events'
import { RateLimiter } from './rate-limit'

interface PendingCallback {
  botId: string
  resolve: (toast: string | null) => void
  timeout: Timer
}

const rateLimiter = new RateLimiter(10, 1000)

export class CallbackRegistry {
  private readonly pending = new Map<string, PendingCallback>()

  async press(
    db: AppDatabase,
    hub: Hub,
    userId: string,
    chatId: string,
    messageId: string,
    data: string,
  ) {
    if (!rateLimiter.allow(userId)) throw new DomainError('RATE_LIMIT', 'Too many button presses')
    const current = getChatForUser(db, chatId, userId)
    if (current.chat.blockedAt !== null) throw new DomainError('BOT_BLOCKED', 'Bot is blocked')
    const message = db.select().from(messages).where(eq(messages.id, messageId)).get()
    const hasButton = message?.content.buttons
      ?.flat()
      .some((button) => 'callback' in button && button.callback === data)
    if (!message || message.chatId !== chatId || !hasButton) {
      throw new DomainError('NOT_FOUND', 'Callback button was not found')
    }
    const callbackId = Bun.randomUUIDv7()
    const result = new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => {
        const pending = this.pending.get(callbackId)
        if (!pending) return
        this.pending.delete(callbackId)
        pending.resolve(null)
      }, 10_000)
      this.pending.set(callbackId, { botId: current.bot.id, resolve, timeout })
    })
    enqueueBotEvent(
      db,
      {
        botId: current.bot.id,
        chatId,
        event: {
          type: 'callback',
          chat: toChatRef(current.chat, current.bot),
          user: toUserRef(current.user),
          messageId,
          data,
          callbackId,
        },
      },
      hub,
    )
    return { toast: await result }
  }

  cancelAll() {
    rateLimiter.reset()
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout)
      pending.resolve(null)
    }
    this.pending.clear()
  }

  answer(callbackId: string, botId: string, toast?: string) {
    const pending = this.pending.get(callbackId)
    if (!pending || pending.botId !== botId) {
      throw new DomainError('NOT_FOUND', 'Callback was not found')
    }
    this.pending.delete(callbackId)
    clearTimeout(pending.timeout)
    pending.resolve(toast ?? null)
    return { ok: true } as const
  }
}
