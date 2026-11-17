import { ArrowRight, LoaderCircle, Plus } from 'lucide-react'
import { BotAvatar, type BotDetails } from '@/entities/bot'
import { strings } from '@/shared/config'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

interface BotCatalogProps {
  bots: BotDetails[]
  chatByBotId: Record<string, string>
  pendingBotId?: string
  onAdd: (bot: BotDetails) => void
  onOpen: (chatId: string) => void
}

export const BotCatalog = ({ bots, chatByBotId, pendingBotId, onAdd, onOpen }: BotCatalogProps) => {
  if (bots.length === 0) {
    return <p className="py-16 text-center text-muted-foreground">{strings.browse.empty}</p>
  }
  return (
    <ul className="grid gap-3">
      {bots.map((bot) => {
        const chatId = chatByBotId[bot.id]
        const pending = pendingBotId === bot.id
        return (
          <li
            key={bot.id}
            className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-xs sm:flex-row sm:items-center"
          >
            <BotAvatar bot={bot} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{bot.name}</h2>
                <Badge variant="secondary">
                  {bot.online ? strings.chat.online : strings.chat.offlineStatus}
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">@{bot.username}</p>
              <p className="mt-3 text-sm leading-6 text-pretty">{bot.description}</p>
            </div>
            {chatId ? (
              <Button type="button" variant="outline" onClick={() => onOpen(chatId)}>
                {strings.browse.open}
                <ArrowRight aria-hidden="true" />
              </Button>
            ) : (
              <Button type="button" disabled={pending} onClick={() => onAdd(bot)}>
                {pending ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : (
                  <Plus aria-hidden="true" />
                )}
                {strings.browse.add}
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
