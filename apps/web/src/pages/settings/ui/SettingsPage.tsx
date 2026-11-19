import {
  ArrowLeft,
  Bell,
  Bot,
  ChevronRight,
  Mail,
  Monitor,
  Moon,
  Palette,
  Sun,
  UserRound,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'wouter'
import { useChatStore } from '@/entities/chat'
import { PushSubscribeButton } from '@/features/push-subscribe'
import { strings } from '@/shared/config'
import { cn } from '@/shared/lib/cn'
import { getThemePreference, saveThemePreference, type ThemePreference } from '@/shared/lib/theme'
import { Button } from '@/shared/ui/button'
import { ChoiceCards } from '@/shared/ui/choice-cards'
import { AccountSettings, AdminAccountSettings } from './AccountSettings'
import { BotSettings } from './BotSettings'
import { ManagementSettings } from './ManagementSettings'

const themes = [
  {
    value: 'system',
    label: strings.settings.themes.system,
    description: strings.settings.themeDescriptions.system,
    icon: Monitor,
  },
  {
    value: 'light',
    label: strings.settings.themes.light,
    description: strings.settings.themeDescriptions.light,
    icon: Sun,
  },
  {
    value: 'dark',
    label: strings.settings.themes.dark,
    description: strings.settings.themeDescriptions.dark,
    icon: Moon,
  },
] as const

export const SettingsPage = () => {
  const { section, botId } = useParams<{ section?: string; botId?: string }>()
  const user = useChatStore((state) => state.user)
  const vapidPublicKey = useChatStore((state) => state.vapidPublicKey)
  const [theme, setTheme] = useState(getThemePreference)
  if (!user) return null
  const isOwner = user.role === 'owner'
  const accountTab = {
    id: 'account',
    label: strings.settings.account,
    icon: UserRound,
    group: strings.settings.personal,
  }
  const tabs = [
    accountTab,
    {
      id: 'appearance',
      label: strings.settings.appearance,
      icon: Palette,
      group: strings.settings.personal,
    },
    {
      id: 'notifications',
      label: strings.settings.notifications,
      icon: Bell,
      group: strings.settings.personal,
    },
    ...(user.role !== 'user'
      ? [
          {
            id: 'bots',
            label: isOwner ? strings.admin.bots : strings.settings.myBots,
            icon: Bot,
            group: strings.settings.management,
          },
        ]
      : []),
    ...(isOwner
      ? [
          {
            id: 'users',
            label: strings.admin.users,
            icon: Users,
            group: strings.settings.management,
          },
          {
            id: 'invites',
            label: strings.admin.invites,
            icon: Mail,
            group: strings.settings.management,
          },
        ]
      : []),
  ]
  const active = tabs.find((tab) => tab.id === section) ?? accountTab
  const showBot = active.id === 'bots' && botId
  const showUser = active.id === 'users' && isOwner && botId

  return (
    <div className="grid h-full min-h-0 md:grid-cols-[var(--context-width)_minmax(0,1fr)]">
      <nav
        aria-label={strings.settings.title}
        className={cn(
          'min-h-0 overflow-auto border-sidebar-border bg-sidebar p-3 md:block md:border-r',
          section && 'hidden',
        )}
      >
        <h1 className="px-3 pt-3 pb-6 text-xl font-semibold tracking-tight">
          {strings.settings.title}
        </h1>
        {tabs.map(({ id, label, icon: Icon, group }, index) => (
          <div key={id}>
            {group !== tabs[index - 1]?.group ? (
              <p className="px-3 pt-3 pb-2 text-xs font-medium text-muted-foreground">{group}</p>
            ) : null}
            <Link
              href={`/settings/${id}`}
              aria-current={id === active.id ? 'page' : undefined}
              className="workspace-link flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium"
            >
              <Icon aria-hidden="true" className="size-[18px] shrink-0" />
              {label}
              <ChevronRight aria-hidden="true" className="ml-auto size-4 md:hidden" />
            </Link>
          </div>
        ))}
      </nav>
      <main className={cn('min-h-0 min-w-0 overflow-auto md:block', !section && 'hidden')}>
        <header className="sticky top-0 z-10 flex min-h-16 items-center gap-3 border-b bg-card px-4 md:px-7">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className={showBot || showUser ? '' : 'md:hidden'}
          >
            <Link
              href={showBot ? '/settings/bots' : showUser ? '/settings/users' : '/settings'}
              aria-label={
                showBot
                  ? strings.settings.backToBots
                  : showUser
                    ? 'К списку пользователей'
                    : strings.settings.title
              }
            >
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <h2 className="text-lg font-semibold">
            {showBot
              ? strings.settings.botDetails
              : showUser
                ? 'Профиль пользователя'
                : active.label}
          </h2>
        </header>
        <div className="mx-auto grid max-w-4xl gap-5 p-4 md:p-7">
          {active.id === 'account' ? <AccountSettings user={user} /> : null}
          {active.id === 'appearance' ? (
            <section aria-labelledby="theme-title" className="grid gap-3">
              <h2 id="theme-title" className="text-base font-semibold">
                {strings.settings.brightness}
              </h2>
              <ChoiceCards
                name="theme"
                label={strings.settings.brightness}
                value={theme}
                options={themes}
                className="lg:grid-cols-3"
                onChange={(mode: ThemePreference) => {
                  setTheme(mode)
                  saveThemePreference(mode)
                }}
              />
            </section>
          ) : null}
          {active.id === 'notifications' ? (
            <section className="settings-card grid gap-3">
              <p className="text-sm text-muted-foreground">{strings.settings.notificationsHint}</p>
              <PushSubscribeButton vapidPublicKey={vapidPublicKey} settings />
            </section>
          ) : null}
          {showBot ? (
            <BotSettings key={showBot} botId={showBot} isOwner={isOwner} />
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
