import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useChatStore } from '@/entities/chat'
import { loginRequest } from '@/entities/session'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

export const LoginForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const setSession = useChatStore((state) => state.setSession)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      setSession(await loginRequest({ username, password }))
      onSuccess()
    } catch (cause) {
      setError(showRequestError(cause))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      method="post"
      action="/login"
      aria-labelledby="login-title"
      className="grid gap-5"
      onSubmit={submit}
    >
      <div className="grid gap-2">
        <label htmlFor="login-username" className="text-sm font-medium">
          {strings.auth.username}
        </label>
        <Input
          id="login-username"
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          required
          autoFocus
          className="h-12"
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="login-password" className="text-sm font-medium">
          {strings.auth.password}
        </label>
        <div className="relative">
          <Input
            id="login-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            enterKeyHint="done"
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
      </div>
      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="h-12 w-full" disabled={submitting}>
        {submitting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
        {strings.auth.signIn}
      </Button>
    </form>
  )
}
