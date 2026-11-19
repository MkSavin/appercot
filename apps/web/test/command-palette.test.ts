import { expect, test } from 'bun:test'
import {
  buildPaletteEntries,
  explicitButtonShortcuts,
  type PaletteButton,
} from '../src/features/command-menu'

// @anchor INV:command-palette/scopes-shortcuts
test('keeps declared shortcuts on the active buttons and resolves conflicts in the palette', () => {
  const commands = [{ name: 'help', description: 'Help', shortcut: 'Alt+H' }]
  const buttons: PaletteButton[] = [
    { key: 'first', button: { text: 'Help', command: '/help', shortcut: 'Alt+H' } },
    { key: 'second', button: { text: 'Next', callback: 'next', shortcut: 'Alt+N' } },
    { key: 'third', button: { text: 'More', callback: 'more' } },
  ]
  const entries = buildPaletteEntries(commands, buttons)
  expect(new Set(entries.map(({ shortcut }) => shortcut)).size).toBe(4)
  expect(entries.at(0)?.shortcut).toBe('Alt+H')
  expect(explicitButtonShortcuts(commands, buttons)).toEqual({ second: 'Alt+N' })
  expect(explicitButtonShortcuts(commands, [])).toEqual({})
})
