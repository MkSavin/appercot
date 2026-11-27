import { Command } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'
import { applePlatform, MetaKey, type ShortcutCombination } from '@/shared/lib/shortcuts'
import { Kbd } from './kbd'

export const ShortcutKbd = ({
  shortcut,
  className,
  ...props
}: ComponentProps<'span'> & { shortcut: ShortcutCombination }) => (
  <span className={cn('inline-flex shrink-0 items-center gap-1', className)} {...props}>
    {[...new Set(shortcut)].map((part) => {
      const command = part === MetaKey.Meta || (part === MetaKey.Mod && applePlatform())
      return (
        <Kbd key={part} className="min-w-5 gap-1 px-1">
          {command ? <Command aria-hidden="true" className="size-2.5" /> : part}
        </Kbd>
      )
    })}
  </span>
)
