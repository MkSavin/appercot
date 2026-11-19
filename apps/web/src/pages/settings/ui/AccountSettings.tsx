import { LucideComputer, LucideSmartphone } from 'lucide-react'
import qrcode from 'qrcode-generator'
import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { useChatStore } from '@/entities/chat'
import { logoutRequest } from '@/entities/session'
import {
  beginTotp,
  changePassword,
  deleteAccount,
  disableTotp,
  enableTotp,
  fetchAdminUser,
  listSessions,
  resetUserPassword,
  revokeSession,
  saveProfile,
  setUserRoleRequest,
} from '@/entities/user'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import type { SessionUser } from '@/shared/model'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import {
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  Field as UiField,
} from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'

const formText = (form: FormData, name: string) => String(form.get(name) ?? '')
const dateTime = new Intl.DateTimeFormat('ru', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const sessionDevice = (agent: string | null) => {
  if (!agent) return 'Неизвестное устройство'
  const browser = /Edg\//i.test(agent)
    ? 'Edge'
    : /OPR\//i.test(agent)
      ? 'Opera'
      : /(?:Chrome|CriOS)\//i.test(agent)
        ? 'Chrome'
        : /(?:Firefox|FxiOS)\//i.test(agent)
          ? 'Firefox'
          : /Safari\//i.test(agent)
            ? 'Safari'
            : undefined
  const platform = /Android/i.test(agent)
    ? 'Android'
    : /iPhone|iPad/i.test(agent)
      ? 'iOS'
      : /Windows/i.test(agent)
        ? 'Windows'
        : /Macintosh/i.test(agent)
          ? 'macOS'
          : /Linux/i.test(agent)
            ? 'Linux'
            : undefined
  return [browser, platform].filter(Boolean).join(' · ') || 'Неизвестное устройство'
}

const sessionDeviceType = (agent: string | null): 'mobile' | 'desktop' | 'unknown' => {
  if (!agent) return 'unknown'
  if (/Android|iPhone|iPad/i.test(agent)) return 'mobile'
  if (/Windows|Macintosh|Linux/i.test(agent)) return 'desktop'
  return 'unknown'
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="grid gap-3">
    <h2 className="text-base font-semibold">{title}</h2>
    <div className="settings-card grid gap-4">{children}</div>
  </section>
)

const Field = ({
  label,
  name,
  children,
  description,
}: {
  label: string
  name: string
  children: ReactNode
  description?: string
}) => (
  <UiField orientation={description ? 'responsive' : 'vertical'}>
    <div className={description ? '@sm/field-group:w-44 @sm/field-group:shrink-0' : undefined}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      {description ? <FieldDescription id={`${name}-hint`}>{description}</FieldDescription> : null}
    </div>
    <FieldContent>{children}</FieldContent>
  </UiField>
)

const SecuritySetting = ({
  title,
  description,
  children,
}: {
  title: ReactNode
  description: string
  children: ReactNode
}) => (
  <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
    <div className="min-w-52 flex-1">
      <h3 className="flex flex-wrap items-center gap-2 text-sm font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
    <div className="ml-auto shrink-0">{children}</div>
  </div>
)

const TotpQr = ({ username, secret }: { username: string; secret: string }) => {
  const qr = qrcode(0, 'M')
  const params = new URLSearchParams({ secret, issuer: 'Appercot' })
  qr.addData(`otpauth://totp/Appercot:${encodeURIComponent(username)}?${params}`)
  qr.make()
  return (
    <img
      src={qr.createDataURL(4, 16)}
      alt="QR-код настройки 2FA"
      className="size-40 rounded-md border bg-white [image-rendering:pixelated]"
    />
  )
}

const ProfileEditor = ({
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
    <Section title="Личные данные">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Роль на платформе</span>
        {roleEditor ?? <Badge variant="secondary">{strings.settings.roles[user.role]}</Badge>}
      </div>
      <FieldSeparator />
      <form className="grid gap-4" onSubmit={submit}>
        <FieldGroup>
          <Field label="Имя" name="display-name" description="Отображается в вашем профиле.">
            <Input
              id="display-name"
              aria-describedby="display-name-hint"
              name="display-name"
              defaultValue={user.displayName}
              required
              maxLength={100}
            />
          </Field>
          <Field
            label="Никнейм"
            name="profile-username"
            description="Используется для входа и приглашений по имени."
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
          </Field>
          <Field label="О себе" name="bio" description="Короткое описание вашего профиля.">
            <Textarea
              id="bio"
              aria-describedby="bio-hint"
              name="bio"
              maxLength={500}
              defaultValue={user.bio ?? ''}
            />
          </Field>
        </FieldGroup>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            Сохранить
          </Button>
          {saved ? (
            <p role="status" className="text-sm text-muted-foreground">
              Профиль сохранён
            </p>
          ) : null}
        </div>
      </form>
    </Section>
  )
}

const PasswordFields = ({
  twoFactor,
  current = true,
}: {
  twoFactor: boolean
  current?: boolean
}) => (
  <>
    {current ? (
      <Field name="account-password" label="Текущий пароль">
        <Input
          id="account-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
        />
      </Field>
    ) : null}
    {twoFactor ? (
      <Field name="account-otp" label="Код 2FA или резервный код">
        <Input id="account-otp" name="otp" autoComplete="one-time-code" required maxLength={64} />
      </Field>
    ) : null}
  </>
)

const AccountDialog = ({
  title,
  description,
  children,
  submit,
  destructive = false,
}: {
  title: string
  description: string
  children: ReactNode
  submit: (form: FormData) => Promise<void>
  destructive?: boolean
}) => {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value)
        }}
      >
        <DialogTrigger asChild>
          <Button variant={destructive ? 'destructive' : 'outline'}>{title}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              setPending(true)
              setSaved(false)
              try {
                await submit(form)
                setOpen(false)
                setSaved(true)
              } catch (error) {
                showRequestError(error)
              } finally {
                setPending(false)
              }
            }}
          >
            {children}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pending}>
                  Отмена
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant={destructive ? 'destructive' : 'default'}
                disabled={pending}
              >
                {title}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {saved ? (
        <p role="status" className="sr-only">
          Изменения сохранены
        </p>
      ) : null}
    </>
  )
}

