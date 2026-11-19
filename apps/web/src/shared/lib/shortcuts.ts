export const MetaKey = {
  Mod: 'Mod',
  Meta: 'Meta',
  Control: 'Ctrl',
  Alt: 'Alt',
  Shift: 'Shift',
} as const

export type MetaKey = (typeof MetaKey)[keyof typeof MetaKey]
export type ShortcutKey = MetaKey | string
export type ShortcutCombination = readonly ShortcutKey[]

export const Shortcut = {
  CommandPalette: [MetaKey.Control, '/'],
  Search: [MetaKey.Mod, 'K'],
} as const satisfies Record<string, ShortcutCombination>

const applePlatform = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export const parseShortcut = (shortcut: string): ShortcutKey[] => shortcut.split('+')

export const displayShortcut = (shortcut: ShortcutCombination) =>
  shortcut
    .map((part, index) => {
      const modifier = index < shortcut.length - 1
      if (part === MetaKey.Mod) return applePlatform() ? '⌘' : modifier ? 'Ctrl+' : 'Ctrl'
      if (part === MetaKey.Meta) return '⌘'
      return modifier ? `${part}+` : part
    })
    .join('')

const ariaCombination = (shortcut: ShortcutCombination, mod: 'Control' | 'Meta') =>
  shortcut.map((part) => (part === MetaKey.Mod ? mod : part)).join('+')

export const ariaShortcut = (shortcut: ShortcutCombination) =>
  shortcut.includes(MetaKey.Mod)
    ? `${ariaCombination(shortcut, 'Control')} ${ariaCombination(shortcut, 'Meta')}`
    : ariaCombination(shortcut, 'Meta')

export const matchesShortcut = (event: KeyboardEvent, shortcut: ShortcutCombination) => {
  if (event.repeat || event.isComposing || event.getModifierState('AltGraph')) return false
  const key = shortcut.at(-1)
  const modifiers = shortcut.slice(0, -1)
  const mod = modifiers.includes(MetaKey.Mod)
  const meta = modifiers.includes(MetaKey.Meta) || (mod && applePlatform())
  const ctrl = modifiers.includes(MetaKey.Control) || (mod && !applePlatform())
  return (
    (event.key.toUpperCase() === key?.toUpperCase() ||
      event.code === `Digit${key}` ||
      event.code === `Key${key}`) &&
    event.metaKey === meta &&
    event.ctrlKey === ctrl &&
    event.altKey === modifiers.includes(MetaKey.Alt) &&
    event.shiftKey === modifiers.includes(MetaKey.Shift)
  )
}
