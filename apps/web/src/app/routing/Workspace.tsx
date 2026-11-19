import { Bot, Compass, MessagesSquare, Settings2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'wouter'
import { strings } from '@/shared/config'
import { cn } from '@/shared/lib/cn'

const destinations = [
  {
    href: '/',
    label: strings.chat.title,
    icon: MessagesSquare,
    active: (path: string) => path === '/' || path.startsWith('/c/'),
  },
  {
    href: '/browse',
    label: strings.browse.nav,
    icon: Compass,
    active: (path: string) => path === '/browse',
  },
  {
    href: '/settings',
    label: strings.settings.title,
    icon: Settings2,
    active: (path: string) => path.startsWith('/settings'),
  },
]

export const Workspace = ({ path, children }: { path: string; children: ReactNode }) => (
  <div className="workspace-frame flex h-dvh min-h-0 flex-col-reverse md:flex-row">
    <nav
      aria-label={strings.appName}
      className={cn(
        'workspace-rail shrink-0 items-center md:flex md:flex-col',
        path.startsWith('/c/') || path.startsWith('/settings/') ? 'hidden' : 'flex',
      )}
    >
      <Link href="/" aria-label={strings.appName} className="workspace-mark hidden md:grid">
        <Bot aria-hidden="true" className="size-5" />
      </Link>
      {destinations.map(({ href, label, icon: Icon, active }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(path) ? 'page' : undefined}
          className={cn('workspace-destination', href === '/settings' && 'md:mt-auto')}
        >
          <Icon aria-hidden="true" className="size-5" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
    <div className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</div>
  </div>
)
