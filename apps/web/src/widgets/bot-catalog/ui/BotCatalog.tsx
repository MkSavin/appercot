import { ArrowRight } from 'lucide-react'

import { Link } from 'wouter'
import { BotAvatar, type BotDetails } from '@/entities/bot'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Badge } from '@/shared/ui/badge'

export const BotCatalog = ({
  bots,
  returnSearch = '',
}: {
  bots: BotDetails[]
  returnSearch?: string
}) => {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {bots.map((bot) => (
        <li key={bot.id} className="min-w-0">
          <Link
            {...testId(testIds.catalog.bot(bot.id))}
            href={`/browse/${encodeURIComponent(bot.id)}${returnSearch}`}
            className="flex min-h-32 w-full min-w-0 items-start gap-3 rounded-xl border bg-linear-to-r/srgb from-accent/25 to-card p-4 text-left transition-colors hover:border-ring/50 hover:from-accent/85 focus-visible:outline-2 focus-visible:outline-ring"
          >
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
            <ArrowRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
