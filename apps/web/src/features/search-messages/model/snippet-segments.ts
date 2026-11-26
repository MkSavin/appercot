export interface SnippetSegment {
  text: string
  match: boolean
  start: number
}

export const snippetSegments = (snippet: string, query: string): SnippetSegment[] => {
  const tokens = [...new Set(query.trim().split(/\s+/u).filter(Boolean))].map((token) =>
    token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  )
  if (!tokens.length) return [{ text: snippet, match: false, start: 0 }]
  const expression = new RegExp(`(${tokens.join('|')})`, 'giu')
  let start = 0
  return snippet
    .split(expression)
    .filter((part) => part.length > 0)
    .map((text, index) => {
      const segment = { text, match: index % 2 === 1, start }
      start += text.length
      return segment
    })
}
