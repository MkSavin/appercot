import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { UnreadBadge } from '../src/entities/chat/ui/UnreadBadge'
import { MessageKeyboard } from '../src/entities/message/ui/MessageKeyboard'
import { SystemMessage } from '../src/entities/message/ui/SystemMessage'
import { ConnectionBanner } from '../src/widgets/chat-view/ui/ConnectionBanner'
import { TypingIndicator } from '../src/widgets/chat-view/ui/TypingIndicator'

describe('chat interaction presentation', () => {
  test('renders system messages as centered pills without ticks', () => {
    const markup = renderToStaticMarkup(<SystemMessage text="Недостаточно прав" />)
    expect(markup).toContain('Недостаточно прав')
    expect(markup).toContain('rounded-full')
    expect(markup).not.toContain('Обработано')
  })

  test('renders callback, command and URL keyboards', () => {
    const markup = renderToStaticMarkup(
      <MessageKeyboard
        rows={[
          [
            { text: 'Count', callback: 'count' },
            { text: 'Help', command: '/help' },
          ],
          [{ text: 'Docs', url: 'https://example.test' }],
        ]}
        onAction={() => {}}
      />,
    )
    expect(markup).toContain('Count')
    expect(markup).toContain('Help')
    expect(markup).toContain('Docs')
    expect(markup).toContain('type="button"')
  })

  test('distinguishes network and bot offline states', () => {
    expect(renderToStaticMarkup(<ConnectionBanner connection="offline" botOnline />)).toContain(
      'Нет соединения',
    )
    expect(
      renderToStaticMarkup(<ConnectionBanner connection="online" botOnline={false} />),
    ).toContain('Бот офлайн')
    expect(renderToStaticMarkup(<ConnectionBanner connection="online" botOnline />)).toBe('')
  })

  test('renders typing only before its expiry', () => {
    expect(renderToStaticMarkup(<TypingIndicator until={Date.now() + 5000} />)).toContain(
      'Бот печатает',
    )
    expect(renderToStaticMarkup(<TypingIndicator />)).toBe('')
  })

  test('shows unread count in the chat list', () => {
    const markup = renderToStaticMarkup(<UnreadBadge count={4} />)
    expect(markup).toContain('>4<')
    expect(markup).toContain('aria-label="Непрочитанных: 4"')
    expect(renderToStaticMarkup(<UnreadBadge count={0} />)).toBe('')
  })
})
