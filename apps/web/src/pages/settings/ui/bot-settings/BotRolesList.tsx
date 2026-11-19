import { useTranslation } from 'react-i18next'
import { Badge } from '@/shared/ui/badge'
import type { BotMemberships } from './types'

export const BotRolesList = ({ memberships }: { memberships: BotMemberships }) => {
  const { t } = useTranslation()
  return (
    <section className="grid gap-3">
      <h2 className="text-base font-semibold">{t('bot:roles')}</h2>
      <ul className="settings-card divide-y py-1">
        {memberships.roleDefinitions.map(({ code, name, virtual }) => (
          <li
            key={code}
            className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
          >
            <span className="flex items-center gap-2">
              {name}
              {virtual ? <Badge variant="outline">{t('bot:systemRole')}</Badge> : null}
            </span>
            <code className="text-xs text-muted-foreground">{code}</code>
          </li>
        ))}
      </ul>
    </section>
  )
}
