import { Search } from 'lucide-react'
import { type ComponentProps, useEffect, useRef } from 'react'
import { displayShortcut, matchesShortcut } from '@/shared/lib/shortcuts'
import { InputGroup, InputGroupAddon, InputGroupInput } from './input-group'
import { Kbd } from './kbd'

export const SearchInput = (
  props: Omit<ComponentProps<typeof InputGroupInput>, 'type' | 'ref'>,
) => {
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const focus = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        !matchesShortcut(event, 'Mod+K') ||
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
  }, [])
  return (
    <InputGroup>
      <InputGroupAddon>
        <Search aria-hidden="true" className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        ref={input}
        type="search"
        autoComplete="off"
        aria-keyshortcuts="Control+K Meta+K"
        {...props}
      />
      <Kbd aria-hidden="true" className="hidden sm:inline-flex">
        {displayShortcut('Mod+K')}
      </Kbd>
    </InputGroup>
  )
}
