import { ExternalLink, MessageCircle, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import type { fetchAdminBotDiagnostics, IssuedBotToken } from '@/entities/bot'
import { resourceUrls } from '@/shared/config/resources'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Button } from '@/shared/ui/button'
import { useOpenBotChat } from '../model/use-open-bot-chat'
import { BotConnectionSnippet } from './BotConnectionSnippet'
import { BotConnectionStatus } from './BotConnectionStatus'

export const BotSetupSteps = ({
  issued,
  webSocketUrl,
  diagnostics,
  failed,
  tokenSaved,
  onTokenSaved,
  onRetry,
  onFinished,
}: {
  issued: IssuedBotToken
  webSocketUrl: string
  diagnostics?: Awaited<ReturnType<typeof fetchAdminBotDiagnostics>>
  failed: boolean
  tokenSaved: boolean
  onTokenSaved: () => void
  onRetry: () => void
  onFinished?: () => void
}) => {
  const { t } = useTranslation('onboarding')
  const { pending, openChat } = useOpenBotChat()
  const online = diagnostics?.online ?? issued.bot.online

  return (
    <div className="grid min-w-0 gap-5">
      <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
        {t('tokenWarning')}
      </p>
      <BotConnectionSnippet
        token={issued.token}
        webSocketUrl={webSocketUrl}
        onTokenSaved={onTokenSaved}
      />
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          {...testId(testIds.onboarding.tokenSaved)}
          type="checkbox"
          checked={tokenSaved}
          onChange={(event) => {
            if (event.target.checked) onTokenSaved()
          }}
          className="size-4 accent-primary"
        />
        {t('tokenSavedConfirmation')}
      </label>
      <a
        href={resourceUrls.firstBotGuide}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
      >
        {t('fullGuide')}
        <ExternalLink aria-hidden="true" className="size-4" />
      </a>
      <BotConnectionStatus
        diagnostics={diagnostics}
        fallbackOnline={issued.bot.online}
        failed={failed}
        onRetry={onRetry}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button variant="outline" asChild className="min-h-11">
          <Link href={`/settings/bots/${issued.bot.id}`}>
            <Settings aria-hidden="true" />
            {t('openSettings')}
          </Link>
        </Button>
        {online ? (
          <Button
            {...testId(testIds.onboarding.openChat)}
            type="button"
            className="min-h-11"
            disabled={pending || !tokenSaved}
            title={!tokenSaved ? t('saveTokenFirst') : undefined}
            onClick={() =>
              void openChat(issued.bot).then((opened) => {
                if (opened) onFinished?.()
              })
            }
          >
            <MessageCircle aria-hidden="true" />
            {t('openChat')}
          </Button>
        ) : null}
      </div>
      {online && !tokenSaved ? (
        <p className="text-sm text-muted-foreground">{t('saveTokenFirst')}</p>
      ) : null}
    </div>
  )
}
