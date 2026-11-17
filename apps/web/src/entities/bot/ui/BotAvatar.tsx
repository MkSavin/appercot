import type { BotRef } from '@appercot/protocol'
import { cn } from '@/shared/lib/cn'

interface BotAvatarProps {
  bot: BotRef
  size?: 'sm' | 'md' | 'lg'
  showPresence?: boolean
}

const colorForBot = (botId: string) => {
  const hash = [...botId].reduce((value, character) => value * 31 + character.charCodeAt(0), 7)
  return `hsl(${Math.abs(hash) % 360} 48% 42%)`
}

export const BotAvatar = ({ bot, size = 'md', showPresence = false }: BotAvatarProps) => (
  <span className="relative shrink-0">
    <span
      aria-hidden="true"
      className={cn(
        'grid place-items-center rounded-xl font-semibold text-white shadow-sm',
        size === 'sm' && 'size-9 rounded-lg text-xs',
        size === 'md' && 'size-11 text-sm',
        size === 'lg' && 'size-14 text-lg',
      )}
      style={{ backgroundColor: colorForBot(bot.id) }}
    >
      {bot.name.slice(0, 1).toUpperCase()}
    </span>
    {showPresence ? (
      <span
        className={cn(
          'absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-sidebar',
          bot.online ? 'bg-emerald-500' : 'bg-zinc-400',
        )}
        role="img"
        aria-label={bot.online ? 'в сети' : 'не в сети'}
      />
    ) : null}
  </span>
)
