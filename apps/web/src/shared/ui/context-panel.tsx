import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export const ContextPanel = ({
  title,
  search,
  children,
  className,
  contentClassName,
}: {
  title: string
  search?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}) => (
  <aside
    aria-label={title}
    className={cn(
      'min-h-0 min-w-0 flex-col border-sidebar-border bg-sidebar pt-[env(safe-area-inset-top)] md:flex md:border-r',
      className,
    )}
  >
    <header className="px-4 pt-4 pb-3">
      <h2 className="px-3 pt-3 pb-6 text-xl font-semibold tracking-tight">{title}</h2>
      {search ? <search className="block">{search}</search> : null}
    </header>
    <div className={cn('min-h-0 flex-1 overflow-y-auto', contentClassName)}>{children}</div>
  </aside>
)
