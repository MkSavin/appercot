import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from './input'

export const InviteLimits = ({
  maxUses,
  initialDays,
  editing = false,
  single = false,
}: {
  maxUses?: number | null
  initialDays?: number
  editing?: boolean
  single?: boolean
}) => {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="grid items-start gap-3 sm:grid-cols-2">
      {single ? (
        <input type="hidden" name="maxUses" value="1" />
      ) : (
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor={`${id}-max`}>
            {t('invitation:maxRecipients')}
          </label>
          <Input
            id={`${id}-max`}
            type="number"
            min={1}
            max={2147483647}
            name="maxUses"
            defaultValue={maxUses ?? undefined}
            placeholder={t('invitation:unlimited')}
          />
        </div>
      )}
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor={`${id}-days`}>
          {editing ? t('invitation:newDays') : t('admin:expiresInDays')}
        </label>
        <Input
          id={`${id}-days`}
          type="number"
          min={1}
          max={3650}
          name="expiresInDays"
          defaultValue={initialDays}
          placeholder={editing ? t('invitation:keepExpiry') : t('invitation:noExpiryPlaceholder')}
        />
        {editing ? (
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" name="noExpiry" />
            {t('invitation:makePermanent')}
          </label>
        ) : null}
      </div>
    </div>
  )
}
