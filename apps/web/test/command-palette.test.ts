import '../src/shared/config/i18n'
import { expect, test } from 'bun:test'
import {
  buildPaletteEntries,
  explicitButtonShortcuts,
  type PaletteButton,
} from '../src/features/command-menu'
import { ariaShortcut, displayShortcut, MetaKey, Shortcut } from '../src/shared/lib/shortcuts'

test('declares static shortcuts as arrays with const meta keys', () => {
  expect(Shortcut.CommandPalette).toEqual([MetaKey.Control, '/'])
  expect(Shortcut.Search).toEqual([MetaKey.Mod, 'K'])
  expect(MetaKey.Mod).toBe('Mod')
  expect(MetaKey.Meta).toBe('Meta')
  expect(MetaKey.Control).toBe('Ctrl')
  expect(ariaShortcut(Shortcut.Search)).toBe('Control+K Meta+K')
})

// @anchor INV:command-palette/scopes-shortcuts
test('keeps declared shortcuts on the active buttons and resolves conflicts in the palette', () => {
  const commands = [{ name: 'help', description: 'Help', shortcut: 'Alt+H' }]
  const buttons: PaletteButton[] = [
    { key: 'first', button: { text: 'Help', command: '/help', shortcut: 'Alt+H' } },
    { key: 'second', button: { text: 'Next', callback: 'next', shortcut: 'Alt+N' } },
    { key: 'third', button: { text: 'More', callback: 'more' } },
  ]
  const entries = buildPaletteEntries(commands, buttons)
  expect(new Set(entries.map(({ shortcut }) => shortcut && displayShortcut(shortcut))).size).toBe(4)
  expect(entries.at(0)?.shortcut).toEqual([MetaKey.Alt, 'H'])
  expect(explicitButtonShortcuts(commands, buttons)).toEqual({ second: [MetaKey.Alt, 'N'] })
  expect(explicitButtonShortcuts(commands, [])).toEqual({})
})
