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
import { TokenCloseConfirmation } from './TokenCloseConfirmation'

export const CreateBotDialog = ({
  open,
  onOpenChange,
  onCreated,
  webSocketUrl,
  diagnostics,
  diagnosticsFailed,
  onRetry,
  onFinished,
  returnFocusTo,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (issued: IssuedBotToken) => void
  webSocketUrl: string
  diagnostics?: Awaited<ReturnType<typeof fetchAdminBotDiagnostics>>
  diagnosticsFailed: boolean
  onRetry: () => void
  onFinished: () => void
  returnFocusTo: RefObject<HTMLElement | null>
}) => {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)
  const [issued, setIssued] = useState<IssuedBotToken>()
  const [tokenSaved, setTokenSaved] = useState(false)
  const [closePending, setClosePending] = useState(false)

  const close = () => {
    setIssued(undefined)
    setTokenSaved(false)
    setClosePending(false)
    onOpenChange(false)
    onFinished()
  }
  const requestClose = () => {
    if (pending) return
    if (issued && !tokenSaved && !closePending) {
      setClosePending(true)
      return
    }
    close()
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
      setTokenSaved(false)
      setClosePending(false)
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
        className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusTo.current?.focus()
        }}
        onEscapeKeyDown={(event) => {
          if (issued && !tokenSaved && !closePending) {
            event.preventDefault()
            requestClose()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {issued ? t('onboarding:setupTitle', { name: issued.bot.name }) : t('admin:createBot')}
          </DialogTitle>
          <DialogDescription>
            {issued ? t('onboarding:setupDescription') : t('settings:createBotDescription')}
          </DialogDescription>
        </DialogHeader>
        {issued ? (
          <>
            <BotSetupSteps
              issued={issued}
              webSocketUrl={webSocketUrl}
              diagnostics={diagnostics}
              failed={diagnosticsFailed}
              tokenSaved={tokenSaved}
              onTokenSaved={() => {
                setTokenSaved(true)
                setClosePending(false)
              }}
              onRetry={onRetry}
              onFinished={close}
            />
            {closePending ? (
              <TokenCloseConfirmation onCancel={() => setClosePending(false)} onConfirm={close} />
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
          </>
        ) : (
          <form className="grid gap-4" onSubmit={submit}>
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
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pending}>
                  {t('chat:cancel')}
                </Button>
              </DialogClose>
              <Button
                {...testId(testIds.onboarding.submit)}
                type="submit"
                disabled={pending}
                className="min-h-11"
              >
                {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
                {t('admin:createBot')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
