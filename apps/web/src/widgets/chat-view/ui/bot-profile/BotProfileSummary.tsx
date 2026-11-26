import { Ellipsis, ShieldBan, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BotAvatar } from '@/entities/bot'
import type { fetchChatProfile } from '@/entities/chat'
import { ChatNotificationMenu } from '@/features/chat-notifications'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

type Profile = Awaited<ReturnType<typeof fetchChatProfile>>

export const BotProfileSummary = ({
  chatId,
  bot,
  blocked,
  pending,
  onBlock,
  onDelete,
}: {
  chatId: string
  bot: Profile['bot']
  blocked: boolean
  pending: boolean
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
        <ChatNotificationMenu chatId={chatId} trigger="button" align="center" />
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
