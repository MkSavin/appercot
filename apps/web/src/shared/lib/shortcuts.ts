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
  CommandPalette: [MetaKey.Mod, '/'],
  Search: [MetaKey.Mod, 'K'],
  MessageSearch: [MetaKey.Mod, MetaKey.Shift, 'F'],
} as const satisfies Record<string, ShortcutCombination>

export const applePlatform = () =>
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

const matchesPhysicalKey = (event: KeyboardEvent, key: string) => {
  const normalized = key.toUpperCase()
  if (event.code === 'Slash' || event.code === 'NumpadDivide') return normalized === '/'
  const letter = /^Key([A-Z])$/.exec(event.code)
  if (letter) return normalized === letter[1]
  const digit = /^Digit([0-9])$/.exec(event.code)
  if (digit) return normalized === digit[1]
  const numpad = /^Numpad([0-9])$/.exec(event.code)
  if (numpad) return event.getModifierState('NumLock') && normalized === numpad[1]
  return undefined
}

export const matchesShortcut = (event: KeyboardEvent, shortcut: ShortcutCombination) => {
  if (event.repeat || event.isComposing || event.getModifierState('AltGraph')) return false
  const key = shortcut.at(-1)
  const modifiers = shortcut.slice(0, -1)
  const mod = modifiers.includes(MetaKey.Mod)
  const meta = modifiers.includes(MetaKey.Meta) || (mod && applePlatform())
  const ctrl = modifiers.includes(MetaKey.Control) || (mod && !applePlatform())
  const physicalMatch = key === undefined ? false : matchesPhysicalKey(event, key)
  const keyMatches =
    physicalMatch ?? (key !== undefined && event.key.toUpperCase() === key.toUpperCase())
  return (
    keyMatches &&
    event.metaKey === meta &&
    event.ctrlKey === ctrl &&
    event.altKey === modifiers.includes(MetaKey.Alt) &&
    event.shiftKey === modifiers.includes(MetaKey.Shift)
  )
}
