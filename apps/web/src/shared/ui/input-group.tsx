import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'
import { Input } from './input'

export const InputGroup = ({ className, ...props }: ComponentProps<'div'>) => (
  <div
    data-slot="input-group"
    className={cn(
      'flex h-10 min-w-0 items-center gap-2 rounded-md border border-input bg-card px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30',
      className,
    )}
    {...props}
  />
)
export const InputGroupAddon = ({ className, ...props }: ComponentProps<'span'>) => (
  <span
    data-slot="input-group-addon"
    className={cn('flex shrink-0 items-center text-muted-foreground', className)}
    {...props}
  />
)
export const InputGroupInput = ({ className, ...props }: ComponentProps<typeof Input>) => (
  <Input
    data-slot="input-group-control"
    className={cn(
      'h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent',
      className,
    )}
    {...props}
  />
)
