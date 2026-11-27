import { Bot, Compass, MessageCircle, MessagesSquare, Settings2 } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearch } from 'wouter'
import { useChatStore } from '@/entities/chat'
import { cn } from '@/shared/lib/cn'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Badge } from '@/shared/ui/badge'

export const Workspace = ({ path, children }: { path: string; children: ReactNode }) => {
  const { t } = useTranslation()
  const search = useSearch()
  const unreadOnly = new URLSearchParams(search).get('filter') === 'unread'
  const unreadCount = useChatStore((state) => state.chats.filter((chat) => chat.unread > 0).length)
  const destinations = [
    {
      href: '/browse',
      selector: testIds.navigation.catalog,
      label: t('browse:nav'),
      icon: Compass,
      active: (currentPath: string) => currentPath === '/browse',
    },
    {
      href: '/',
      selector: testIds.navigation.chats,
      label: t('chat:title'),
      icon: MessagesSquare,
      active: (currentPath: string) =>
        !unreadOnly && (currentPath === '/' || currentPath.startsWith('/c/')),
    },
    {
      href: '/?filter=unread',
      selector: testIds.navigation.unread,
      label: t('chat:new'),
      icon: MessageCircle,
      active: (currentPath: string) => currentPath === '/' && unreadOnly,
      count: unreadCount,
    },
    {
      href: '/settings',
      selector: testIds.navigation.settings,
      label: t('settings:title'),
      icon: Settings2,
      active: (currentPath: string) => currentPath.startsWith('/settings'),
    },
  ]
  return (
    <div className="workspace-frame flex h-dvh min-h-0 flex-col-reverse md:flex-row">
      <nav
        {...testId(testIds.navigation.rail)}
        aria-label={t('appName')}
        className={cn(
          'workspace-rail shrink-0 items-center md:flex md:flex-col',
          path.startsWith('/c/') || path.startsWith('/settings/') ? 'hidden' : 'flex',
        )}
      >
        <Link href="/" aria-label={t('appName')} className="workspace-mark hidden md:grid">
          <Bot aria-hidden="true" className="size-5" />
        </Link>
        {destinations.map(({ href, label, icon: Icon, active, selector, ...destination }) => (
          <Fragment key={href}>
            {href === '/' ? (
              <div
                aria-hidden="true"
                className="mx-1 h-8 w-px bg-border md:mx-0 md:my-1 md:h-px md:w-8"
              />
            ) : null}
            <Link
              {...testId(selector)}
              href={href}
              aria-current={active(path) ? 'page' : undefined}
              aria-label={
                'count' in destination
                  ? `${t('chat:new')}. ${t('chat:unreadFilter', { count: unreadCount })}`
                  : undefined
              }
              className={cn('workspace-destination relative', href === '/settings' && 'md:mt-auto')}
            >
              <Icon aria-hidden="true" className="size-5" />
              <span>{label}</span>
              {'count' in destination && destination.count ? (
                <Badge className="absolute top-0.5 right-1 px-1 text-[10px]">
                  {destination.count}
                </Badge>
              ) : null}
            </Link>
          </Fragment>
        ))}
      </nav>
      <div
        {...testId(testIds.workspace.content)}
        className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden"
      >
        {children}
      </div>
    </div>
  )
}
