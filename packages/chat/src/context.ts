import type { BotEvent, Message, MessageContent } from '@appercot/protocol'
import type { BotApi } from './api'
import { BotStorage } from './storage'

export class Context {
  readonly user: BotEvent['user']
  readonly chat: BotEvent['chat']
  readonly roles: string[]
  readonly text: string
  readonly message?: Message
  readonly storage: BotStorage

  constructor(
    private readonly event: BotEvent,
    readonly api: BotApi,
  ) {
    this.user = event.user
    this.chat = event.chat
    this.roles = event.chat.roles
    this.text =
      event.type === 'message' || event.type === 'command' ? (event.message.content.text ?? '') : ''
    this.message = event.type === 'message' || event.type === 'command' ? event.message : undefined
    this.storage = new BotStorage(api, event.chat.id)
  }

  reply(content: string | MessageContent) {
    return this.api.sendMessage({
      chatId: this.chat.id,
      content: typeof content === 'string' ? { text: content } : content,
    })
  }

  edit(messageId: string, content: string | MessageContent) {
    return this.api.editMessage({
      chatId: this.chat.id,
      messageId,
      content: typeof content === 'string' ? { text: content } : content,
    })
  }

  delete(messageId: string) {
    return this.api.deleteMessage({ chatId: this.chat.id, messageId })
  }

  answer(toast?: string) {
    if (this.event.type !== 'callback') throw new Error('answer is only available for callbacks')
    return this.api.answerCallback({ callbackId: this.event.callbackId, toast })
  }

  typing() {
    return this.api.sendTyping({ chatId: this.chat.id })
  }

  hasRole(role: string) {
    return this.roles.includes(role)
  }
}
