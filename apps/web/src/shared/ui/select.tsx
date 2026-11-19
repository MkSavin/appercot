import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Select as Primitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

export const Select = Primitive.Root
export const SelectValue = Primitive.Value
export const SelectGroup = Primitive.Group
export const SelectLabel = Primitive.Label
export const SelectTrigger = ({
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.Trigger>) => (
  <Primitive.Trigger
    data-slot="select-trigger"
    className={cn(
      'flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 [&_[data-slot=select-value]]:truncate',
      className,
    )}
    {...props}
  >
    <span data-slot="select-value" className="min-w-0">
      {children}
    </span>
    <Primitive.Icon asChild>
      <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    </Primitive.Icon>
  </Primitive.Trigger>
)
export const SelectContent = ({
  className,
  children,
  position = 'popper',
  sideOffset = 4,
  ...props
}: ComponentProps<typeof Primitive.Content>) => (
  <Primitive.Portal>
    <Primitive.Content
      data-slot="select-content"
      position={position}
      sideOffset={sideOffset}
      className={cn(
        'z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
        className,
      )}
      {...props}
    >
      <Primitive.ScrollUpButton className="grid h-6 place-items-center">
        <ChevronUp className="size-4" />
      </Primitive.ScrollUpButton>
      <Primitive.Viewport className="p-1">{children}</Primitive.Viewport>
      <Primitive.ScrollDownButton className="grid h-6 place-items-center">
        <ChevronDown className="size-4" />
      </Primitive.ScrollDownButton>
    </Primitive.Content>
  </Primitive.Portal>
)
export const SelectItem = ({
  children,
  className,
  ...props
}: ComponentProps<typeof Primitive.Item>) => (
  <Primitive.Item
    data-slot="select-item"
    className={cn(
      'relative flex min-h-8 cursor-default select-none items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <Primitive.ItemText>{children}</Primitive.ItemText>
    <Primitive.ItemIndicator className="absolute right-2">
      <Check aria-hidden="true" className="size-4" />
    </Primitive.ItemIndicator>
  </Primitive.Item>
)