const TotpSettings = ({
  enabled,
  username,
  onChanged,
}: {
  enabled: boolean
  username: string
  onChanged: (enabled: boolean) => void
}) => {
  const [open, setOpen] = useState(false)
  const [secret, setSecret] = useState('')
  const [recovery, setRecovery] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  return (
    <SecuritySetting
      title={
        <>
          Двухфакторная аутентификация
          {enabled ? (
            <Badge className="border-emerald-600/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
              Включена
            </Badge>
          ) : null}
        </>
      }
      description={
        enabled
          ? 'Выключение приведёт к снижению уровня безопасности вашего аккаунта.'
          : 'Усильте безопасность вашего профиля через дополнительный код двухфакторной аутентификации.'
      }
    >
      {enabled && !open ? (
        <AccountDialog
          title="Отключить 2FA"
          description="Подтвердите отключение паролем и действующим кодом."
          submit={async (form) => {
            await disableTotp(formText(form, 'password'), formText(form, 'otp'))
            onChanged(false)
          }}
        >
          <PasswordFields twoFactor />
        </AccountDialog>
      ) : (
        <Dialog
          open={open}
          onOpenChange={(value) => {
            if (pending) return
            setOpen(value)
            if (!value) {
              setSecret('')
              setRecovery('')
              setPassword('')
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline">Настроить 2FA</Button>
          </DialogTrigger>
          <DialogContent className={secret && !recovery ? 'sm:max-w-lg' : undefined}>
            <DialogHeader>
              <DialogTitle>Двухфакторная аутентификация</DialogTitle>
              <DialogDescription>
                {recovery
                  ? 'Сохраните резервный код. Вход с этим кодом отключает 2FA, чтобы вы могли настроить её заново.'
                  : secret
                    ? 'Добавьте ключ в приложение-аутентификатор как TOTP и введите шестизначный код.'
                    : 'Подтвердите пароль, чтобы получить ключ для приложения-аутентификатора.'}
              </DialogDescription>
            </DialogHeader>
            {recovery ? (
              <Field name="totp-recovery" label="Резервный код">
                <Input
                  id="totp-recovery"
                  readOnly
                  value={recovery}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </Field>
            ) : (
              <form
                className="grid gap-4"
                onSubmit={async (event) => {
                  event.preventDefault()
                  const form = new FormData(event.currentTarget)
                  setPending(true)
                  try {
                    if (!secret) setSecret(await beginTotp(password))
                    else {
                      setRecovery(await enableTotp(password, formText(form, 'code')))
                      setPassword('')
                      onChanged(true)
                    }
                  } catch (error) {
                    showRequestError(error)
                  } finally {
                    setPending(false)
                  }
                }}
              >
                {secret ? (
                  <div className="grid items-start justify-items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:justify-items-stretch">
                    <TotpQr username={username} secret={secret} />
                    <div className="grid w-full gap-3">
                      <Field name="totp-secret" label="Ключ настройки">
                        <Input
                          id="totp-secret"
                          value={secret}
                          readOnly
                          onFocus={(event) => event.currentTarget.select()}
                        />
                      </Field>
                      <Field name="totp-code" label="Код из приложения">
                        <Input
                          id="totp-code"
                          name="code"
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          autoComplete="one-time-code"
                          required
                        />
                      </Field>
                    </div>
                  </div>
                ) : (
                  <Field name="totp-password" label="Текущий пароль">
                    <Input
                      id="totp-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </Field>
                )}
                <DialogFooter>
                  <Button type="submit" disabled={pending}>
                    {secret ? 'Включить 2FA' : 'Получить ключ'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      )}
    </SecuritySetting>
  )
}

const SessionList = ({ onSignOut }: { onSignOut: () => void }) => {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listSessions>>>()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (rows || failed) return
    let active = true
    listSessions()
      .then((result) => {
        if (active) setRows(result)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [failed, rows])
  if (failed)
    return (
      <Button variant="outline" onClick={() => setFailed(false)}>
        Повторить загрузку
      </Button>
    )
  if (!rows)
    return (
      <p role="status" className="text-sm">
        Загрузка сессий…
      </p>
    )
  return (
    <ul className="divide-y">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center gap-3">
          {sessionDeviceType(row.userAgent) === 'mobile' ? (
            <LucideSmartphone className="h-5 w-5 text-muted-foreground" />
          ) : (
            <LucideComputer className="h-5 w-5 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-grow-1">
            <p className="text-sm font-medium" title={row.userAgent ?? undefined}>
              {sessionDevice(row.userAgent)}
            </p>
            <p className="text-xs text-muted-foreground">
              {dateTime.format(row.createdAt)} {row.current ? '· Текущая сессия' : ''}
            </p>
          </div>
          <AccountDialog
            title="Завершить сессию"
            description="На этом устройстве потребуется снова войти в аккаунт."
            submit={async () => {
              await revokeSession(row.id)
              if (row.current) onSignOut()
              else setRows((previous) => previous?.filter((item) => item.id !== row.id))
            }}
          >
            {null}
          </AccountDialog>
        </li>
      ))}
    </ul>
  )
}

export const AccountSettings = ({ user }: { user: SessionUser }) => {
  const [, navigate] = useLocation()
  const [sessionRevision, setSessionRevision] = useState(0)
  const signOut = () => {
    useChatStore.getState().clearSession()
    navigate('/login', { replace: true })
  }
  const changed = (next: SessionUser) => useChatStore.setState({ user: next })
  return (
    <>
      <ProfileEditor user={user} onSave={changed} />
      <Section title="Безопасность">
        <SecuritySetting
          title="Пароль"
          description="Убедитесь в том, что ваш пароль достаточно сильный, чтобы защитить ваш аккаунт."
        >
          <AccountDialog
            title="Сменить пароль"
            description="После смены пароля остальные сессии будут завершены."
            submit={(form) =>
              changePassword({
                password: formText(form, 'password'),
                otp: formText(form, 'otp') || undefined,
                newPassword: formText(form, 'new-password'),
              }).then(() => setSessionRevision((current) => current + 1))
            }
          >
            <PasswordFields twoFactor={Boolean(user.twoFactorEnabled)} />
            <Field name="new-password" label="Новый пароль">
              <Input
                id="new-password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={256}
                required
              />
            </Field>
          </AccountDialog>
        </SecuritySetting>
        <FieldSeparator />
        <TotpSettings
          username={user.username}
          enabled={Boolean(user.twoFactorEnabled)}
          onChanged={(twoFactorEnabled) => changed({ ...user, twoFactorEnabled })}
        />
      </Section>
      <Section title="Сессии авторизации">
        <SessionList key={sessionRevision} onSignOut={signOut} />
      </Section>
      <Section title="Управление аккаунтом">
        <div className="flex flex-wrap items-start gap-3">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const registration = await navigator.serviceWorker
                  ?.getRegistration()
                  .catch(() => undefined)
                const subscription = await registration?.pushManager
                  ?.getSubscription()
                  .catch(() => null)
                await logoutRequest(subscription?.endpoint)
                signOut()
              } catch (error) {
                showRequestError(error)
              }
            }}
          >
            {strings.chat.logout}
          </Button>
          {user.role !== 'owner' ? (
            <AccountDialog
              title="Удалить аккаунт"
              description="Аккаунт, его чаты и сессии будут удалены без возможности восстановления."
              destructive
              submit={async (form) => {
                await deleteAccount({
                  password: formText(form, 'password'),
                  otp: formText(form, 'otp') || undefined,
                })
                signOut()
              }}
            >
              <PasswordFields twoFactor={Boolean(user.twoFactorEnabled)} />
            </AccountDialog>
          ) : null}
        </div>
      </Section>
    </>
  )
}

export const AdminAccountSettings = ({ userId }: { userId: string }) => {
  const [user, setUser] = useState<SessionUser>()
  const [failed, setFailed] = useState(false)
  const [rolePending, setRolePending] = useState(false)
  useEffect(() => {
    if (user || failed) return
    let active = true
    fetchAdminUser(userId)
      .then((result) => {
        if (active) setUser(result)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [userId, user, failed])
  if (!user)
    return failed ? (
      <Button variant="outline" onClick={() => setFailed(false)}>
        Повторить загрузку
      </Button>
    ) : (
      <p role="status">Загрузка…</p>
    )
  return (
    <>
      <ProfileEditor
        roleEditor={
          user.role !== 'owner' ? (
            <Select
              value={user.role}
              disabled={rolePending}
              onValueChange={async (role) => {
                if (role !== 'user' && role !== 'admin') return
                setRolePending(true)
                try {
                  const updated = await setUserRoleRequest(user.id, role)
                  setUser((current) => current && { ...current, role: updated.role })
                } catch (error) {
                  showRequestError(error)
                } finally {
                  setRolePending(false)
                }
              }}
            >
              <SelectTrigger aria-label="Роль на платформе" className="w-full sm:w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{strings.settings.roles.user}</SelectItem>
                <SelectItem value="admin">{strings.settings.roles.admin}</SelectItem>
              </SelectContent>
            </Select>
          ) : undefined
        }
        user={user}
        onSave={(next) => {
          setUser(next)
          if (useChatStore.getState().user?.id === next.id) useChatStore.setState({ user: next })
        }}
        admin
      />
      {user.role !== 'owner' ? (
        <Section title="Пароль">
          <div className="grid justify-items-start gap-2">
            <AccountDialog
              title="Сбросить пароль"
              description="Пароль изменится, а все сессии пользователя будут завершены."
              submit={async (form) => {
                await resetUserPassword(user.id, formText(form, 'new-password'))
              }}
            >
              <Field name="new-password" label="Новый пароль">
                <Input
                  id="new-password"
                  name="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={256}
                  required
                />
              </Field>
            </AccountDialog>
          </div>
        </Section>
      ) : null}
    </>
  )
}
