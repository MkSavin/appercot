import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

const fieldVariants = cva(
  'group/field flex w-full min-w-0 gap-2 data-[invalid=true]:text-destructive',
  {
    variants: {
      orientation: {
        vertical: 'flex-col',
        horizontal: 'items-start [&>[data-slot=field-content]]:flex-1',
        responsive:
          'flex-col @sm/field-group:flex-row @sm/field-group:items-start @sm/field-group:gap-5 @sm/field-group:[&>[data-slot=field-content]]:flex-1',
      },
    },
    defaultVariants: { orientation: 'vertical' },
  },
)
export const Field = ({
  orientation,
  className,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof fieldVariants>) => (
  <div
    data-slot="field"
    data-orientation={orientation ?? 'vertical'}
    className={cn(fieldVariants({ orientation }), className)}
    {...props}
  />
)
export const FieldGroup = ({ className, ...props }: ComponentProps<'div'>) => (
  <div
    data-slot="field-group"
    className={cn('@container/field-group grid w-full gap-5', className)}
    {...props}
  />
)
export const FieldContent = ({ className, ...props }: ComponentProps<'div'>) => (
  <div data-slot="field-content" className={cn('grid min-w-0 gap-1.5', className)} {...props} />
)
export const FieldLabel = ({ className, htmlFor, children, ...props }: ComponentProps<'label'>) => (
  <label
    htmlFor={htmlFor}
    data-slot="field-label"
    className={cn('text-sm font-medium', className)}
    {...props}
  >
    {children}
  </label>
)
export const FieldTitle = ({ className, ...props }: ComponentProps<'div'>) => (
  <div data-slot="field-title" className={cn('text-sm font-medium', className)} {...props} />
)
export const FieldDescription = ({ className, ...props }: ComponentProps<'p'>) => (
  <p
    data-slot="field-description"
    className={cn('text-xs leading-relaxed text-muted-foreground', className)}
    {...props}
  />
)
export const FieldSet = ({ className, ...props }: ComponentProps<'fieldset'>) => (
  <fieldset data-slot="field-set" className={cn('grid min-w-0 gap-4', className)} {...props} />
)
export const FieldLegend = ({ className, ...props }: ComponentProps<'legend'>) => (
  <legend
    data-slot="field-legend"
    className={cn('mb-3 text-base font-semibold', className)}
    {...props}
  />
)
export const FieldSeparator = ({ className, children, ...props }: ComponentProps<'div'>) => (
  <div
    data-slot="field-separator"
    className={cn('relative flex items-center gap-2 text-xs text-muted-foreground', className)}
    {...props}
  >
    <hr className="flex-1 border-border" />
    {children ? (
      <>
        {children}
        <hr className="flex-1 border-border" />
      </>
    ) : null}
  </div>
)
export const FieldError = ({
  className,
  children,
  errors,
  ...props
}: ComponentProps<'div'> & {
  errors?: readonly ({ message?: string } | undefined)[]
}) => {
  const messages = [
    ...new Set(errors?.flatMap((error) => (error?.message ? [error.message] : [])) ?? []),
  ]
  if (!children && !messages.length) return null
  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn('text-sm text-destructive', className)}
      {...props}
    >
      {children ??
        (messages.length === 1 ? (
          messages[0]
        ) : (
          <ul className="list-inside list-disc">
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ))}
    </div>
  )
}
