import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { snippetSegments } from '../src/features/search-messages'
import { latestReadableSeq } from '../src/widgets/chat-view/model/history-policy'

// @anchor INV:message-search/escapes-snippets
test('renders search highlights as text without trusting HTML or control markers', () => {
  const segments = snippetSegments('<img src=x onerror=alert(1)> Ancient \u0001text', 'ancient')
  const markup = renderToStaticMarkup(
    <p>
      {segments.map((segment) =>
        segment.match ? <mark key={segment.start}>{segment.text}</mark> : segment.text,
      )}
    </p>,
  )
  expect(markup).toContain('&lt;img src=x onerror=alert(1)&gt;')
  expect(markup).toContain('<mark>Ancient</mark>')
  expect(markup).not.toContain('<img')
  expect(segments.map((segment) => segment.text).join('')).toContain('\u0001')
})

test('escapes user input used for client-side highlighting', () => {
  expect(snippetSegments('Literal (ancient) [text] *', '(ancient)')).toEqual([
    { text: 'Literal ', match: false, start: 0 },
    { text: '(ancient)', match: true, start: 8 },
    { text: ' [text] *', match: false, start: 17 },
  ])
})

// @anchor INV:message-search/preserves-read
test('does not advance the read marker from a bounded context window', () => {
  expect(latestReadableSeq('context', 120)).toBeUndefined()
  expect(latestReadableSeq('tail', 120)).toBe(120)
})
