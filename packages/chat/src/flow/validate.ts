import type { FlowBuilder, FlowScreenDefinition } from './builder'

const validateId = (id: string, kind: string) => {
  if (!id || id.length > 24 || id.includes(':') || id.includes('/')) {
    throw new Error(`Invalid ${kind} id: ${id}`)
  }
}

export const resolveScreenTarget = <State>(screen: FlowScreenDefinition<State>, target: string) => {
  if (target.startsWith('/')) return target.slice(1)
  return screen.group ? `${screen.group}/${target}` : target
}

export const resolveGroupTarget = <State>(
  flow: FlowBuilder<State>,
  screen: FlowScreenDefinition<State>,
  target: string,
) => {
  const group = target.startsWith('/')
    ? target.slice(1)
    : screen.group
      ? `${screen.group}/${target}`
      : target
  const first = [...flow.screens.keys()].find((id) => id.startsWith(`${group}/`))
  if (!first) throw new Error(`Group ${group} has no screens`)
  return first
}

const hasExit = <State>(screen: FlowScreenDefinition<State>) =>
  Boolean(screen.input?.target) ||
  screen.actions.some((action) => action.target || action.enter || action.effect || action.behavior)

export const validateFlow = <State>(flow: FlowBuilder<State>) => {
  validateId(flow.id, 'flow')
  if (!flow.startScreen || !flow.screens.has(flow.startScreen)) {
    throw new Error(`Start screen ${flow.startScreen ?? ''} does not exist`)
  }
  for (const screen of flow.screens.values()) {
    for (const part of screen.id.split('/')) validateId(part, 'screen')
    if (!screen.text) throw new Error(`Screen ${screen.id} has no text`)
    if (!hasExit(screen)) throw new Error(`Screen ${screen.id} has no exit`)
    if (screen.input?.target) {
      const target = resolveScreenTarget(screen, screen.input.target)
      if (!flow.screens.has(target)) throw new Error(`Screen target ${target} does not exist`)
    }
    for (const action of screen.actions) {
      const target = action.target
        ? resolveScreenTarget(screen, action.target)
        : action.enter
          ? resolveGroupTarget(flow, screen, action.enter)
          : undefined
      if (target && !flow.screens.has(target)) {
        throw new Error(`Screen target ${target} does not exist`)
      }
      const callback = `f:${flow.id}:${screen.id}:${screen.actions.indexOf(action)}:${Number.MAX_SAFE_INTEGER}`
      if (new TextEncoder().encode(callback).length > 256) {
        throw new Error(`Callback data for ${screen.id} is too long`)
      }
    }
  }
}
