import {
  allowsBotAction,
  type BotCommand,
  type BotEvent,
  type BotEventType,
  type BotRole,
  type Params,
} from '@appercot/protocol'
import { BotApi } from './api'
import { CommandDefinition } from './command'
import { BotConnection } from './connection'
import { Context } from './context'
import { FlowBuilder } from './flow/builder'
import type { UploadOptions, UploadSource } from './media'

type CallbackEvent = Extract<BotEvent, { type: 'callback' }>

interface CreateBotOptions {
  url: string
  token: string
  ackOnError?: boolean
}

interface StartOptions {
  roles?: Array<BotRole | string>
  defaultRoles?: string[]
  listed?: boolean
  access?: 'public' | 'by_link'
  commands?: Array<BotCommand | CommandDefinition>
}

interface CommandOptions {
  roles?: string[]
}

interface RegisteredFlow {
  validate: () => void
  clear: (context: Context) => Promise<void>
  handleMessage: (context: Context, text: string) => Promise<boolean>
  handleCallback: (context: Context, event: CallbackEvent) => Promise<void>
}

export type ContextListener = (context: Context) => unknown

/** @anchor DOC:sdk */
export class Bot {
  readonly api: BotApi
  private readonly connection: BotConnection
  private readonly listeners = new Map<BotEventType, Set<ContextListener>>()
  private readonly handlers = new Map<
    string,
    { handler: ContextListener; roles?: string[]; definition?: CommandDefinition }
  >()
  private published?: Array<BotCommand | CommandDefinition>
  private configure?: () => Promise<unknown>
  private appliedConfiguration?: () => Promise<unknown>
  private readonly flows = new Map<string, RegisteredFlow>()
  private readonly chatChains = new Map<string, Promise<void>>()

  constructor(options: CreateBotOptions) {
    this.connection = new BotConnection({
      url: options.url,
      token: options.token,
      ackOnError: options.ackOnError ?? true,
      onEvent: (event) => this.enqueue(event),
      configuresOnHello: () => this.configure !== undefined,
      onHello: async () => {
        this.appliedConfiguration = undefined
        await this.applyConfiguration()
      },
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
  command(name: string, description: string, listener: ContextListener): CommandDefinition
  command(name: string, options: CommandOptions, listener: ContextListener): this
  command(
    name: string,
    optionsOrListener: string | CommandOptions | ContextListener,
    listener?: ContextListener,
  ) {
    const handler = typeof optionsOrListener === 'function' ? optionsOrListener : listener
    if (!handler) throw new Error('Command listener is required')
    if (typeof optionsOrListener === 'string') {
      const definition = new CommandDefinition(name, optionsOrListener)
      this.handlers.set(name, { handler, definition })
      return definition
    }
    this.handlers.set(name, {
      handler,
      roles: typeof optionsOrListener === 'function' ? undefined : optionsOrListener.roles,
    })
    return this
  }

  commands(commands: Array<BotCommand | CommandDefinition>) {
    this.published = commands
    return this
  }

  flow<State = Record<string, unknown>>(id: string) {
    if (this.flows.has(id)) throw new Error(`Flow ${id} already exists`)
    const flow = new FlowBuilder<State>(id)
    this.flows.set(id, flow)
    return flow
  }

  async start(options: StartOptions = {}) {
    for (const flow of this.flows.values()) flow.validate()
    const definitions = [...this.handlers.values()].flatMap(({ definition }) =>
      definition ? [definition] : [],
    )
    const configured =
      options.commands ?? this.published ?? (definitions.length ? definitions : undefined)
    const commands = configured?.map((item) => {
      const command = item instanceof CommandDefinition ? item.toJSON() : item
      return { ...command, roles: this.handlers.get(command.name)?.roles ?? command.roles }
    })
    if (options.roles) {
      const roles: Params<'setRoles'> = { roles: options.roles }
      if (options.defaultRoles) roles.defaultRoles = options.defaultRoles
      if (options.listed !== undefined) roles.listed = options.listed
      if (options.access) roles.access = options.access
      this.configure = () => this.api.setRoles({ ...roles, commands })
    } else if (commands) {
      this.configure = () => this.api.setCommands({ commands })
    } else {
      this.configure = undefined
    }
    await this.connection.start()
    await this.applyConfiguration()
  }

  private async applyConfiguration() {
    const configure = this.configure
    if (!configure || configure === this.appliedConfiguration) return
    await configure()
    this.appliedConfiguration = configure
  }

  uploadFile(chatId: string, file: UploadSource, options?: UploadOptions) {
    return this.api.uploadFile(chatId, file, options)
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
    const command = event.type === 'command' ? this.handlers.get(event.name) : undefined
    if (
      command &&
      !allowsBotAction(command.definition?.toJSON().roles ?? command.roles, context.roles)
    )
      return
    if (event.type === 'command' || event.type === 'chat_cleared') {
      for (const flow of this.flows.values()) await flow.clear(context)
    }
    if (event.type === 'callback' && event.data.startsWith('f:')) {
      const flow = this.flows.get(event.data.split(':')[1] ?? '')
      if (flow) {
        await flow.handleCallback(context, event)
        return
      }
    }
    if (event.type === 'message') {
      for (const flow of this.flows.values()) {
        if (await flow.handleMessage(context, event.message.content.text ?? '')) return
      }
    }
    if (command) {
      await command.handler(context)
      return
    }
    for (const listener of this.listeners.get(event.type) ?? []) await listener(context)
  }
}

export const createBot = (options: CreateBotOptions) => new Bot(options)
