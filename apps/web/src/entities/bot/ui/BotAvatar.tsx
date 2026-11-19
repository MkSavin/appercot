import type { BotRef } from '@appercot/protocol'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'

interface BotAvatarProps {
  bot: BotRef & { avatar?: string | null }
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showPresence?: boolean
}

const avatarColors = ['#79513e', '#5a6348', '#52646a', '#785c70', '#695a45']

const colorForBot = (botId: string) => {
  const hash = [...botId].reduce(
    (value, character) => Math.imul(value, 31) + character.charCodeAt(0),
    7,
  )
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

export const BotAvatar = ({ bot, size = 'md', showPresence = false }: BotAvatarProps) => {
  const { t } = useTranslation()
  return (
    <span className="relative shrink-0">
      <Avatar
        aria-hidden="true"
        className={cn(
          size === 'sm' && 'size-9',
          size === 'md' && 'size-11',
          size === 'lg' && 'size-14',
          size === 'xl' && 'size-24',
        )}
        style={{ backgroundColor: colorForBot(bot.id) }}
      >
        {bot.avatar ? <AvatarImage src={bot.avatar} alt="" className="object-cover" /> : null}
        <AvatarFallback
          className={cn(
            'bg-transparent font-semibold text-white',
            size === 'sm' && 'text-xs',
            size === 'lg' && 'text-lg',
            size === 'xl' && 'text-3xl',
          )}
        >
          {bot.name.slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {showPresence ? (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-sidebar',
            bot.online ? 'bg-emerald-500' : 'bg-zinc-400',
          )}
          role="img"
          aria-label={bot.online ? t('chat:online') : t('chat:offlineStatus')}
        />
      ) : null}
    </span>
  )
}
