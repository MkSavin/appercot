import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { Router } from 'wouter'
import { BotTokenDialog } from '../src/features/bot-token-manage'
import { authHref, readAuthReturn } from '../src/shared/lib/auth-return'
import { BotCatalog } from '../src/widgets/bot-catalog'

const bot = {
  id: 'bot-1',
  username: 'examplebot',
  name: 'Example',
  description: 'Bot description',
  online: true,
  listed: true,
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

    const added = renderCatalog({ 'bot-1': 'chat-1' })
    expect(added).toContain('href="/c/chat-1"')
    expect(added).not.toContain('type="button"')
  })

  test('renders a revealed bot token in a copyable read-only field', () => {
    const markup = renderToStaticMarkup(
      <BotTokenDialog open token="bot-1:secret" botName="Example" onClose={() => {}} />,
    )
    expect(markup).toContain('bot-1:secret')
    expect(markup).toContain('readOnly=""')
    expect(markup).toContain('Копировать токен')
    expect(markup).toContain('больше не будет показан')
  })
})
