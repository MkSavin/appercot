import { useTranslation } from 'react-i18next'
import type { fetchBotMemberships } from '@/entities/bot'
import { BotMemberRow } from './BotMemberRow'

type Memberships = Awaited<ReturnType<typeof fetchBotMemberships>>

export const BotMembersPanel = ({ botId, data }: { botId: string; data: Memberships }) => {
  const { t } = useTranslation()
  if (!data.members.length)
    return <p className="text-sm text-muted-foreground">{t('settings:noBotMembers')}</p>
  return (
    <ul className="grid gap-2">
      {data.members.map((member) => (
        <BotMemberRow
          key={JSON.stringify([member.chatId, member.revoked, member.roles])}
          botId={botId}
          member={member}
          availableRoles={data.roleDefinitions}
        />
      ))}
    </ul>
  )
}
