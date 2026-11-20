import type { MessageContent } from '@appercot/protocol'
import type { Context } from '../context.js'
import { FlowRuntime } from './runtime.js'
import { validateFlow } from './validate.js'

export interface FlowDirective {
  type: 'finish' | 'transition'
  content?: string | MessageContent
  target?: string
}

export interface FlowActionContext {
  finish: (content?: string | MessageContent) => FlowDirective
  to: (screenId: string) => FlowDirective
}

export type FlowEffect<State> = (
  state: State,
  context: FlowActionContext,
) => void | FlowDirective | Promise<void> | Promise<FlowDirective>

export type FlowInput<State> = (
  state: State,
  text: string,
) => string | void | Promise<string> | Promise<void>

export interface FlowActionDefinition<State> {
  text: string
  mutate?: (state: State) => void
  target?: string
  enter?: string
  effect?: FlowEffect<State>
  behavior?: 'cancel' | 'back'
}

export interface FlowScreenDefinition<State> {
  id: string
  group: string
  text?: string | ((state: State) => string)
  input?: { handler: FlowInput<State>; target?: string }
  actions: FlowActionDefinition<State>[]
}

interface ScreenHost<State> {
  screen: (name: string, configure?: (screen: ScreenBuilder<State>) => void) => ScreenBuilder<State>
}

export class ScreenBuilder<State> {
  private selectedAction?: FlowActionDefinition<State>

  constructor(
    private readonly host: ScreenHost<State>,
    readonly definition: FlowScreenDefinition<State>,
  ) {}

  text(value: string | ((state: State) => string)) {
    this.definition.text = value
    return this
  }

  input(handler: FlowInput<State>) {
    this.definition.input = { handler }
    this.selectedAction = undefined
    return this
  }

  button(text: string, mutate?: (state: State) => void) {
    const action: FlowActionDefinition<State> = { text, mutate }
    this.definition.actions.push(action)
    this.selectedAction = action
    return this
  }

  to(screenId: string) {
    if (this.selectedAction) this.selectedAction.target = screenId
    else if (this.definition.input) this.definition.input.target = screenId
    else throw new Error('to() requires a button or input')
    return this
  }

  enter(groupId: string) {
    if (!this.selectedAction) throw new Error('enter() requires a button')
    this.selectedAction.enter = groupId
    return this
  }

  on(effect: FlowEffect<State>) {
    if (!this.selectedAction) throw new Error('on() requires a button')
    this.selectedAction.effect = effect
    return this
  }

  cancel() {
    if (!this.selectedAction) throw new Error('cancel() requires a button')
    this.selectedAction.behavior = 'cancel'
    return this
  }

  back() {
    if (!this.selectedAction) throw new Error('back() requires a button')
    this.selectedAction.behavior = 'back'
    return this
  }

  screen(name: string, configure?: (screen: ScreenBuilder<State>) => void) {
    return this.host.screen(name, configure)
  }
}

export class GroupBuilder<State> implements ScreenHost<State> {
  constructor(
    private readonly flow: FlowBuilder<State>,
    readonly id: string,
  ) {}

  screen(name: string, configure?: (screen: ScreenBuilder<State>) => void) {
    return this.flow.addScreen(name, this.id, configure)
  }

  group(name: string) {
    return new GroupBuilder(this.flow, `${this.id}/${name}`)
  }
}

export class FlowBuilder<State = Record<string, unknown>> implements ScreenHost<State> {
  readonly screens = new Map<string, FlowScreenDefinition<State>>()
  readonly runtime = new FlowRuntime(this)
  stateFactory: () => State = () => ({}) as State
  startScreen?: string

  constructor(readonly id: string) {}

  state<NextState>(factory: () => NextState): FlowBuilder<NextState> {
    this.stateFactory = factory as unknown as () => State
    return this as unknown as FlowBuilder<NextState>
  }

  start(screenId: string): this
  start(context: Context): Promise<void>
  start(value: string | Context) {
    if (typeof value === 'string') {
      this.startScreen = value
      return this
    }
    return this.runtime.start(value)
  }

  screen(name: string, configure?: (screen: ScreenBuilder<State>) => void) {
    return this.addScreen(name, '', configure)
  }

  group(name: string) {
    return new GroupBuilder(this, name)
  }

  addScreen(name: string, group: string, configure?: (screen: ScreenBuilder<State>) => void) {
    const id = group ? `${group}/${name}` : name
    if (this.screens.has(id)) throw new Error(`Screen ${id} already exists`)
    const definition: FlowScreenDefinition<State> = { id, group, actions: [] }
    const screen = new ScreenBuilder(this.screenHost(group), definition)
    this.screens.set(id, definition)
    configure?.(screen)
    return screen
  }

  handleMessage(context: Context, text: string) {
    return this.runtime.handleMessage(context, text)
  }

  handleCallback(context: Context, event: Parameters<FlowRuntime<State>['handleCallback']>[1]) {
    return this.runtime.handleCallback(context, event)
  }

  clear(context: Context) {
    return this.runtime.clear(context)
  }

  validate() {
    validateFlow(this)
  }

  private screenHost(group: string): ScreenHost<State> {
    return group ? new GroupBuilder(this, group) : this
  }
}
