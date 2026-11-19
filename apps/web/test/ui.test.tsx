import { describe, expect, test } from 'bun:test'
import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server'
import { Router } from 'wouter'
import { memoryLocation } from 'wouter/memory-location'
import { BotMessage } from '../src/entities/message/ui/BotMessage'
import { StatusTicks } from '../src/entities/message/ui/StatusTicks'
import { LoginForm } from '../src/features/login-form/ui/LoginForm'
import { RegisterForm } from '../src/features/register-form/ui/RegisterForm'
import { shouldSubmitOnEnter } from '../src/features/send-message/model/keyboard'

const botMessage = {
  id: 'message-1',
  chatId: 'chat-1',
  seq: 1,
  sender: 'bot' as const,
  content: {
    text: '**Жирный текст**\n\n<script>alert("xss")</script>\n\n```ts\nconst ok = true\n```',
  },
  status: 'processed' as const,
  createdAt: 1000,
}

describe('authentication forms', () => {
  test('uses native labels and password manager hints', () => {
    const login = renderToStaticMarkup(
      <Router {...memoryLocation({ static: true, path: '/login' })}>
        <LoginForm onSuccess={() => {}} />
      </Router>,
    )
    expect(login).toContain('for="login-username"')
    expect(login).toContain('autoComplete="username"')
    expect(login).toContain('autoComplete="current-password"')
    expect(login).toContain('required=""')

    const register = renderToStaticMarkup(
      <Router {...memoryLocation({ static: true, path: '/register' })}>
        <RegisterForm initialInvite="invite-from-url" onSuccess={() => {}} />
      </Router>,
    )
    expect(register).toContain('autoComplete="new-password"')
    expect(register).toContain('value="invite-from-url"')
    expect(register).toContain('autoComplete="name"')
  })
})

describe('message presentation', () => {
  // @anchor INV:ui/sanitizes-markdown
  test('renders GFM markdown without raw HTML and includes code copying', async () => {
    const stream = await renderToReadableStream(<BotMessage message={botMessage} />)
    await stream.allReady
    const markup = await new Response(stream).text()
    expect(markup).toContain('<strong>Жирный текст</strong>')
    expect(markup).not.toContain('<script>')
    expect(markup).not.toContain('alert("xss")')
    expect(markup).toContain('command="--copy"')
    expect(markup).toContain('aria-label=')
  })

  test('exposes every delivery status with text and an accessible label', () => {
    expect(renderToStaticMarkup(<StatusTicks status="pending" />)).toContain('Отправляется')
    expect(renderToStaticMarkup(<StatusTicks status="accepted" />)).toContain('Принято')
    expect(renderToStaticMarkup(<StatusTicks status="processed" />)).toContain('Обработано')
    expect(renderToStaticMarkup(<StatusTicks status="failed" />)).toContain('Не отправлено')
  })
})

describe('composer keyboard handling', () => {
  // @anchor INV:ui/ignores-composition
  test('submits only a plain desktop Enter outside IME composition', () => {
    expect(shouldSubmitOnEnter({ key: 'Enter', shiftKey: false }, false)).toBe(true)
    expect(shouldSubmitOnEnter({ key: 'Enter', shiftKey: true }, false)).toBe(false)
    expect(shouldSubmitOnEnter({ key: 'Enter', shiftKey: false }, true)).toBe(false)
    expect(shouldSubmitOnEnter({ key: 'Enter', shiftKey: false, isComposing: true }, false)).toBe(
      false,
    )
    expect(shouldSubmitOnEnter({ key: 'Enter', shiftKey: false, keyCode: 229 }, false)).toBe(false)
    expect(shouldSubmitOnEnter({ key: 'a', shiftKey: false }, false)).toBe(false)
  })
})
