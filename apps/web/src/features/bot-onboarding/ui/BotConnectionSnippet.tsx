import { Check, Copy, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { createBotLaunchCommand } from '../model/onboarding'

type CopyStatus = 'idle' | 'copied' | 'failed'

const CopyValueButton = ({
  value,
  label,
  testID,
  onCopied,
}: {
  value: string
  label: string
  testID: string
  onCopied?: () => void
}) => {
  const { t } = useTranslation('onboarding')
  const [status, setStatus] = useState<CopyStatus>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(
    () => () => {
      if (timer.current !== undefined) clearTimeout(timer.current)
    },
    [],
  )

  const copy = async () => {
    if (timer.current !== undefined) clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(value)
      setStatus('copied')
      onCopied?.()
    } catch {
      setStatus('failed')
    }
    timer.current = setTimeout(() => setStatus('idle'), 2500)
  }

  const Icon = status === 'copied' ? Check : status === 'failed' ? X : Copy
  return (
    <div className="grid justify-items-start gap-1">
      <Button
        {...testId(testID)}
        type="button"
        data-copy-status={status}
        variant="outline"
        className="min-h-11"
        onClick={copy}
      >
        <Icon aria-hidden="true" />
        {status === 'copied' ? t('copied') : status === 'failed' ? t('copyManually') : label}
      </Button>
      <span role="status" className="text-xs text-muted-foreground">
        {status === 'failed' ? t('copyFailed') : ''}
      </span>
    </div>
  )
}

export const BotConnectionSnippet = ({
  token,
  webSocketUrl,
  onTokenSaved,
}: {
  token: string
  webSocketUrl: string
  onTokenSaved: () => void
}) => {
  const { t } = useTranslation('onboarding')
  const command = createBotLaunchCommand(token, webSocketUrl)
  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-2">
        <label htmlFor="onboarding-bot-token" className="text-sm font-medium">
          BOT_TOKEN
        </label>
        <Textarea
          {...testId(testIds.onboarding.token)}
          id="onboarding-bot-token"
          value={token}
          readOnly
          onCopy={onTokenSaved}
          onFocus={(event) => event.currentTarget.select()}
          className="min-h-20 font-mono text-xs break-all"
        />
        <CopyValueButton
          value={token}
          label={t('copy.token')}
          testID={testIds.onboarding.copyToken}
          onCopied={onTokenSaved}
        />
      </div>
      <div className="grid min-w-0 gap-2">
        <label htmlFor="onboarding-bot-url" className="text-sm font-medium">
          BOT_URL
        </label>
        <Input
          {...testId(testIds.onboarding.url)}
          id="onboarding-bot-url"
          value={webSocketUrl}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
          className="h-auto min-h-11 font-mono text-xs break-all"
        />
        <CopyValueButton
          value={webSocketUrl}
          label={t('copy.url')}
          testID={testIds.onboarding.copyUrl}
        />
      </div>
      <div className="grid min-w-0 gap-2">
        <label htmlFor="onboarding-command" className="text-sm font-medium">
          {t('commandLabel')}
        </label>
        <Textarea
          {...testId(testIds.onboarding.command)}
          id="onboarding-command"
          value={command}
          readOnly
          onCopy={onTokenSaved}
          onFocus={(event) => event.currentTarget.select()}
          className="min-h-28 font-mono text-xs break-all"
        />
        <CopyValueButton
          value={command}
          label={t('copy.command')}
          testID={testIds.onboarding.copyCommand}
          onCopied={onTokenSaved}
        />
        <p className="text-xs text-muted-foreground">{t('commandHint')}</p>
      </div>
    </div>
  )
}
