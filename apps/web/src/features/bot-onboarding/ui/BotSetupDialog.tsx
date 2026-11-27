import { useTranslation } from 'react-i18next'
import type { IssuedBotToken } from '@/entities/bot'
import { useChatStore } from '@/entities/chat'
import { testId, testIds } from '@/shared/lib/test-ids'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useBotDiagnostics } from '../model/use-bot-diagnostics'
import { BotSetupSteps } from './BotSetupSteps'

export const BotSetupDialog = ({
  issued,
  onClose,
}: {
  issued: IssuedBotToken
  onClose: () => void
}) => {
  const { t } = useTranslation('onboarding')
  const webSocketUrl = useChatStore((state) => state.botWebSocketUrl)
  const { diagnostics, failed, loading, retry } = useBotDiagnostics(issued.bot.id, true, false)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        {...testId(testIds.onboarding.dialog)}
        className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogHeader className="shrink-0 p-6">
          <DialogTitle>{t('setupTitle', { name: issued.bot.name })}</DialogTitle>
          <DialogDescription className="sr-only">{t('setupDescription')}</DialogDescription>
        </DialogHeader>
        {webSocketUrl ? (
          <BotSetupSteps
            issued={issued}
            webSocketUrl={webSocketUrl}
            diagnostics={diagnostics}
            failed={failed}
            checking={loading}
            onRetry={retry}
            onFinished={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
