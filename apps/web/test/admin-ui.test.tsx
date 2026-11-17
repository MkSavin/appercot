import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { canAccessAdmin } from '../src/app/routing'
import { BotTokenDialog } from '../src/features/bot-token-manage'
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
    <BotCatalog bots={[bot]} chatByBotId={chatByBotId} onAdd={() => {}} onOpen={() => {}} />,
  )

describe('catalog and administration', () => {
  test('allows only administrators into admin routes', () => {
    expect(canAccessAdmin(undefined)).toBe(false)
    expect(
      canAccessAdmin({ id: 'member', username: 'member', displayName: 'Member', isAdmin: false }),
    ).toBe(false)
    expect(
      canAccessAdmin({ id: 'admin', username: 'admin', displayName: 'Admin', isAdmin: true }),
    ).toBe(true)
  })

  test('shows whether a catalog bot is added and exposes its online state', () => {
    const available = renderCatalog({})
    expect(available).toContain('@examplebot')
    expect(available).toContain('Добавить')
    expect(available).toContain('в сети')

    const added = renderCatalog({ 'bot-1': 'chat-1' })
    expect(added).toContain('Открыть')
    expect(added).toContain('type="button"')
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
