import { ArrowLeft, Circle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'wouter'
import { useChatStore } from '@/entities/chat'
import { fetchMessages, sendMessageRequest } from '@/entities/message'
import { Composer, retryChatMessage } from '@/features/send-message'
import { strings } from '@/shared/config'
import { cn } from '@/shared/lib/cn'
import type { ChatMessage } from '@/shared/model'
import { Button } from '@/shared/ui/button'
import { MessageList } from './MessageList'

const emptyMessages: ChatMessage[] = []

export const ChatView = ({ chatId }: { chatId: string }) => {
  const chat = useChatStore((state) => state.chats.find((current) => current.id === chatId))
  const messages = useChatStore((state) => state.messagesByChat[chatId] ?? emptyMessages)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const chatAvailable = Boolean(chat)

  useEffect(() => {
    if (!chatAvailable) return
    let active = true
    setLoading(true)
    setError(null)
    fetchMessages(chatId)
      .then((history) => {
        if (!active) return
        useChatStore.getState().replaceMessages(chatId, history)
        setHasMore(history.length === 50)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : strings.auth.failed)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [chatId, chatAvailable])

  const loadEarlier = useCallback(async () => {
    const firstSeq = useChatStore.getState().messagesByChat[chatId]?.[0]?.seq
    if (!firstSeq) return
    setLoading(true)
    try {
      const history = await fetchMessages(chatId, firstSeq)
      useChatStore.getState().prependMessages(chatId, history)
      setHasMore(history.length === 50)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : strings.auth.failed)
    } finally {
      setLoading(false)
    }
  }, [chatId])

  const retry = async (clientId: string) => {
    try {
      await retryChatMessage(useChatStore, chatId, clientId, sendMessageRequest)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : strings.auth.failed)
    }
  }

  if (!chat) {
    return (
      <section className="grid h-dvh place-items-center text-muted-foreground">
        {strings.chat.notFound}
      </section>
    )
  }

  return (
    <section className="flex h-dvh min-h-0 flex-col bg-background" aria-labelledby="chat-title">
      <header className="flex min-h-16 items-center gap-3 border-b px-3 md:px-6">
        <Button asChild variant="ghost" size="icon" className="md:hidden">
          <Link href="/" aria-label={strings.chat.back}>
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 id="chat-title" className="truncate text-[15px] font-semibold">
            {chat.bot.name}
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Circle
              aria-hidden="true"
              className={cn(
                'size-2 fill-current',
                chat.bot.online ? 'text-emerald-500' : 'text-zinc-400',
              )}
            />
            {chat.bot.online ? strings.chat.online : strings.chat.offlineStatus}
          </p>
        </div>
      </header>
      {error ? (
        <p
          role="alert"
          className="bg-destructive/10 px-4 py-2 text-center text-xs text-destructive"
        >
          {error}
        </p>
      ) : null}
      <MessageList
        chatId={chatId}
        messages={messages}
        hasMore={hasMore}
        loading={loading}
        onLoadEarlier={loadEarlier}
        onRetry={retry}
      />
      <Composer chatId={chatId} />
    </section>
  )
}
