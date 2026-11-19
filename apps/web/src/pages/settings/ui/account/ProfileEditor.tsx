import { type FormEvent, type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { saveProfile } from '@/entities/user'
import { showRequestError } from '@/shared/api'
import type { SessionUser } from '@/shared/model'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { FieldGroup, FieldSeparator } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { SettingsField } from '@/shared/ui/settings-field'
import { SettingsSection } from '@/shared/ui/settings-section'
import { Textarea } from '@/shared/ui/textarea'
import { formText } from '../../model/form'

export const ProfileEditor = ({
  user,
  onSave,
  admin = false,
  roleEditor,
}: {
  user: SessionUser
  onSave: (user: SessionUser) => void
  admin?: boolean
  roleEditor?: ReactNode
}) => {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setSaved(false)
    try {
      const next = await saveProfile(
        {
          displayName: formText(form, 'display-name'),
          username: formText(form, 'profile-username'),
          bio: formText(form, 'bio'),
        },
        admin ? user.id : undefined,
      )
      onSave(next)
      setSaved(true)
    } catch (error) {
      showRequestError(error)
    } finally {
      setPending(false)
    }
  }
  return (
    <SettingsSection title={t('account:profile')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{t('account:platformRole')}</span>
        {roleEditor ?? <Badge variant="secondary">{t(`settings:roles.${user.role}`)}</Badge>}
      </div>
      <FieldSeparator />
      <form className="grid gap-4" onSubmit={submit}>
        <FieldGroup>
          <SettingsField
            label={t('account:name')}
            name="display-name"
            description={t('account:nameHint')}
          >
            <Input
              id="display-name"
              aria-describedby="display-name-hint"
              name="display-name"
              defaultValue={user.displayName}
              required
              maxLength={100}
            />
          </SettingsField>
          <SettingsField
            label={t('account:username')}
            name="profile-username"
            description={t('account:usernameHint')}
          >
            <Input
              id="profile-username"
              aria-describedby="profile-username-hint"
              name="profile-username"
              defaultValue={user.username}
              required
              pattern="[A-Za-z0-9_]{3,32}"
              autoCapitalize="none"
              spellCheck={false}
            />
          </SettingsField>
          <SettingsField label={t('account:bio')} name="bio" description={t('account:bioHint')}>
            <Textarea
              id="bio"
              aria-describedby="bio-hint"
              name="bio"
              maxLength={500}
              defaultValue={user.bio ?? ''}
            />
          </SettingsField>
        </FieldGroup>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {t('common:save')}
          </Button>
          {saved ? (
            <p role="status" className="text-sm text-muted-foreground">
              {t('account:saved')}
            </p>
          ) : null}
        </div>
      </form>
    </SettingsSection>
  )
}
