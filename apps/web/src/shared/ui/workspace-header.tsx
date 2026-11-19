import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export const WorkspaceHeader = ({
  children,
  actions,
  before,
  className,
}: {
  children: ReactNode
  actions?: ReactNode
  before?: ReactNode
  className?: string
}) => (
  <header
    className={cn(
      'sticky top-0 z-10 flex min-h-16 items-center gap-3 border-b bg-card px-4 md:px-7',
      className,
    )}
  >
    {before}
    <h1 className="text-lg font-semibold">{children}</h1>
    {actions}
  </header>
)
