import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { IssuedBotToken } from '@/entities/bot'
import { useChatStore } from '@/entities/chat'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useBotDiagnostics } from '../model/use-bot-diagnostics'
import { BotSetupSteps } from './BotSetupSteps'
import { TokenCloseConfirmation } from './TokenCloseConfirmation'

export const BotSetupDialog = ({
  issued,
  onClose,
}: {
  issued: IssuedBotToken
  onClose: () => void
}) => {
  const { t } = useTranslation('onboarding')
  const webSocketUrl = useChatStore((state) => state.botWebSocketUrl)
  const { diagnostics, failed, retry } = useBotDiagnostics(issued.bot.id, true)
  const [tokenSaved, setTokenSaved] = useState(false)
  const [closePending, setClosePending] = useState(false)

  const requestClose = () => {
    if (!tokenSaved && !closePending) {
      setClosePending(true)
      return
    }
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent
        {...testId(testIds.onboarding.dialog)}
        className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
        onEscapeKeyDown={(event) => {
          if (!tokenSaved && !closePending) {
            event.preventDefault()
            requestClose()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('setupTitle', { name: issued.bot.name })}</DialogTitle>
          <DialogDescription>{t('setupDescription')}</DialogDescription>
        </DialogHeader>
        {webSocketUrl ? (
          <BotSetupSteps
            issued={issued}
            webSocketUrl={webSocketUrl}
            diagnostics={diagnostics}
            failed={failed}
            tokenSaved={tokenSaved}
            onTokenSaved={() => {
              setTokenSaved(true)
              setClosePending(false)
            }}
            onRetry={retry}
            onFinished={onClose}
          />
        ) : null}
        {closePending ? (
          <TokenCloseConfirmation onCancel={() => setClosePending(false)} onConfirm={onClose} />
        ) : null}
        <DialogFooter>
          <Button
            {...testId(testIds.onboarding.close)}
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={requestClose}
          >
            {t('common:close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
