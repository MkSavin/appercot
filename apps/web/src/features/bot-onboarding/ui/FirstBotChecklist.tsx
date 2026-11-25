import { Check, Circle, ExternalLink, MessageCircle, Plus, Settings, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import type { fetchAdminBotDiagnostics, ManagedBot } from '@/entities/bot'
import { resourceUrls } from '@/shared/config/resources'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Button } from '@/shared/ui/button'
import { getOnboardingSteps } from '../model/onboarding'
import { useOpenBotChat } from '../model/use-open-bot-chat'
import { BotConnectionStatus } from './BotConnectionStatus'

export const FirstBotChecklist = ({
  bot,
  diagnostics,
  diagnosticsFailed,
  online,
  onCreate,
  onRetry,
  onDismiss,
  onFinished,
}: {
  bot?: ManagedBot
  diagnostics?: Awaited<ReturnType<typeof fetchAdminBotDiagnostics>>
  diagnosticsFailed: boolean
  online: boolean
  onCreate: () => void
  onRetry: () => void
  onDismiss: () => void
  onFinished: () => void
}) => {
  const { t } = useTranslation('onboarding')
  const { pending, openChat } = useOpenBotChat()
  const steps = getOnboardingSteps(Boolean(bot), online)
  const labels = [t('steps.create'), t('steps.connect'), t('steps.chat')]

  return (
    <section
      {...testId(testIds.onboarding.checklist)}
      aria-labelledby="first-bot-title"
      className="settings-card grid min-w-0 gap-4 border-primary/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="first-bot-title" className="text-base font-semibold">
            {t('title')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Button
          {...testId(testIds.onboarding.dismiss)}
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          aria-label={t('dismiss')}
          onClick={onDismiss}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <ol className="grid gap-2">
        {labels.map((label, index) => {
          const state = steps[index]
          return (
            <li key={label} className="flex items-center gap-2 text-sm">
              {state === 'done' ? (
                <Check aria-hidden="true" className="size-4 shrink-0 text-primary" />
              ) : (
                <Circle
                  aria-hidden="true"
                  className={
                    state === 'current'
                      ? 'size-4 shrink-0 text-primary'
                      : 'size-4 shrink-0 text-muted-foreground'
                  }
                />
              )}
              <span className={state === 'upcoming' ? 'text-muted-foreground' : undefined}>
                {label}
              </span>
              <span className="sr-only">{t(`stepState.${state}`)}</span>
            </li>
          )
        })}
      </ol>
      {bot ? (
        <>
          <BotConnectionStatus
            diagnostics={diagnostics}
            fallbackOnline={online}
            failed={diagnosticsFailed}
            onRetry={onRetry}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button variant="outline" asChild className="min-h-11">
              <Link href={`/settings/bots/${bot.id}`}>
                <Settings aria-hidden="true" />
                {t('openSettings')}
              </Link>
            </Button>
            {online ? (
              <Button
                {...testId(testIds.onboarding.openChat)}
                type="button"
                className="min-h-11"
                disabled={pending}
                onClick={() =>
                  void openChat(bot).then((opened) => {
                    if (opened) onFinished()
                  })
                }
              >
                <MessageCircle aria-hidden="true" />
                {t('openChat')}
              </Button>
            ) : null}
          </div>
        </>
      ) : (
        <Button
          {...testId(testIds.onboarding.createFirst)}
          type="button"
          className="min-h-11 justify-self-start"
          onClick={onCreate}
        >
          <Plus aria-hidden="true" />
          {t('createFirst')}
        </Button>
      )}
      <a
        href={resourceUrls.connectionTroubleshooting}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center gap-2 justify-self-start text-sm text-primary underline-offset-4 hover:underline"
      >
        {t('troubleshooting')}
        <ExternalLink aria-hidden="true" className="size-4" />
      </a>
    </section>
  )
}
