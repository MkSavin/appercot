import { useTranslation } from 'react-i18next'
import { editBotInviteRequest, revokeBotInviteRequest } from '@/entities/bot'
import { InvitationList } from '@/shared/ui/invitation-list'
import { InviteRoleChoices, readBotInviteRole } from '@/shared/ui/invite-fields'
import type { BotInvitation, BotMemberships } from './types'

export const BotInvitationsSection = ({
  botId,
  memberships,
  links,
  onChange,
}: {
  botId: string
  memberships: BotMemberships
  links: BotInvitation[]
  onChange: (links: BotInvitation[]) => void
}) => {
  const { t } = useTranslation()
  return (
    <section className="grid gap-3">
      <h2 className="text-base font-semibold">{t('bot:invitations')}</h2>
      <InvitationList
        rows={links.map((link) => ({
          ...link,
          roles: link.roles.map(
            (code) => memberships.roleDefinitions.find((item) => item.code === code)?.name ?? code,
          ),
          roleCodes: link.roles,
        }))}
        roleFields={(link) => (
          <InviteRoleChoices options={memberships.roleDefinitions} selected={link.roleCodes} />
        )}
        onEdit={async (link, data, limits) => {
          const changed = await editBotInviteRequest(
            botId,
            link.id,
            readBotInviteRole(data),
            limits,
          )
          onChange(links.map((row) => (row.id === changed.id ? changed : row)))
        }}
        onRevoke={async (link) => {
          await revokeBotInviteRequest(botId, link.id)
          onChange(
            links.map((row) => (row.id === link.id ? { ...row, revokedAt: Date.now() } : row)),
          )
        }}
      />
    </section>
  )
}
