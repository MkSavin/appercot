import { type BotEvent, JsonValueSchema, type MessageContent } from '@appercot/protocol'
import type { Context } from '../context.js'
import type { FlowActionContext, FlowBuilder } from './builder.js'
import { resolveGroupTarget, resolveScreenTarget } from './validate.js'

type CallbackEvent = Extract<BotEvent, { type: 'callback' }>

interface FlowSession<State> {
  screenId: string
  state: State
  version: number
  history: string[]
  messageId?: string
}

export class FlowRuntime<State> {
  private readonly storageKey: string

  constructor(private readonly flow: FlowBuilder<State>) {
    this.storageKey = `__flow :${flow.id}`
  }

  async start(context: Context) {
    this.flow.validate()
    const screenId = this.flow.startScreen
    if (!screenId) throw new Error('Flow start screen is required')
    const session: FlowSession<State> = {
      screenId,
      state: this.flow.stateFactory(),
      version: 0,
      history: [],
    }
    const content = this.render(session)
    const result = await context.api.sendMessage({ chatId: context.chat.id, content })
    session.messageId = result.id
    await this.save(context, session)
  }

  async clear(context: Context) {
    await context.storage.delete(this.storageKey)
  }

  async handleMessage(context: Context, text: string) {
    const session = await this.read(context)
    if (!session) return false
    const screen = this.flow.screens.get(session.screenId)
    if (!screen?.input) return false
    const error = await screen.input.handler(session.state, text)
    if (context.message?.sender === 'user' && text.trim()) {
      await context.delete(context.message.id)
    }
    if (typeof error === 'string') {
      await context.api.sendMessage({ chatId: context.chat.id, content: { text: error } })
      return true
    }
    if (screen.input.target) {
      const target = resolveScreenTarget(screen, screen.input.target)
      await this.transition(context, session, target)
    } else {
      await this.save(context, session)
    }
    return true
  }

  async handleCallback(context: Context, event: CallbackEvent) {
    const session = await this.read(context)
    if (!session) {
      await context.api.answerCallback({ callbackId: event.callbackId, toast: 'Устаревшая кнопка' })
      return
    }
    const parts = event.data.split(':')
    const screenId = parts[2]
    const actionIndex = Number(parts[3])
    const version = Number(parts[4])
    const screen = this.flow.screens.get(session.screenId)
    const action = screen?.actions[actionIndex]
    if (
      !screen ||
      !action ||
      screenId !== session.screenId ||
      version !== session.version ||
      (session.messageId && event.messageId !== session.messageId)
    ) {
      await context.api.answerCallback({ callbackId: event.callbackId, toast: 'Устаревшая кнопка' })
      return
    }
    await context.api.answerCallback({ callbackId: event.callbackId })
    action.mutate?.(session.state)
    if (action.behavior === 'cancel') {
      await this.finish(context, session)
      return
    }
    if (action.behavior === 'back') {
      const target = session.history.pop()
      if (target) await this.transition(context, session, target, false)
      else await this.finish(context, session)
      return
    }
    const directive = await action.effect?.(session.state, this.actionContext())
    if (directive?.type === 'finish') {
      await this.finish(context, session, directive.content)
      return
    }
    const target =
      directive?.type === 'transition'
        ? directive.target
        : action.target
          ? action.target
          : action.enter
            ? action.enter
            : undefined
    if (target) {
      const resolved =
        directive?.type === 'transition' || action.target
          ? resolveScreenTarget(screen, target)
          : resolveGroupTarget(this.flow, screen, target)
      await this.transition(context, session, resolved)
      return
    }
    await this.save(context, session)
  }

  private actionContext(): FlowActionContext {
    return {
      finish: (content) => ({ type: 'finish', content }),
      to: (target) => ({ type: 'transition', target }),
    }
  }

  private async read(context: Context) {
    const session = await context.storage.get<FlowSession<State>>(this.storageKey)
    if (!session || !this.flow.screens.has(session.screenId)) return undefined
    return session
  }

  private async save(context: Context, session: FlowSession<State>) {
    await context.storage.set(this.storageKey, JsonValueSchema.parse(session))
  }

  private render(session: FlowSession<State>): MessageContent {
    const screen = this.flow.screens.get(session.screenId)
    if (!screen?.text) throw new Error(`Screen ${session.screenId} is invalid`)
    return {
      text: typeof screen.text === 'string' ? screen.text : screen.text(session.state),
      ...(screen.actions.length > 0
        ? {
            buttons: [
              screen.actions.map((action, index) => ({
                text: action.text,
                callback: `f:${this.flow.id}:${session.screenId}:${index}:${session.version}`,
              })),
            ],
          }
        : {}),
    }
  }

  private async transition(
    context: Context,
    session: FlowSession<State>,
    target: string,
    remember = true,
  ) {
    if (!this.flow.screens.has(target)) throw new Error(`Screen ${target} does not exist`)
    if (remember) session.history.push(session.screenId)
    session.screenId = target
    session.version += 1
    const content = this.render(session)
    if (session.messageId) {
      await context.api.editMessage({
        chatId: context.chat.id,
        messageId: session.messageId,
        content,
      })
    } else {
      const result = await context.api.sendMessage({ chatId: context.chat.id, content })
      session.messageId = result.id
    }
    await this.save(context, session)
  }

  private async finish(
    context: Context,
    session: FlowSession<State>,
    content?: string | MessageContent,
  ) {
    if (session.messageId) {
      if (content === undefined) {
        await context.api.deleteMessage({ chatId: context.chat.id, messageId: session.messageId })
      } else {
        const finalContent: MessageContent =
          typeof content === 'string'
            ? { text: content }
            : { text: content.text, media: content.media }
        await context.api.editMessage({
          chatId: context.chat.id,
          messageId: session.messageId,
          content: finalContent,
        })
      }
    }
    await this.clear(context)
  }
}
