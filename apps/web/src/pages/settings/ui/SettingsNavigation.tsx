import { ChevronRight, type LucideIcon } from 'lucide-react'
import { Link } from 'wouter'
import { testId, testIds } from '@/shared/lib/test-ids'
import { ContextPanel } from '@/shared/ui/context-panel'

export interface SettingsTab {
  id: string
  label: string
  icon: LucideIcon
  group: string
}

export const SettingsNavigation = ({
  title,
  tabs,
  activeId,
  hidden,
}: {
  title: string
  tabs: SettingsTab[]
  activeId: string
  hidden: boolean
}) => (
  <ContextPanel title={title} className={hidden ? 'hidden' : 'flex'} contentClassName="px-3 pb-3">
    <nav aria-label={title}>
      {tabs.map(({ id, label, icon: Icon, group }, index) => (
        <div key={id}>
          {group !== tabs[index - 1]?.group ? (
            <p className="px-3 pt-3 pb-2 text-xs font-medium text-muted-foreground">{group}</p>
          ) : null}
          <Link
            {...testId(testIds.settings.tab(id))}
            href={`/settings/${id}`}
            aria-current={id === activeId ? 'page' : undefined}
            className="workspace-link flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium"
          >
            <Icon aria-hidden="true" className="size-[18px] shrink-0" />
            {label}
            <ChevronRight aria-hidden="true" className="ml-auto size-4 md:hidden" />
          </Link>
        </div>
      ))}
    </nav>
  </ContextPanel>
)
