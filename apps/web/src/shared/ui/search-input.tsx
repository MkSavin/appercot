import { Search } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useEffect, useRef } from 'react'
import {
  ariaShortcut,
  matchesShortcut,
  Shortcut,
  type ShortcutCombination,
} from '@/shared/lib/shortcuts'
import { InputGroup, InputGroupAddon, InputGroupInput } from './input-group'
import { ShortcutKbd } from './shortcut-kbd'

export const SearchInput = ({
  shortcut = Shortcut.Search,
  ...props
}: Omit<ComponentProps<typeof InputGroupInput>, 'type' | 'ref'> & {
  shortcut?: ShortcutCombination
}) => {
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const focus = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        !matchesShortcut(event, shortcut) ||
        !input.current?.getClientRects().length
      )
        return
      if (document.querySelector('[role="dialog"][data-state="open"]')) return
      event.preventDefault()
      input.current.focus()
      input.current.select()
    }
    window.addEventListener('keydown', focus)
    return () => window.removeEventListener('keydown', focus)
  }, [shortcut])
  return (
    <InputGroup>
      <InputGroupAddon>
        <Search aria-hidden="true" className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        ref={input}
        type="search"
        autoComplete="off"
        aria-keyshortcuts={ariaShortcut(shortcut)}
        {...props}
      />
      <ShortcutKbd aria-hidden="true" className="hidden sm:inline-flex" shortcut={shortcut} />
    </InputGroup>
  )
}
