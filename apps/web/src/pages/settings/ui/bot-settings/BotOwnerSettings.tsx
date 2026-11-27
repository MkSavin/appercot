import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchAdminBot, fetchBotInvitations, setBotOwnerRequest } from '@/entities/bot'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import type { AdminBot, BotInvitation, RunBotOperation } from './types'

export const BotOwnerSettings = ({
  bot,
  pending,
  run,
  onBotChange,
  onLinksChange,
}: {
  bot: AdminBot
  pending: boolean
  run: RunBotOperation
  onBotChange: (bot: AdminBot) => void
  onLinksChange: (links: BotInvitation[]) => void
}) => {
  const { t } = useTranslation()
  const [ownerChanged, setOwnerChanged] = useState(false)

  return (
    <section aria-labelledby="bot-owner-title" className="grid gap-3">
      <h2 id="bot-owner-title" className="text-base font-semibold">
        {t('settings:botOwner')}
      </h2>
      <div className="settings-card">
        <form
          className="grid w-full items-start gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
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
          <Button
            {...testId(testIds.settings.save)}
            type="submit"
            variant="outline"
            disabled={pending}
          >
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
      </div>
    </section>
  )
}
