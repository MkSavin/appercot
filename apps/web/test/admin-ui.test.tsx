import '../src/shared/config/i18n'
import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { Router } from 'wouter'
import { BotConnectionSnippet } from '../src/features/bot-onboarding'
import { authHref, readAuthReturn } from '../src/shared/lib/auth-return'
import { BotCatalog } from '../src/widgets/bot-catalog'

const bot = {
  id: 'bot-1',
  username: 'examplebot',
  name: 'Example',
  description: 'Bot description',
  online: true,
  listed: true,
  tags: ['productivity', 'tools'],
}

const renderCatalog = () =>
  renderToStaticMarkup(
    <Router ssrPath="/browse">
      <BotCatalog bots={[bot]} />
    </Router>,
  )

describe('catalog and administration', () => {
  // @anchor INV:admin-ui/preserves-invitation
  test('preserves a bot invitation through sign-in and rejects external return paths', () => {
    const invitation = '/browse?bot=examplebot&invite=example'
    expect(readAuthReturn(authHref('/login', invitation).split('?')[1] ?? '')).toBe(invitation)
    expect(readAuthReturn('next=%2Fbrowse%2Fbot-1%3Ftag%3Dtools')).toBe('/browse/bot-1?tag=tools')
    expect(readAuthReturn('next=%2F%2Fexample.test%2Fbrowse')).toBe('/')
    expect(readAuthReturn('next=%2F%5Cexample.test%2Fbrowse')).toBe('/')
  })

  // @anchor INV:admin-ui/opens-details
  test('opens catalog details without turning the card into an add button', () => {
    const available = renderCatalog()
    expect(available).toContain('@examplebot')
    expect(available).toContain('Подробнее о боте Example')
    expect(available).toContain('href="/browse/bot-1"')
    expect(available).toContain('в сети')
    expect(available).toContain('productivity')
    expect(available).toContain('tools')
    expect(available).not.toContain('type="button"')
  })

  test('renders the token, WebSocket URL and launch command as copyable values', () => {
    const markup = renderToStaticMarkup(
      <BotConnectionSnippet
        token="bot-1:secret"
        webSocketUrl="ws://localhost:3000/api/bot/ws"
        onTokenSaved={() => {}}
      />,
    )
    expect(markup).toContain('bot-1:secret')
    expect(markup).toContain('readOnly=""')
    expect(markup).toContain('Копировать BOT_TOKEN')
    expect(markup).toContain('Копировать BOT_URL')
    expect(markup).toContain('Копировать команду')
    expect(markup).toContain('bun examples/echo-bot/index.ts')
  })
})
