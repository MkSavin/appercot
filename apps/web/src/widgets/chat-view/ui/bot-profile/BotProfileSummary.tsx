import { Bell, BellOff, Ellipsis, ShieldBan, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BotAvatar } from '@/entities/bot'
import type { fetchChatProfile } from '@/entities/chat'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

type Profile = Awaited<ReturnType<typeof fetchChatProfile>>
const isNotificationMode = (mode: string): mode is 'all' | 'silent' | 'off' =>
  mode === 'all' || mode === 'silent' || mode === 'off'

export const BotProfileSummary = ({
  bot,
  blocked,
  notifications,
  pending,
  onNotifications,
  onBlock,
  onDelete,
}: {
  bot: Profile['bot']
  blocked: boolean
  notifications: 'all' | 'silent' | 'off'
  pending: boolean
  onNotifications: (mode: 'all' | 'silent' | 'off') => void
  onBlock: () => void
  onDelete: () => void
}) => {
  const { t } = useTranslation()
  return (
    <div className="settings-card grid justify-items-center gap-3 py-6 text-center">
      <BotAvatar bot={bot} size="xl" />
      <div className="min-w-0">
        <h2 className="break-words text-2xl font-semibold">{bot.name}</h2>
        <p className="text-sm text-muted-foreground">@{bot.username}</p>
      </div>
      <Badge variant="secondary">{bot.online ? t('chat:online') : t('chat:offlineStatus')}</Badge>
      {bot.description ? (
        <p className="max-w-lg whitespace-pre-wrap break-words text-sm leading-relaxed">
          {bot.description}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={pending}>
              {notifications === 'off' ? (
                <BellOff aria-hidden="true" />
              ) : (
                <Bell aria-hidden="true" />
              )}
              {t('bot:notifications')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuRadioGroup
              value={notifications}
              onValueChange={(mode) => {
                if (isNotificationMode(mode)) onNotifications(mode)
              }}
            >
              <DropdownMenuRadioItem value="all">{t('bot:notificationsAll')}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="silent">
                {t('bot:notificationsSilent')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="off">{t('bot:notificationsOff')}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              disabled={pending}
              aria-label={t('bot:chatActions')}
            >
              <Ellipsis aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onBlock}>
              <ShieldBan aria-hidden="true" />
              {blocked ? t('chat:unblockBot') : t('chat:blockBot')}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 aria-hidden="true" />
              {t('bot:deleteChat')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
