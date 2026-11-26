import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/entities/chat'
import { resourceUrls } from '@/shared/config'
import { createBotLaunchCommand } from '../model/onboarding'

export const BotConnectionGuide = () => {
  const { t } = useTranslation('onboarding')
  const webSocketUrl = useChatStore((state) => state.botWebSocketUrl)
  if (!webSocketUrl) return null

  return (
    <details className="w-full rounded-lg border p-3">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">
        {t('show')}
      </summary>
      <div className="grid min-w-0 gap-3 pt-3">
        <p className="text-sm text-muted-foreground">{t('existingTokenHint')}</p>
        <div className="grid gap-1">
          <span className="text-xs font-medium">BOT_URL</span>
          <code className="break-all rounded bg-muted p-2 text-xs">{webSocketUrl}</code>
        </div>
        <pre className="max-w-full overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap break-all">
          {createBotLaunchCommand('<botId>:<token>', webSocketUrl)}
        </pre>
        <a
          href={resourceUrls.firstBotGuide}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-2 justify-self-start text-sm text-primary underline-offset-4 hover:underline"
        >
          {t('fullGuide')}
          <ExternalLink aria-hidden="true" className="size-4" />
        </a>
      </div>
    </details>
  )
}
