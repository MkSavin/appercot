import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { markChatReadRequest, useChatStore } from '@/entities/chat'
import { fetchMessages, sendMessageRequest } from '@/entities/message'
import { BlockedChatNotice } from '@/features/block-bot'
import { Composer, retryChatMessage } from '@/features/send-message'
import { showRequestError } from '@/shared/api'
import type { ChatMessage } from '@/shared/model'
import { Button } from '@/shared/ui/button'
import { ChatHeader } from './ChatHeader'
import { ConnectionBanner } from './ConnectionBanner'
import { MessageList } from './MessageList'
import { TypingIndicator } from './TypingIndicator'

const emptyMessages: ChatMessage[] = []

export const ChatView = ({ chatId }: { chatId: string }) => {
  const { t } = useTranslation()
  const chat = useChatStore((state) => state.chats.find((current) => current.id === chatId))
  const messages = useChatStore((state) => state.messagesByChat[chatId] ?? emptyMessages)
  const connection = useChatStore((state) => state.connection)
  const typingUntil = useChatStore((state) => state.typingByChat[chatId])
  const [loading, setLoading] = useState(true)
  const [historyAttempt, setHistoryAttempt] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [historyError, setHistoryError] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const markedSeq = useRef<string | null>(null)
  const chatAvailable = Boolean(chat)
  const latestSeq = messages.findLast((message) => !message.id.startsWith('pending:'))?.seq
  const unread = chat?.unread ?? 0

  // biome-ignore lint/correctness/useExhaustiveDependencies: The attempt counter reloads history on retry.
  useEffect(() => {
    if (!chatAvailable) return
    let active = true
    setLoading(true)
    setHistoryError(false)
    fetchMessages(chatId)
      .then((history) => {
        if (!active) return
        useChatStore.getState().replaceMessages(chatId, history, history.length === 50)
        setHasMore(history.length === 50)
      })
      .catch(() => {
        if (active) setHistoryError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [chatId, chatAvailable, historyAttempt])

  const loadEarlier = useCallback(async () => {
    const previous = useChatStore.getState()
    const firstSeq = previous.messagesByChat[chatId]?.[0]?.seq
    if (!firstSeq) return
    setLoading(true)
    try {
      const history = await fetchMessages(chatId, firstSeq)
      const current = useChatStore.getState()
      if (
        previous.user?.id !== current.user?.id ||
        !current.chats.some((chat) => chat.id === chatId)
      )
        return
      current.prependMessages(chatId, history)
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
    } catch (cause) {
      if (markedSeq.current === marker) markedSeq.current = null
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
      <section className="workspace-surface grid h-full place-items-center p-5 text-center">
        <div className="grid gap-4">
          <h1 className="text-xl font-semibold">{t('chat:notFound')}</h1>
          <Button asChild variant="outline">
            <Link href="/">{t('chat:back')}</Link>
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-background" aria-labelledby="chat-title">
      <ChatHeader chatId={chatId} bot={chat.bot} />
      <ConnectionBanner connection={connection} botOnline={chat.bot.online} />
      {historyError ? (
        <div className="flex flex-wrap items-center justify-center gap-2 bg-destructive/10 px-4 py-1 text-sm text-destructive">
          <p role="alert">{t('chat:historyFailed')}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistoryAttempt((attempt) => attempt + 1)}
          >
            {t('chat:retry')}
          </Button>
        </div>
      ) : null}
      <MessageList
        chatId={chatId}
        messages={messages}
        hasMore={hasMore}
        loading={loading}
        historyError={historyError}
        welcome={chat.bot.welcome}
        onLoadEarlier={loadEarlier}
        onRetry={retry}
        commands={chat.commands}
        paletteOpen={paletteOpen}
        onPaletteOpen={setPaletteOpen}
        blocked={chat.blocked}
      />
      <TypingIndicator until={typingUntil} />
      {chat.blocked ? (
        <BlockedChatNotice chatId={chatId} />
      ) : (
        <Composer chatId={chatId} onOpenCommands={() => setPaletteOpen(true)} />
      )}
    </section>
  )
}
