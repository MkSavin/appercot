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

const renderCatalog = (chatByBotId: Record<string, string>) =>
  renderToStaticMarkup(
    <Router ssrPath="/browse">
      <BotCatalog bots={[bot]} chatByBotId={chatByBotId} onAdd={() => {}} />
    </Router>,
  )

describe('catalog and administration', () => {
  // @anchor INV:admin-ui/preserves-invitation
  test('preserves a bot invitation through sign-in and rejects external return paths', () => {
    const invitation = '/browse?bot=examplebot&invite=example'
    expect(readAuthReturn(authHref('/login', invitation).split('?')[1] ?? '')).toBe(invitation)
    expect(readAuthReturn('next=%2F%2Fexample.test%2Fbrowse')).toBe('/')
    expect(readAuthReturn('next=%2F%5Cexample.test%2Fbrowse')).toBe('/')
  })

  test('shows whether a catalog bot is added and exposes its online state', () => {
    const available = renderCatalog({})
    expect(available).toContain('@examplebot')
    expect(available).toContain('Начать чат')
    expect(available).toContain('в сети')
    expect(available).toContain('productivity')
    expect(available).toContain('tools')

    const added = renderCatalog({ 'bot-1': 'chat-1' })
    expect(added).toContain('href="/c/chat-1"')
    expect(added).not.toContain('type="button"')
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
