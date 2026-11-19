import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchAdminBot,
  fetchBotInvitations,
  type IssuedBotToken,
  resetBotTokenRequest,
  setBotOwnerRequest,
} from '@/entities/bot'
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
import { Input } from '@/shared/ui/input'
import type { AdminBot, BotInvitation, RunBotOperation } from './types'

export const BotConnectionSettings = ({
  bot,
  isOwner,
  pending,
  run,
  onBotChange,
  onLinksChange,
  onIssued,
}: {
  bot: AdminBot
  isOwner: boolean
  pending: boolean
  run: RunBotOperation
  onBotChange: (bot: AdminBot) => void
  onLinksChange: (links: BotInvitation[]) => void
  onIssued: (token: IssuedBotToken) => void
}) => {
  const { t } = useTranslation()
  const [ownerChanged, setOwnerChanged] = useState(false)
  return (
    <section aria-labelledby="bot-connection-title" className="grid gap-3">
      <h2 id="bot-connection-title" className="text-base font-semibold">
        {t('settings:botConnection')}
      </h2>
      <div className="settings-card grid justify-items-start gap-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={pending}>
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
                  })
                }
              >
                {t('admin:resetToken')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {isOwner ? (
          <form
            className="grid w-full items-start gap-2 border-t pt-4 sm:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              void run(async () => {
                await setBotOwnerRequest(bot.id, String(form.get('owner')).trim().replace(/^@/, ''))
                setOwnerChanged(true)
                onBotChange(await fetchAdminBot(bot.id))
                onLinksChange(await fetchBotInvitations(bot.id))
              })
            }}
          >
            <label htmlFor="bot-new-owner" className="text-sm font-medium sm:col-span-2">
              {t('admin:owner')}
            </label>
            <Input id="bot-new-owner" name="owner" autoCapitalize="none" spellCheck={false} />
            <Button type="submit" variant="outline" disabled={pending}>
              {t('admin:saveOwner')}
            </Button>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              {t('settings:transferHint')}
            </p>
            {ownerChanged ? (
              <p role="status" className="text-sm text-muted-foreground">
                {t('settings:ownerSaved')}
              </p>
            ) : null}
          </form>
        ) : null}
      </div>
    </section>
  )
}
