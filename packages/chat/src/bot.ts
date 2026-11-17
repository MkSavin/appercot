import type { BotCommand, BotEvent, BotEventType, Params } from '@appercot/protocol'
import { BotApi } from './api'
import { BotConnection } from './connection'
import { Context } from './context'

interface CreateBotOptions {
  url: string
  token: string
  ackOnError?: boolean
}

interface StartOptions {
  roles?: string[]
  defaultRoles?: string[]
  listed?: boolean
  access?: 'public' | 'by_link'
  commands?: BotCommand[]
}

interface CommandOptions {
  roles?: string[]
}

export type ContextListener = (context: Context) => unknown

export class Bot {
  readonly api: BotApi
  private readonly connection: BotConnection
  private readonly listeners = new Map<BotEventType, Set<ContextListener>>()
  private readonly commands = new Map<string, ContextListener>()
  private readonly chatChains = new Map<string, Promise<void>>()

  constructor(options: CreateBotOptions) {
    this.connection = new BotConnection({
      url: options.url,
      token: options.token,
      ackOnError: options.ackOnError ?? true,
      onEvent: (event) => this.enqueue(event),
    })
    this.api = new BotApi(this.connection)
  }

  on(type: BotEventType, listener: ContextListener) {
    const handlers = this.listeners.get(type) ?? new Set<ContextListener>()
    handlers.add(listener)
    this.listeners.set(type, handlers)
    return this
  }

  command(name: string, listener: ContextListener): this
  command(name: string, options: CommandOptions, listener: ContextListener): this
  command(
    name: string,
    optionsOrListener: CommandOptions | ContextListener,
    listener?: ContextListener,
  ) {
    const handler = typeof optionsOrListener === 'function' ? optionsOrListener : listener
    if (!handler) throw new Error('Command listener is required')
    this.commands.set(name, handler)
    return this
  }

  async start(options: StartOptions = {}) {
    await this.connection.start()
    if (options.roles) {
      const roles: Params<'setRoles'> = { roles: options.roles }
      if (options.defaultRoles) roles.defaultRoles = options.defaultRoles
      if (options.listed !== undefined) roles.listed = options.listed
      if (options.access) roles.access = options.access
      await this.api.setRoles(roles)
    }
    if (options.commands) await this.api.setCommands({ commands: options.commands })
  }

  stop() {
    this.connection.stop()
  }

  private enqueue(event: BotEvent) {
    const previous = this.chatChains.get(event.chat.id) ?? Promise.resolve()
    const current = previous.catch(() => {}).then(() => this.dispatch(event))
    this.chatChains.set(event.chat.id, current)
    return current.finally(() => {
      if (this.chatChains.get(event.chat.id) === current) this.chatChains.delete(event.chat.id)
    })
  }

  private async dispatch(event: BotEvent) {
    const context = new Context(event, this.api)
    if (event.type === 'command') {
      const command = this.commands.get(event.name)
      if (command) {
        await command(context)
        return
      }
    }
    for (const listener of this.listeners.get(event.type) ?? []) await listener(context)
  }
}

export const createBot = (options: CreateBotOptions) => new Bot(options)
