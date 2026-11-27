import { Check, LoaderCircle, Plug, RefreshCw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Button } from '@/shared/ui/button'

export type BotConnectionState = 'idle' | 'checking' | 'online' | 'failed'

export const BotConnectionCheck = ({
  state,
  onCheck,
  disabled = false,
}: {
  state: BotConnectionState
  onCheck: () => void
  disabled?: boolean
}) => {
  const { t } = useTranslation('onboarding')
  const checking = state === 'checking'
  const finished = state === 'online' || state === 'failed'

  return (
    <div
      {...testId(testIds.onboarding.status)}
      data-online={state === 'online'}
      data-state={state}
      className="flex min-w-0 flex-wrap items-center justify-between gap-3"
    >
      <h3 className="text-sm font-medium">{t('connection.title')}</h3>
      {finished ? (
        <div className="flex flex-wrap items-center gap-3">
          <span
            role="status"
            className={
              state === 'online'
                ? 'inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300'
                : 'inline-flex items-center gap-2 text-sm font-medium text-destructive'
            }
          >
            {state === 'online' ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <X aria-hidden="true" className="size-4" />
            )}
            {state === 'online' ? t('connection.connected') : t('connection.unavailable')}
          </span>
          <Button
            {...testId(testIds.onboarding.refreshConnection)}
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={onCheck}
          >
            <RefreshCw aria-hidden="true" />
            {t('connection.refresh')}
          </Button>
        </div>
      ) : (
        <Button
          {...testId(testIds.onboarding.checkConnection)}
          type="button"
          variant="outline"
          disabled={disabled || checking}
          onClick={onCheck}
        >
          {checking ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : (
            <Plug aria-hidden="true" />
          )}
          {checking ? t('connection.checking') : t('connection.check')}
        </Button>
      )}
    </div>
  )
}
