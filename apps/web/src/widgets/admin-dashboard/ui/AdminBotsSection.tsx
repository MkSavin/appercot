import { ChevronRight, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { BotAvatar, type IssuedBotToken, type ManagedBot } from '@/entities/bot'
import { CreateBotDialog } from '@/features/bot-token-manage'
import { Badge } from '@/shared/ui/badge'

export const AdminBotsSection = ({
  bots,
  onToken,
}: {
  bots: ManagedBot[]
  onToken: (token: IssuedBotToken) => void
}) => {
  const { t } = useTranslation()
  return (
    <section aria-label={t('admin:bots')} className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t('admin:botsDescription')}</p>
        <CreateBotDialog onCreated={onToken} />
      </div>
      {bots.length ? (
        <ul className="grid gap-2">
          {bots.map((bot) => (
            <li key={bot.id}>
              <Link
                href={`/settings/bots/${bot.id}`}
                className="grid min-w-0 grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border bg-card p-3 transition-colors hover:bg-secondary/50 focus-visible:outline-2 focus-visible:outline-ring sm:gap-4 sm:px-4"
              >
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <BotAvatar bot={bot} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{bot.name}</p>
                    <p className="truncate text-xs text-muted-foreground">@{bot.username}</p>
                  </div>
                </div>
                <div className="grid justify-items-start gap-1 text-xs text-muted-foreground">
                  <Badge variant={bot.online ? 'default' : 'outline'} className="rounded-full">
                    {bot.online ? t('settings:botOnline') : t('settings:botOffline')}
                  </Badge>
                  <span className="inline-flex items-center gap-1">
                    <Users aria-hidden="true" className="size-3" />
                    <span className="sr-only">{t('bot:membersCount')}</span>
                    {bot.memberCount}
                  </span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    {bot.access === 'by_link' ? t('settings:byLink') : t('settings:public')}
                  </Badge>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t('browse:empty')}</p>
      )}
    </section>
  )
}
