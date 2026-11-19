import type { ReactNode } from 'react'
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/shared/ui/field'

export const SettingsField = ({
  label,
  name,
  children,
  description,
}: {
  label: string
  name: string
  children: ReactNode
  description?: string
}) => (
  <Field orientation={description ? 'responsive' : 'vertical'}>
    <div className={description ? '@sm/field-group:w-44 @sm/field-group:shrink-0' : undefined}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      {description ? <FieldDescription id={`${name}-hint`}>{description}</FieldDescription> : null}
    </div>
    <FieldContent>{children}</FieldContent>
  </Field>
)
