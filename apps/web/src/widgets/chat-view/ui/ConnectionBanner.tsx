import { CloudOff, WifiOff } from 'lucide-react'
import { strings } from '@/shared/config'
import type { ConnectionStatus } from '@/shared/model'

interface ConnectionBannerProps {
  connection: ConnectionStatus
  botOnline: boolean
}

export const ConnectionBanner = ({ connection, botOnline }: ConnectionBannerProps) => {
  if (connection === 'online' && botOnline) return null
  const networkOffline = connection !== 'online'
  const Icon = networkOffline ? WifiOff : CloudOff
  return (
    <div
      className="flex items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100"
      role="status"
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {connection === 'connecting'
        ? strings.chat.reconnecting
        : networkOffline
          ? strings.chat.offline
          : strings.chat.botOffline}
    </div>
  )
}
