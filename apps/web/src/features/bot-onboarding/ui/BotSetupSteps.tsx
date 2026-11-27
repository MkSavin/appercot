import { CheckCircle2, Globe2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  BotConnectionCheck,
  type BotConnectionState,
  BotTokenField,
  type fetchAdminBotDiagnostics,
  type IssuedBotToken,
} from '@/entities/bot'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Button } from '@/shared/ui/button'
import { CopyIconButton } from '@/shared/ui/copy-icon-button'
import { DialogFooter } from '@/shared/ui/dialog'
import { Field, FieldLabel } from '@/shared/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/shared/ui/input-group'
import { OnboardingGuideLink } from './OnboardingGuideLink'

export const BotSetupSteps = ({
  issued,
  webSocketUrl,
  diagnostics,
  failed,
  checking,
  onRetry,
  onFinished,
}: {
  issued: IssuedBotToken
  webSocketUrl: string
  diagnostics?: Awaited<ReturnType<typeof fetchAdminBotDiagnostics>>
  failed: boolean
  checking: boolean
  onRetry: () => void
  onFinished: () => void
}) => {
  const { t } = useTranslation()
  const online = diagnostics?.online ?? issued.bot.online
  const connectionState: BotConnectionState = checking
    ? 'checking'
    : failed
      ? 'failed'
      : online
        ? 'online'
        : diagnostics
          ? 'failed'
          : 'idle'

  return (
    <>
      <div className="grid min-h-0 min-w-0 flex-1 content-start gap-5 overflow-y-auto px-6 py-5">
        <p className="flex items-center gap-3 rounded-lg bg-emerald-500/10 p-3 text-sm font-medium text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
          {t('onboarding:createdConfirmation')}
        </p>
        <Field>
          <FieldLabel htmlFor="onboarding-bot-url">Endpoint</FieldLabel>
          <InputGroup className="h-12 px-2">
            <InputGroupAddon className="pl-1">
              <Globe2 aria-hidden="true" className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              {...testId(testIds.onboarding.url)}
              id="onboarding-bot-url"
              value={webSocketUrl}
              readOnly
              autoCapitalize="none"
              spellCheck={false}
              className="font-mono text-sm"
            />
            <CopyIconButton
              text={webSocketUrl}
              label={t('onboarding:copy.url')}
              testID={testIds.onboarding.copyUrl}
            />
          </InputGroup>
        </Field>
        <BotTokenField token={issued.token} />
        <hr />
        <BotConnectionCheck state={connectionState} onCheck={onRetry} />
      </div>
      <DialogFooter className="shrink-0 flex-row items-center justify-between gap-3 border-t bg-background p-4 sm:justify-between">
        <OnboardingGuideLink />
        <Button
          {...testId(testIds.onboarding.close)}
          type="button"
          size="lg"
          className="min-h-11"
          onClick={onFinished}
        >
          {t('common:done')}
        </Button>
      </DialogFooter>
    </>
  )
}
