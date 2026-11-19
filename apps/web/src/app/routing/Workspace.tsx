import { Bot, Compass, MessagesSquare, Settings2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { cn } from '@/shared/lib/cn'

export const Workspace = ({ path, children }: { path: string; children: ReactNode }) => {
  const { t } = useTranslation()
  const destinations = [
    {
      href: '/',
      label: t('chat:title'),
      icon: MessagesSquare,
      active: (currentPath: string) => currentPath === '/' || currentPath.startsWith('/c/'),
    },
    {
      href: '/browse',
      label: t('browse:nav'),
      icon: Compass,
      active: (currentPath: string) => currentPath === '/browse',
    },
    {
      href: '/settings',
      label: t('settings:title'),
      icon: Settings2,
      active: (currentPath: string) => currentPath.startsWith('/settings'),
    },
  ]
  return (
    <div className="workspace-frame flex h-dvh min-h-0 flex-col-reverse md:flex-row">
      <nav
        aria-label={t('appName')}
        className={cn(
          'workspace-rail shrink-0 items-center md:flex md:flex-col',
          path.startsWith('/c/') || path.startsWith('/settings/') ? 'hidden' : 'flex',
        )}
      >
        <Link href="/" aria-label={t('appName')} className="workspace-mark hidden md:grid">
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
}
