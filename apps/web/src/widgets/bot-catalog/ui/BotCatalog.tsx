import { ArrowRight, LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { BotAvatar, type BotDetails } from '@/entities/bot'
import { Badge } from '@/shared/ui/badge'

interface BotCatalogProps {
  bots: BotDetails[]
  chatByBotId: Record<string, string>
  pendingBotId?: string
  onAdd: (bot: BotDetails) => void
}

const tileClass =
  'flex min-h-32 w-full min-w-0 items-start gap-3 rounded-xl border bg-linear-to-r/srgb from-accent/25 to-card p-4 text-left transition-colors hover:border-ring/50 hover:from-accent/85 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-70'

export const BotCatalog = ({ bots, chatByBotId, pendingBotId, onAdd }: BotCatalogProps) => {
  const { t } = useTranslation()
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {bots.map((bot) => {
        const chatId = chatByBotId[bot.id]
        const pending = pendingBotId === bot.id
        const content = (
          <>
            <BotAvatar bot={bot} showPresence />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{bot.name}</span>
              <span className="block truncate text-xs text-muted-foreground">@{bot.username}</span>
              {bot.description ? (
                <span className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
                  {bot.description}
                </span>
              ) : null}
              {bot.tags?.length ? (
                <span className="mt-2 flex flex-wrap gap-1">
                  {bot.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[11px] font-normal">
                      {tag}
                    </Badge>
                  ))}
                </span>
              ) : null}
            </span>
            {pending ? (
              <LoaderCircle aria-hidden="true" className="mt-1 size-4 shrink-0 animate-spin" />
            ) : (
              <ArrowRight
                aria-hidden="true"
                className="mt-1 size-4 shrink-0 text-muted-foreground"
              />
            )}
          </>
        )
        return (
          <li key={bot.id} className="min-w-0">
            {chatId ? (
              <Link href={`/c/${chatId}`} className={tileClass}>
                {content}
              </Link>
            ) : (
              <button
                type="button"
                className={tileClass}
                disabled={pendingBotId !== undefined}
                onClick={() => onAdd(bot)}
              >
                <span className="sr-only">{t('browse:add')}</span>
                {content}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
