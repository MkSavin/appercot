import '../src/shared/config/i18n'
import { expect, test } from 'bun:test'
import {
  buildPaletteEntries,
  explicitButtonShortcuts,
  type PaletteButton,
} from '../src/features/command-menu'
import {
  ariaShortcut,
  displayShortcut,
  MetaKey,
  matchesShortcut,
  Shortcut,
  type ShortcutCombination,
} from '../src/shared/lib/shortcuts'

test('declares static shortcuts as arrays with const meta keys', () => {
  expect(Shortcut.CommandPalette).toEqual([MetaKey.Mod, '/'])
  expect(Shortcut.Search).toEqual([MetaKey.Mod, 'K'])
  expect(Shortcut.MessageSearch).toEqual([MetaKey.Mod, MetaKey.Shift, 'F'])
  expect(MetaKey.Mod).toBe('Mod')
  expect(MetaKey.Meta).toBe('Meta')
  expect(MetaKey.Control).toBe('Ctrl')
  expect(ariaShortcut(Shortcut.Search)).toBe('Control+K Meta+K')
  expect(ariaShortcut(Shortcut.MessageSearch)).toBe('Control+Shift+F Meta+Shift+F')
})

test('uses Cmd on Apple platforms and Ctrl elsewhere for the command palette', () => {
  const original = navigator.platform
  try {
    Object.defineProperty(navigator, 'platform', { configurable: true, value: 'MacIntel' })
    expect(displayShortcut(Shortcut.CommandPalette)).toBe('⌘/')
    expect(
      matchesShortcut(
        keyboardEvent({ key: '/', code: 'Slash', metaKey: true }),
        Shortcut.CommandPalette,
      ),
    ).toBe(true)
    expect(
      matchesShortcut(
        keyboardEvent({ key: '/', code: 'Slash', ctrlKey: true }),
        Shortcut.CommandPalette,
      ),
    ).toBe(false)
  } finally {
    Object.defineProperty(navigator, 'platform', { configurable: true, value: original })
  }
})

// @anchor INV:command-palette/scopes-shortcuts
test('keeps declared shortcuts on the active buttons and resolves conflicts in the palette', () => {
  const commands = [{ name: 'help', description: 'Help', shortcut: 'Alt+H' }]
  const buttons: PaletteButton[] = [
    { key: 'message-1:0:0', button: { text: 'Help', command: '/help', shortcut: 'Alt+H' } },
    { key: 'message-1:0:1', button: { text: 'Next', callback: 'next', shortcut: 'Alt+N' } },
    { key: 'message-1:1:0', button: { text: 'More', callback: 'more' } },
  ]
  const entries = buildPaletteEntries(commands, buttons)
  expect(new Set(entries.map(({ shortcut }) => shortcut && displayShortcut(shortcut))).size).toBe(4)
  expect(entries.at(0)?.shortcut).toEqual([MetaKey.Alt, 'H'])
  expect(entries.at(0)?.selector).toBe('command-palette.command.help')
  expect(entries.at(1)?.selector).toBe('command-palette.button.message-1:0:0')
  expect(explicitButtonShortcuts(commands, buttons)).toEqual({
    'message-1:0:1': [MetaKey.Alt, 'N'],
  })
  expect(explicitButtonShortcuts(commands, [])).toEqual({})
})

const keyboardEvent = ({
  key,
  code = '',
  ctrlKey = false,
  altKey = false,
  shiftKey = false,
  metaKey = false,
  repeat = false,
  isComposing = false,
  numLock = false,
  altGraph = false,
}: {
  key: string
  code?: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  repeat?: boolean
  isComposing?: boolean
  numLock?: boolean
  altGraph?: boolean
}) =>
  ({
    key,
    code,
    ctrlKey,
    altKey,
    shiftKey,
    metaKey,
    repeat,
    isComposing,
    getModifierState: (modifier: string) =>
      modifier === 'NumLock' ? numLock : modifier === 'AltGraph' ? altGraph : false,
  }) as KeyboardEvent

const matches = (event: KeyboardEvent, shortcut: ShortcutCombination) =>
  matchesShortcut(event, shortcut)

const commandPaletteEvent = (key: string, code = '') => {
  const apple = /Mac|iPhone|iPad/.test(navigator.platform)
  return keyboardEvent({ key, code, ctrlKey: !apple, metaKey: apple })
}

test('matches logical shortcut keys by physical code in other layouts', () => {
  expect(matches(commandPaletteEvent('.', 'Slash'), Shortcut.CommandPalette)).toBe(true)
  expect(matches(commandPaletteEvent('/', 'Slash'), Shortcut.CommandPalette)).toBe(true)
  expect(
    matches(keyboardEvent({ key: 'ы', code: 'KeyS', ctrlKey: true }), [MetaKey.Control, 'S']),
  ).toBe(true)
  expect(
    matches(
      keyboardEvent({
        key: 'а',
        code: 'KeyF',
        ctrlKey: !/Mac|iPhone|iPad/.test(navigator.platform),
        metaKey: /Mac|iPhone|iPad/.test(navigator.platform),
        shiftKey: true,
      }),
      Shortcut.MessageSearch,
    ),
  ).toBe(true)
  expect(matches(commandPaletteEvent('/', 'NumpadDivide'), Shortcut.CommandPalette)).toBe(true)
})

test('gives recognized physical codes priority over conflicting logical keys', () => {
  const event = keyboardEvent({ key: 's', code: 'KeyA', ctrlKey: true })
  expect(matches(event, [MetaKey.Control, 'S'])).toBe(false)
  expect(matches(event, [MetaKey.Control, 'A'])).toBe(true)
})

test('falls back to logical keys only for unrecognized physical codes', () => {
  expect(
    matches(keyboardEvent({ key: 's', code: 'Unidentified', ctrlKey: true }), [
      MetaKey.Control,
      'S',
    ]),
  ).toBe(true)
  expect(matches(commandPaletteEvent('/'), Shortcut.CommandPalette)).toBe(true)
})

test('matches numpad digits only while Num Lock is enabled', () => {
  const shortcut: ShortcutCombination = [MetaKey.Control, '1']
  expect(
    matches(keyboardEvent({ key: '1', code: 'Numpad1', ctrlKey: true, numLock: true }), shortcut),
  ).toBe(true)
  expect(matches(keyboardEvent({ key: 'End', code: 'Numpad1', ctrlKey: true }), shortcut)).toBe(
    false,
  )
  expect(matches(keyboardEvent({ key: '1', code: 'Numpad1', ctrlKey: true }), shortcut)).toBe(false)
  expect(matches(keyboardEvent({ key: '1', code: 'Digit1', ctrlKey: true }), shortcut)).toBe(true)
})

test('keeps modifier, repeat, composition and AltGraph guards with code aliases', () => {
  const shortcut: ShortcutCombination = [MetaKey.Control, 'S']
  expect(matches(keyboardEvent({ key: 'ы', code: 'KeyS' }), shortcut)).toBe(false)
  expect(
    matches(keyboardEvent({ key: 'ы', code: 'KeyS', ctrlKey: true, shiftKey: true }), shortcut),
  ).toBe(false)
  expect(
    matches(keyboardEvent({ key: 'ы', code: 'KeyS', ctrlKey: true, repeat: true }), shortcut),
  ).toBe(false)
  expect(
    matches(keyboardEvent({ key: 'ы', code: 'KeyS', ctrlKey: true, isComposing: true }), shortcut),
  ).toBe(false)
  expect(
    matches(keyboardEvent({ key: 'ы', code: 'KeyS', ctrlKey: true, altGraph: true }), shortcut),
  ).toBe(false)
})
