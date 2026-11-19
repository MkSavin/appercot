import { LockKeyhole, UnlockKeyhole } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { setBotAccessRequest, setBotGuestAccessRequest } from '@/entities/bot'
import { ChoiceCards } from '@/shared/ui/choice-cards'
import type { AdminBot, RunBotOperation } from './types'

export const BotAccessSettings = ({
  bot,
  pending,
  run,
  onChange,
}: {
  bot: AdminBot
  pending: boolean
  run: RunBotOperation
  onChange: (bot: AdminBot) => void
}) => {
  const { t } = useTranslation()
  const accessChoices = [
    {
      value: 'public',
      label: t('settings:public'),
      description: t('settings:publicDescription'),
      icon: UnlockKeyhole,
    },
    {
      value: 'by_link',
      label: t('settings:byLink'),
      description: t('settings:byLinkDescription'),
      icon: LockKeyhole,
    },
  ] as const
  return (
    <section aria-labelledby="bot-access-title" className="grid gap-3">
      <h2 id="bot-access-title" className="text-base font-semibold">
        {t('settings:botAccess')}
      </h2>
      <ChoiceCards
        name="bot-access"
        label={t('settings:botAccess')}
        value={bot.access}
        options={accessChoices}
        disabled={pending}
        className="sm:grid-cols-2"
        onChange={(access) =>
          void run(async () => {
            const changed = await setBotAccessRequest(bot.id, access)
            onChange({ ...bot, ...changed })
          })
        }
      />
      {bot.access === 'public' ? (
        <div className="settings-card grid gap-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={bot.guestAccess}
              disabled={pending}
              onChange={(event) => {
                const enabled = event.currentTarget.checked
                void run(async () =>
                  onChange({ ...bot, ...(await setBotGuestAccessRequest(bot.id, enabled)) }),
                )
              }}
            />
            {t('bot:guestAccess')}
          </label>
          <p className="text-xs text-muted-foreground">{t('bot:guestAccessHint')}</p>
          {bot.guestAccess ? (
            <a
              className="w-fit text-sm text-primary underline"
              href={`/guest/${bot.username}`}
              target="_blank"
              rel="noreferrer"
            >
              {t('bot:openGuest')}
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
