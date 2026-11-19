const applePlatform = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export const displayShortcut = (shortcut: string) =>
  shortcut.replace('Mod+', applePlatform() ? '⌘' : 'Ctrl+').replace('Meta+', '⌘')

export const matchesShortcut = (event: KeyboardEvent, shortcut: string) => {
  if (event.repeat || event.isComposing || event.getModifierState('AltGraph')) return false
  const parts = shortcut.split('+')
  const key = parts.pop()
  const mod = parts.includes('Mod')
  const meta = parts.includes('Meta') || (mod && applePlatform())
  const ctrl = parts.includes('Ctrl') || (mod && !applePlatform())
  return (
    (event.key.toUpperCase() === key ||
      event.code === `Digit${key}` ||
      event.code === `Key${key}`) &&
    event.metaKey === meta &&
    event.ctrlKey === ctrl &&
    event.altKey === parts.includes('Alt') &&
    event.shiftKey === parts.includes('Shift')
  )
}
