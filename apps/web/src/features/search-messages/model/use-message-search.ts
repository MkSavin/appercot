import { useEffect, useRef, useState } from 'react'
import { useChatStore } from '@/entities/chat'
import { fetchSearchMessages } from '@/entities/message'

type SearchPage = Awaited<ReturnType<typeof fetchSearchMessages>>
type SearchStatus = 'initial' | 'loading' | 'ready' | 'failed'

export const useMessageSearch = (chatId: string, active: boolean) => {
  const userId = useChatStore((state) => state.user?.id)
  const latestPreviewSeq = useChatStore(
    (state) => state.chats.find((chat) => chat.id === chatId)?.preview?.seq ?? 0,
  )
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<SearchPage['items']>([])
  const [hasMore, setHasMore] = useState(false)
  const [status, setStatus] = useState<SearchStatus>('initial')
  const [attempt, setAttempt] = useState(0)
  const [paginationLoading, setPaginationLoading] = useState(false)
  const [paginationFailed, setPaginationFailed] = useState(false)
  const [resultLatestSeq, setResultLatestSeq] = useState(0)
  const requestId = useRef(0)
  const normalizedQuery = query.trim()

  // biome-ignore lint/correctness/useExhaustiveDependencies: The attempt counter retries the current query.
  useEffect(() => {
    if (!active) return
    const id = ++requestId.current
    let current = true
    setPaginationFailed(false)
    if (!normalizedQuery) {
      setItems([])
      setHasMore(false)
      setStatus('initial')
      return () => {
        current = false
      }
    }
    setStatus('loading')
    const timer = setTimeout(() => {
      fetchSearchMessages({ chatId, query: normalizedQuery, limit: 30 })
        .then((page) => {
          if (!current || requestId.current !== id || useChatStore.getState().user?.id !== userId)
            return
          setItems(page.items)
          setHasMore(page.hasMore)
          setStatus('ready')
          setResultLatestSeq(
            useChatStore.getState().chats.find((chat) => chat.id === chatId)?.preview?.seq ?? 0,
          )
        })
        .catch(() => {
          if (current && requestId.current === id && useChatStore.getState().user?.id === userId)
            setStatus('failed')
        })
    }, 275)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [active, attempt, chatId, normalizedQuery, userId])

  const loadMore = async () => {
    const beforeSeq = items.at(-1)?.message.seq
    if (!beforeSeq || !hasMore || paginationLoading) return
    const id = requestId.current
    setPaginationLoading(true)
    setPaginationFailed(false)
    try {
      const page = await fetchSearchMessages({
        chatId,
        query: normalizedQuery,
        beforeSeq,
        limit: 30,
      })
      if (requestId.current !== id || useChatStore.getState().user?.id !== userId) return
      setItems((current) => {
        const existing = new Set(current.map((item) => item.message.id))
        return [...current, ...page.items.filter((item) => !existing.has(item.message.id))]
      })
      setHasMore(page.hasMore)
    } catch {
      if (requestId.current === id && useChatStore.getState().user?.id === userId)
        setPaginationFailed(true)
    } finally {
      if (requestId.current === id) setPaginationLoading(false)
    }
  }

  return {
    query,
    setQuery,
    items,
    hasMore,
    status,
    paginationLoading,
    paginationFailed,
    loadMore,
    retry: () => setAttempt((value) => value + 1),
    refresh: () => setAttempt((value) => value + 1),
    refreshAvailable:
      status === 'ready' && latestPreviewSeq > resultLatestSeq && resultLatestSeq > 0,
  }
}
