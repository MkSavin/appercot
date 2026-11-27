import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'wouter'
import { deleteBotRequest, setBotStoppedRequest } from '@/entities/bot'
import { useChatStore } from '@/entities/chat'
import { durableMessagingFor } from '@/features/send-message'
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
import { FieldSeparator } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { SettingsRow } from '../account/SettingsRow'
import type { AdminBot, RunBotOperation } from './types'

export const BotDangerZone = ({
  bot,
  pending,
  run,
  onBotChange,
}: {
  bot: AdminBot
  pending: boolean
  run: RunBotOperation
  onBotChange: (bot: AdminBot) => void
}) => {
  const { t } = useTranslation('settings')
  const [, navigate] = useLocation()
  const [stopOpen, setStopOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')

  return (
    <section aria-labelledby="bot-danger-title" className="grid gap-3">
      <h2 id="bot-danger-title" className="text-base font-semibold text-destructive">
        {t('dangerZone')}
      </h2>
      <div className="settings-card grid gap-4 border-destructive/50">
        <SettingsRow
          title={bot.stopped ? t('resumeBot') : t('stopBot')}
          description={bot.stopped ? t('resumeBotDescription') : t('stopBotDescription')}
        >
          <AlertDialog
            open={stopOpen}
            onOpenChange={(open) => {
              if (!pending) setStopOpen(open)
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                {...testId(bot.stopped ? testIds.settings.bot.resume : testIds.settings.bot.stop)}
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={pending}
              >
                {bot.stopped ? t('resumeBot') : t('stopBot')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {bot.stopped
                    ? t('resumeBotTitle', { name: bot.name })
                    : t('stopBotTitle', { name: bot.name })}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {bot.stopped ? t('resumeBotConfirmation') : t('stopBotConfirmation')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>{t('chat:cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  variant={bot.stopped ? 'default' : 'destructive'}
                  disabled={pending}
                  onClick={(event) => {
                    event.preventDefault()
                    void run(async () => {
                      onBotChange(await setBotStoppedRequest(bot.id, !bot.stopped))
                      setStopOpen(false)
                    })
                  }}
                >
                  {bot.stopped ? t('resumeBot') : t('stopBot')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SettingsRow>
        <FieldSeparator />
        <SettingsRow title={t('deleteBot')} description={t('deleteBotDescription')}>
          <AlertDialog
            open={deleteOpen}
            onOpenChange={(open) => {
              if (pending) return
              setDeleteOpen(open)
              if (!open) setConfirmation('')
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                {...testId(testIds.settings.bot.delete)}
                variant="destructive"
                disabled={pending}
              >
                {t('deleteBot')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteBotTitle', { name: bot.name })}</AlertDialogTitle>
                <AlertDialogDescription>{t('deleteBotConfirmation')}</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-2">
                <label htmlFor="delete-bot-confirmation" className="text-sm font-medium">
                  {t('deleteBotConfirmationLabel', { username: bot.username })}
                </label>
                <Input
                  {...testId(testIds.settings.bot.deleteConfirmation)}
                  id="delete-bot-confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.currentTarget.value)}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={bot.username}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>{t('chat:cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={pending || confirmation !== bot.username}
                  onClick={(event) => {
                    event.preventDefault()
                    void run(async () => {
                      await deleteBotRequest(bot.id)
                      const store = useChatStore
                      const chats = store.getState().chats.filter((chat) => chat.bot.id === bot.id)
                      const durable = durableMessagingFor(store)
                      for (const chat of chats) {
                        await durable?.discardChat(chat.id)
                        store.getState().removeChat(chat.id)
                      }
                      setDeleteOpen(false)
                      navigate('/settings/bots', { replace: true })
                    })
                  }}
                >
                  {t('deleteBot')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SettingsRow>
      </div>
    </section>
  )
}
