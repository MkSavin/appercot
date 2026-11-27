import { Globe2, KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  BotConnectionCheck,
  type BotConnectionState,
  type IssuedBotToken,
  resetBotTokenRequest,
} from '@/entities/bot'
import { useChatStore } from '@/entities/chat'
import { useBotDiagnostics } from '@/features/bot-onboarding'
import { testId, testIds } from '@/shared/lib/test-ids'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'
import { CopyIconButton } from '@/shared/ui/copy-icon-button'
import { Field, FieldLabel, FieldSeparator } from '@/shared/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/shared/ui/input-group'
import { SettingsRow } from '../account/SettingsRow'
import type { AdminBot, RunBotOperation } from './types'

export const BotConnectionSettings = ({
  bot,
  pending,
  run,
  onBotChange,
  onIssued,
}: {
  bot: AdminBot
  pending: boolean
  run: RunBotOperation
  onBotChange: (bot: AdminBot) => void
  onIssued: (token: IssuedBotToken) => void
}) => {
  const { t } = useTranslation()
  const webSocketUrl = useChatStore((state) => state.botWebSocketUrl) ?? ''
  const { diagnostics, failed, loading, retry } = useBotDiagnostics(bot.id, true, false)
  const online = diagnostics?.online ?? bot.online
  const connectionState: BotConnectionState = loading
    ? 'checking'
    : failed
      ? 'failed'
      : online
        ? 'online'
        : diagnostics
          ? 'failed'
          : 'idle'

  return (
    <section aria-labelledby="bot-connection-title" className="grid gap-3">
      <h2 id="bot-connection-title" className="text-base font-semibold">
        {t('settings:botConnection')}
      </h2>
      <div className="settings-card grid gap-4">
        <Field>
          <FieldLabel htmlFor="settings-bot-url">Endpoint</FieldLabel>
          <InputGroup className="h-12 px-2">
            <InputGroupAddon className="pl-1">
              <Globe2 aria-hidden="true" className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              {...testId(testIds.settings.bot.endpoint)}
              id="settings-bot-url"
              value={webSocketUrl}
              readOnly
              autoCapitalize="none"
              spellCheck={false}
              className="font-mono text-sm"
            />
            <CopyIconButton
              text={webSocketUrl}
              label={t('onboarding:copy.url')}
              testID={testIds.settings.bot.copyEndpoint}
            />
          </InputGroup>
        </Field>
        <FieldSeparator />
        <SettingsRow title={t('admin:resetToken')} description={t('settings:rotateTokenHint')}>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                {...testId(testIds.settings.bot.resetToken)}
                variant="outline"
                disabled={pending}
              >
                <KeyRound aria-hidden="true" />
                {t('admin:resetToken')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('settings:rotateTokenTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('settings:rotateTokenDescription')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('chat:cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    void run(async () => {
                      const token = await resetBotTokenRequest(bot.id)
                      onIssued(token)
                      onBotChange({ ...bot, online: token.bot.online })
                      retry()
                    })
                  }
                >
                  {t('admin:resetToken')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SettingsRow>
        <FieldSeparator />
        <BotConnectionCheck state={connectionState} onCheck={retry} disabled={pending} />
      </div>
    </section>
  )
}
