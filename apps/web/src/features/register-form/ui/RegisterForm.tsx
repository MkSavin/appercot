import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useChatStore } from '@/entities/chat'
import { registerRequest } from '@/entities/session'
import { strings } from '@/shared/config'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

interface RegisterFormProps {
  initialInvite: string
  onSuccess: () => void
}

export const RegisterForm = ({ initialInvite, onSuccess }: RegisterFormProps) => {
  const setSession = useChatStore((state) => state.setSession)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [invite, setInvite] = useState(initialInvite)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      setSession(await registerRequest({ username, password, displayName, invite }))
      onSuccess()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : strings.auth.failed)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      method="post"
      action="/register"
      aria-labelledby="register-title"
      className="grid gap-4"
      onSubmit={submit}
    >
      <div className="grid gap-2">
        <label htmlFor="register-display-name" className="text-sm font-medium">
          {strings.auth.displayName}
        </label>
        <Input
          id="register-display-name"
          name="displayName"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          autoComplete="name"
          enterKeyHint="next"
          required
          autoFocus
          className="h-12"
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="register-username" className="text-sm font-medium">
          {strings.auth.username}
        </label>
        <Input
          id="register-username"
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          required
          className="h-12"
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="register-password" className="text-sm font-medium">
          {strings.auth.password}
        </label>
        <div className="relative">
          <Input
            id="register-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            aria-describedby="register-password-hint"
            enterKeyHint="next"
            minLength={8}
            required
            className="h-12 pr-12"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 text-muted-foreground"
            aria-label={showPassword ? strings.auth.hidePassword : strings.auth.showPassword}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        </div>
        <p id="register-password-hint" className="text-xs text-muted-foreground">
          {strings.auth.passwordHint}
        </p>
      </div>
      <div className="grid gap-2">
        <label htmlFor="register-invite" className="text-sm font-medium">
          {strings.auth.invite}
        </label>
        <Input
          id="register-invite"
          name="invite"
          value={invite}
          onChange={(event) => setInvite(event.target.value)}
          autoComplete="one-time-code"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          required
          className="h-12"
        />
      </div>
      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="h-12 w-full" disabled={submitting}>
        {submitting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
        {strings.auth.createAccount}
      </Button>
    </form>
  )
}
