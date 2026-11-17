import { ArrowLeft, Circle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'wouter'
import { markChatReadRequest, useChatStore } from '@/entities/chat'
import { fetchMessages, sendMessageRequest } from '@/entities/message'
import { BlockedChatNotice } from '@/features/block-bot'
import { CommandMenu } from '@/features/command-menu'
import { Composer, retryChatMessage } from '@/features/send-message'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import { cn } from '@/shared/lib/cn'
import type { ChatMessage } from '@/shared/model'
import { Button } from '@/shared/ui/button'
import { ChatManagementMenu } from './ChatManagementMenu'
import { ConnectionBanner } from './ConnectionBanner'
import { MessageList } from './MessageList'
import { TypingIndicator } from './TypingIndicator'

const emptyMessages: ChatMessage[] = []

export const ChatView = ({ chatId }: { chatId: string }) => {
  const chat = useChatStore((state) => state.chats.find((current) => current.id === chatId))
  const messages = useChatStore((state) => state.messagesByChat[chatId] ?? emptyMessages)
  const connection = useChatStore((state) => state.connection)
  const typingUntil = useChatStore((state) => state.typingByChat[chatId])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const markedSeq = useRef<string | null>(null)
  const chatAvailable = Boolean(chat)
  const latestSeq = messages.at(-1)?.seq
  const unread = chat?.unread ?? 0

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
        if (active) setError(showRequestError(cause))
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
      showRequestError(cause)
    } finally {
      setLoading(false)
    }
  }, [chatId])

  const retry = async (clientId: string) => {
    try {
      await retryChatMessage(useChatStore, chatId, clientId, sendMessageRequest)
    } catch (cause) {
      showRequestError(cause)
    }
  }

  const markVisibleChatRead = useCallback(async () => {
    if (!chatAvailable || !latestSeq || unread === 0 || document.visibilityState !== 'visible') {
      return
    }
    const marker = `${chatId}:${latestSeq}`
    if (markedSeq.current === marker) return
    markedSeq.current = marker
    try {
      await markChatReadRequest({ chatId, seq: latestSeq })
      const current = useChatStore.getState().chats.find((item) => item.id === chatId)
      if (current) useChatStore.getState().upsertChat({ ...current, unread: 0 })
    } catch (cause) {
      markedSeq.current = null
      showRequestError(cause)
    }
  }, [chatAvailable, chatId, latestSeq, unread])

  useEffect(() => {
    void markVisibleChatRead()
    document.addEventListener('visibilitychange', markVisibleChatRead)
    return () => document.removeEventListener('visibilitychange', markVisibleChatRead)
  }, [markVisibleChatRead])

  if (!chat) {
    return (
      <section className="grid h-dvh place-items-center text-muted-foreground">
        {strings.chat.notFound}
      </section>
    )
  }

  return (
    <section className="flex h-dvh min-h-0 flex-col bg-background" aria-labelledby="chat-title">
      <header className="flex min-h-16 items-center gap-3 border-b px-3 pt-[env(safe-area-inset-top)] md:px-6">
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
        <ChatManagementMenu chatId={chatId} />
      </header>
      <ConnectionBanner connection={connection} botOnline={chat.bot.online} />
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
      <TypingIndicator until={typingUntil} />
      {chat.blocked ? (
        <BlockedChatNotice chatId={chatId} />
      ) : (
        <Composer
          chatId={chatId}
          renderCommandMenu={(query, onSelect) => (
            <CommandMenu query={query} commands={chat.commands ?? []} onSelect={onSelect} />
          )}
        />
      )}
    </section>
  )
}
