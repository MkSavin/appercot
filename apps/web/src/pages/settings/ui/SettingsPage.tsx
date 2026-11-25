import { ArrowLeft, Bell, Bot, Mail, Palette, UserRound, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'wouter'
import { useChatStore } from '@/entities/chat'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { WorkspaceHeader } from '@/shared/ui/workspace-header'
import { AccountSettings } from './AccountSettings'
import { AdminAccountSettings } from './AdminAccountSettings'
import { AppearanceSettings } from './AppearanceSettings'
import { BotSettings } from './BotSettings'
import { ManagementSettings } from './ManagementSettings'
import { NotificationSettings } from './NotificationSettings'
import { SettingsNavigation, type SettingsTab } from './SettingsNavigation'

export const SettingsPage = () => {
  const { t } = useTranslation()
  const { section, botId } = useParams<{ section?: string; botId?: string }>()
  const user = useChatStore((state) => state.user)
  const vapidPublicKey = useChatStore((state) => state.vapidPublicKey)
  if (!user) return null
  const isOwner = user.role === 'owner'
  const accountTab: SettingsTab = {
    id: 'account',
    label: t('settings:account'),
    icon: UserRound,
    group: t('settings:personal'),
  }
  const tabs: SettingsTab[] = [
    accountTab,
    {
      id: 'appearance',
      label: t('settings:appearance'),
      icon: Palette,
      group: t('settings:personal'),
    },
    {
      id: 'notifications',
      label: t('settings:notifications'),
      icon: Bell,
      group: t('settings:personal'),
    },
    ...(user.role !== 'user'
      ? [
          {
            id: 'bots',
            label: isOwner ? t('admin:bots') : t('settings:myBots'),
            icon: Bot,
            group: t('settings:management'),
          },
        ]
      : []),
    ...(isOwner
      ? [
          {
            id: 'users',
            label: t('admin:users'),
            icon: Users,
            group: t('settings:management'),
          },
          {
            id: 'invites',
            label: t('admin:invites'),
            icon: Mail,
            group: t('settings:management'),
          },
        ]
      : []),
  ]
  const active = tabs.find((tab) => tab.id === section) ?? accountTab
  const showBot = active.id === 'bots' && botId
  const showUser = active.id === 'users' && isOwner && botId
  const backHref = showBot ? '/settings/bots' : showUser ? '/settings/users' : '/settings'
  const backLabel = showBot
    ? t('settings:backToBots')
    : showUser
      ? t('settings:backToUsers')
      : t('settings:title')

  return (
    <div className="grid h-full min-h-0 md:grid-cols-[var(--context-width)_minmax(0,1fr)]">
      <SettingsNavigation
        title={t('settings:title')}
        tabs={tabs}
        activeId={active.id}
        hidden={Boolean(section)}
      />
      <main className={cn('min-h-0 min-w-0 overflow-auto md:block', !section && 'hidden')}>
        <WorkspaceHeader
          before={
            <Button
              variant="ghost"
              size="icon"
              asChild
              className={showBot || showUser ? '' : 'md:hidden'}
            >
              <Link href={backHref} aria-label={backLabel}>
                <ArrowLeft aria-hidden="true" />
              </Link>
            </Button>
          }
        >
          {showBot ? t('settings:botDetails') : showUser ? t('settings:userProfile') : active.label}
        </WorkspaceHeader>
        <div className="mx-auto grid max-w-4xl gap-5 p-4 md:p-7">
          {active.id === 'account' ? <AccountSettings user={user} /> : null}
          {active.id === 'appearance' ? <AppearanceSettings /> : null}
          {active.id === 'notifications' ? (
            <NotificationSettings vapidPublicKey={vapidPublicKey} />
          ) : null}
          {showBot ? (
            <BotSettings key={`${user.id}:${showBot}`} botId={showBot} isOwner={isOwner} />
          ) : showUser ? (
            <AdminAccountSettings key={showUser} userId={showUser} />
          ) : active.id === 'bots' || active.id === 'users' || active.id === 'invites' ? (
            <ManagementSettings key={active.id} section={active.id} />
          ) : null}
        </div>
      </main>
    </div>
  )
}
