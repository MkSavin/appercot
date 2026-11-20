import type { BotEvent, Message, MessageContent } from '@appercot/protocol'
import type { BotApi } from './api.js'
import type { CommandDefinition } from './command.js'
import type { SendFileOptions, UploadSource } from './media.js'
import { BotStorage } from './storage.js'

export class Context {
  readonly user: BotEvent['user']
  readonly chat: BotEvent['chat']
  readonly roles: string[]
  readonly role: string | null
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
    this.role = this.roles[0] ?? null
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
  replyWithFile(file: UploadSource, options?: SendFileOptions) {
    return this.api.sendFile(this.chat.id, file, options)
  }

  replyWithCommand(commands: CommandDefinition | readonly CommandDefinition[], template?: string) {
    const entries = Array.isArray(commands)
      ? (commands as readonly CommandDefinition[])
      : [commands as CommandDefinition]
    if (!entries.length) throw new Error('Provide at least one command')
    if (template === undefined)
      return this.reply(
        entries.map((command) => `/${command.name} — ${command.description}`).join('\n'),
      )
    const placeholders = template.match(/%s/g)?.length ?? 0
    if (placeholders !== entries.length) throw new Error('Provide one %s placeholder per command')
    const names = entries.map((command) => `/${command.name}`)
    return this.reply(template.replace(/%s/g, () => names.shift() ?? ''))
  }

  setRole(role: string | null) {
    return this.api.setChatRoles({ chatId: this.chat.id, roles: role ? [role] : [] })
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
