import { describe, expect, test } from 'bun:test'
import {
  type ButtonActionDependencies,
  runButtonAction,
} from '../src/widgets/chat-view/model/button-actions'

const dependencies = (): ButtonActionDependencies & {
  opened: string[]
  commands: string[]
  notices: string[]
} => {
  const opened: string[] = []
  const commands: string[] = []
  const notices: string[] = []
  return {
    opened,
    commands,
    notices,
    pressCallback: async () => ({ toast: 'Счётчик: 3' }),
    sendCommand: async (command) => {
      commands.push(command)
    },
    confirmUrl: async () => true,
    openUrl: (url) => opened.push(url),
    notify: (message) => notices.push(message),
  }
}

describe('message button actions', () => {
  test('waits for callback answer and shows its toast', async () => {
    const deps = dependencies()
    await runButtonAction({ text: 'Count', callback: 'count' }, deps)
    expect(deps.notices).toEqual(['Счётчик: 3'])
  })

  test('uses the normal send path for command buttons', async () => {
    const deps = dependencies()
    await runButtonAction({ text: 'Help', command: '/help' }, deps)
    expect(deps.commands).toEqual(['/help'])
  })

  test('opens a URL only after confirmation', async () => {
    const deps = dependencies()
    await runButtonAction({ text: 'Site', url: 'https://example.test/docs' }, deps)
    expect(deps.opened).toEqual(['https://example.test/docs'])

    const cancelled = { ...deps, confirmUrl: async () => false }
    await runButtonAction({ text: 'Site', url: 'https://example.test/private' }, cancelled)
    expect(cancelled.opened).toEqual(['https://example.test/docs'])
  })
})
