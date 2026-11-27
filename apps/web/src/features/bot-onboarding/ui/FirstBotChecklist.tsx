import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ExternalLink,
  LoaderCircle,
  Plus,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { resourceUrls } from '@/shared/config'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Button } from '@/shared/ui/button'
import { getOnboardingSteps, type OnboardingStepState } from '../model/onboarding'

const CircularProgress = ({ value }: { value: number }) => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 -rotate-90">
    <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2" className="stroke-muted" />
    <circle
      cx="10"
      cy="10"
      r="8"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      pathLength="100"
      strokeDasharray="100"
      strokeDashoffset={100 - value}
      className="stroke-primary"
    />
  </svg>
)

const StepIcon = ({ state, waiting }: { state: OnboardingStepState; waiting: boolean }) => {
  if (state === 'done')
    return <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-primary" />
  if (waiting)
    return <LoaderCircle aria-hidden="true" className="size-5 shrink-0 animate-spin text-primary" />
  return (
    <Circle
      aria-hidden="true"
      className={
        state === 'upcoming'
          ? 'size-5 shrink-0 text-muted-foreground'
          : 'size-5 shrink-0 text-primary'
      }
    />
  )
}

const stepNames = ['create', 'connect', 'chat'] as const

export const FirstBotChecklist = ({
  created,
  connected,
  chatted,
  onCreate,
}: {
  created: boolean
  connected: boolean
  chatted: boolean
  onCreate: () => void
}) => {
  const { t } = useTranslation('onboarding')
  const [collapsed, setCollapsed] = useState(false)
  const steps = getOnboardingSteps(created, connected, chatted)
  const doneCount = steps.filter((state) => state === 'done').length
  const progress = Math.round((doneCount / steps.length) * 100)
  const ToggleIcon = collapsed ? ChevronDown : ChevronUp

  return (
    <section
      {...testId(testIds.onboarding.checklist)}
      aria-labelledby="first-bot-title"
      className="settings-card group/checklist grid min-w-0 gap-4 border-primary/30"
    >
      <div className="relative min-w-0">
        <button
          {...testId(testIds.onboarding.toggle)}
          type="button"
          className="absolute inset-0 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label={collapsed ? t('expand') : t('collapse')}
          aria-expanded={!collapsed}
          aria-controls="first-bot-content"
          onClick={() => setCollapsed((current) => !current)}
        />
        <div className="pointer-events-none relative flex min-h-5 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {collapsed ? <CircularProgress value={progress} /> : null}
            <h2 id="first-bot-title" className="truncate text-base font-semibold">
              {t('title')}
            </h2>
          </div>
          <div className="relative flex size-5 shrink-0 items-center justify-end">
            <span className="text-sm whitespace-nowrap text-muted-foreground group-hover/checklist:invisible group-focus-within/checklist:invisible">
              {t('progress', { done: doneCount, total: steps.length })}
            </span>
            <ToggleIcon
              aria-hidden="true"
              className="absolute right-0 size-5 text-muted-foreground opacity-0 group-hover/checklist:opacity-100 group-focus-within/checklist:opacity-100"
            />
          </div>
        </div>
        {!collapsed ? (
          <p className="pointer-events-none relative mt-1 text-sm text-muted-foreground">
            {t('description')}{' '}
            <a
              href={resourceUrls.connectionTroubleshooting}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
            >
              {t('troubleshooting')}
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          </p>
        ) : null}
      </div>
      {!collapsed ? (
        <div id="first-bot-content" className="grid gap-4">
          <ol className="grid gap-3">
            {steps.map((state, index) => {
              const name = stepNames[index] ?? 'create'
              return (
                <li key={name} className="flex items-center gap-3 text-sm">
                  <StepIcon state={state} waiting={name === 'connect' && state === 'current'} />
                  <span className={state === 'upcoming' ? 'text-muted-foreground' : undefined}>
                    {t(`steps.${name}.${state === 'done' ? 'done' : 'pending'}`)}
                  </span>
                  <span className="sr-only">{t(`stepState.${state}`)}</span>
                </li>
              )
            })}
          </ol>
          {!created ? (
            <Button
              {...testId(testIds.onboarding.createFirst)}
              type="button"
              className="min-h-11 justify-self-start"
              onClick={onCreate}
            >
              <Plus aria-hidden="true" />
              {t('createFirst')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
