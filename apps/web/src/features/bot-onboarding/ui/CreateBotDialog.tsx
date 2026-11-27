import { LoaderCircle } from 'lucide-react'
import { type RefObject, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createBotRequest,
  type fetchAdminBotDiagnostics,
  type IssuedBotToken,
} from '@/entities/bot'
import { showRequestError } from '@/shared/api'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { BotSetupSteps } from './BotSetupSteps'
import { OnboardingGuideLink } from './OnboardingGuideLink'

export const CreateBotDialog = ({
  open,
  onOpenChange,
  onCreated,
  webSocketUrl,
  diagnostics,
  diagnosticsFailed,
  diagnosticsLoading,
  onRetry,
  returnFocusTo,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (issued: IssuedBotToken) => void
  webSocketUrl: string
  diagnostics?: Awaited<ReturnType<typeof fetchAdminBotDiagnostics>>
  diagnosticsFailed: boolean
  diagnosticsLoading: boolean
  onRetry: () => void
  returnFocusTo: RefObject<HTMLElement | null>
}) => {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)
  const [issued, setIssued] = useState<IssuedBotToken>()

  const close = () => {
    setIssued(undefined)
    onOpenChange(false)
  }
  const requestClose = () => {
    if (!pending) close()
  }
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    try {
      const result = await createBotRequest({
        username: String(form.get('username')).trim(),
        name: String(form.get('name')),
        description: String(form.get('description')),
      })
      setIssued(result)
      onCreated(result)
    } catch (error) {
      showRequestError(error)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? onOpenChange(true) : requestClose())}>
      <DialogContent
        {...testId(testIds.onboarding.dialog)}
        className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusTo.current?.focus()
        }}
      >
        <DialogHeader className="shrink-0 p-6">
          <DialogTitle>
            {issued ? t('onboarding:setupTitle', { name: issued.bot.name }) : t('admin:createBot')}
          </DialogTitle>
          <DialogDescription className={issued ? 'sr-only' : undefined}>
            {issued ? t('onboarding:setupDescription') : t('settings:createBotDescription')}
          </DialogDescription>
        </DialogHeader>
        {issued ? (
          <BotSetupSteps
            issued={issued}
            webSocketUrl={webSocketUrl}
            diagnostics={diagnostics}
            failed={diagnosticsFailed}
            checking={diagnosticsLoading}
            onRetry={onRetry}
            onFinished={close}
          />
        ) : (
          <form className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto]" onSubmit={submit}>
            <div className="grid content-start gap-4 overflow-y-auto px-6 pb-6">
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <div className="grid content-start gap-2">
                  <label htmlFor="bot-name" className="text-sm font-medium">
                    {t('admin:botName')}
                  </label>
                  <Input
                    {...testId(testIds.onboarding.name)}
                    id="bot-name"
                    name="name"
                    required
                    maxLength={100}
                  />
                </div>
                <div className="grid content-start gap-2">
                  <label htmlFor="bot-username" className="text-sm font-medium">
                    {t('admin:botUsername')}
                  </label>
                  <Input
                    {...testId(testIds.onboarding.username)}
                    id="bot-username"
                    name="username"
                    required
                    pattern="[a-z][a-z0-9_]{2,31}bot"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-describedby="bot-username-help"
                  />
                  <p id="bot-username-help" className="text-xs text-muted-foreground">
                    {t('admin:botUsernameHint')}
                  </p>
                </div>
              </div>
              <div className="grid gap-2">
                <label htmlFor="bot-description" className="text-sm font-medium">
                  {t('admin:botDescription')}
                </label>
                <Textarea
                  {...testId(testIds.onboarding.description)}
                  id="bot-description"
                  name="description"
                  maxLength={1000}
                />
              </div>
            </div>
            <DialogFooter className="shrink-0 flex-row flex-wrap items-center justify-between gap-3 border-t p-4 sm:justify-between">
              <OnboardingGuideLink />
              <div className="grid grid-cols-2 gap-2">
                <DialogClose asChild>
                  <Button
                    {...testId(testIds.onboarding.cancel)}
                    type="button"
                    variant="outline"
                    size="lg"
                    className="min-h-11 w-full px-2 sm:w-32"
                    disabled={pending}
                  >
                    {t('chat:cancel')}
                  </Button>
                </DialogClose>
                <Button
                  {...testId(testIds.onboarding.submit)}
                  type="submit"
                  size="lg"
                  className="min-h-11 w-full px-2 sm:w-32"
                  disabled={pending}
                >
                  {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
                  {t('admin:createBot')}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
