import { CheckCircle2, LoaderCircle, RefreshCw, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { fetchAdminBotDiagnostics } from '@/entities/bot'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

export const BotConnectionStatus = ({
  diagnostics,
  fallbackOnline = false,
  failed,
  onRetry,
}: {
  diagnostics?: Awaited<ReturnType<typeof fetchAdminBotDiagnostics>>
  fallbackOnline?: boolean
  failed: boolean
  onRetry: () => void
}) => {
  const { t, i18n } = useTranslation('onboarding')
  const online = diagnostics?.online ?? fallbackOnline
  const formatTime = (value: number) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'medium' }).format(
      value,
    )

  return (
    <div className="grid justify-items-start gap-3 rounded-lg border bg-muted/30 p-3">
      <Badge
        {...testId(testIds.onboarding.status)}
        data-online={online}
        variant={online ? 'default' : failed ? 'destructive' : 'secondary'}
        className="rounded-full"
      >
        {online ? (
          <CheckCircle2 aria-hidden="true" />
        ) : failed ? (
          <XCircle aria-hidden="true" />
        ) : (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        )}
        {online
          ? t('connection.online')
          : failed
            ? t('connection.failed')
            : t('connection.waiting')}
      </Badge>
      {failed ? <p role="alert">{t('connection.failedDescription')}</p> : null}
      {!online && !failed ? (
        <p className="text-sm text-muted-foreground">
          {diagnostics ? t('connection.offlineDescription') : t('connection.noData')}
        </p>
      ) : null}
      {online ? <p className="text-sm text-muted-foreground">{t('connection.ready')}</p> : null}
      {diagnostics?.lastErrorCode ? (
        <p className="text-sm text-destructive">
          {t(`errors.${diagnostics.lastErrorCode}`, {
            defaultValue: t('errors.generic', { code: diagnostics.lastErrorCode }),
          })}
          {diagnostics.lastErrorAt ? ` · ${formatTime(diagnostics.lastErrorAt)}` : ''}
        </p>
      ) : null}
      {diagnostics?.pendingEvents ? (
        <p className="text-xs text-muted-foreground">
          {t('connection.pendingEvents', { count: diagnostics.pendingEvents })}
        </p>
      ) : null}
      {!online ? (
        <Button
          {...testId(testIds.onboarding.retry)}
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={onRetry}
        >
          <RefreshCw aria-hidden="true" />
          {t('checkAgain')}
        </Button>
      ) : null}
    </div>
  )
}
