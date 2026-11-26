import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

export const Kbd = ({ className, ...props }: ComponentProps<'kbd'>) => (
  <kbd
    data-slot="kbd"
    className={cn(
      'inline-flex h-5 shrink-0 items-center justify-center whitespace-nowrap rounded border bg-muted px-1.5 font-sans text-[10px] font-medium text-secondary-foreground',
      className,
    )}
    {...props}
  />
)
