import type { ReactNode } from 'react'

export const SettingsRow = ({
  title,
  description,
  children,
}: {
  title: ReactNode
  description: string
  children: ReactNode
}) => (
  <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
    <div className="min-w-52 flex-1">
      <h3 className="flex flex-wrap items-center gap-2 text-sm font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
    <div className="ml-auto shrink-0">{children}</div>
  </div>
)
