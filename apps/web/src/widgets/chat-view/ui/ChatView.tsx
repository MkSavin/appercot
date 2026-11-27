import type { Message } from '@appercot/protocol'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { markChatReadRequest, useChatStore } from '@/entities/chat'
import { fetchMessageContext, fetchMessages, sendMessageRequest } from '@/entities/message'
import { BlockedChatNotice } from '@/features/block-bot'
import { MessageSearchPanel } from '@/features/search-messages'
import { Composer, discardChatMessage, retryChatMessage } from '@/features/send-message'
import { showRequestError } from '@/shared/api'
import { matchesShortcut, Shortcut } from '@/shared/lib/shortcuts'
import type { ChatMessage } from '@/shared/model'
import { Button } from '@/shared/ui/button'
import { latestReadableSeq } from '../model/history-policy'
import { ChatHeader } from './ChatHeader'
import { ConnectionBanner } from './ConnectionBanner'
import { MessageList } from './MessageList'
import { TypingIndicator } from './TypingIndicator'

const emptyMessages: ChatMessage[] = []

const currentRequestContext = () => {
  const state = useChatStore.getState()
  return { userId: state.user?.id, historyEpoch: state.historyEpoch }
}
const isCurrentRequest = (chatId: string, previous: ReturnType<typeof currentRequestContext>) => {
  const current = useChatStore.getState()
  return (
    previous.userId === current.user?.id &&
    previous.historyEpoch === current.historyEpoch &&
    current.chats.some((item) => item.id === chatId)
  )
}

export const ChatView = ({ chatId }: { chatId: string }) => {
  const { t } = useTranslation()
  const chat = useChatStore((state) => state.chats.find((current) => current.id === chatId))
  const messages = useChatStore((state) => state.messagesByChat[chatId] ?? emptyMessages)
  const connection = useChatStore((state) => state.connection)
  const typingUntil = useChatStore((state) => state.typingByChat[chatId])
  const [loading, setLoading] = useState(true)
  const [historyAttempt, setHistoryAttempt] = useState(0)
  const [historyMode, setHistoryMode] = useState<'tail' | 'context'>('tail')
  const [hasEarlier, setHasEarlier] = useState(false)
  const [hasLater, setHasLater] = useState(false)
  const [contextEndSeq, setContextEndSeq] = useState(0)
  const [targetMessageId, setTargetMessageId] = useState<string>()
  const [historyError, setHistoryError] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const markedSeq = useRef<string | null>(null)
  const searchTriggerRef = useRef<HTMLButtonElement>(null)
  const chatAvailable = Boolean(chat)
  const visibleMessages =
    historyMode === 'context'
      ? messages.filter(
          (message) => message.id.startsWith('pending:') || message.seq <= contextEndSeq,
        )
      : messages
  const latestSeq = latestReadableSeq(
    historyMode,
    messages.findLast((message) => !message.id.startsWith('pending:'))?.seq,
  )
  const unread = chat?.unread ?? 0

  // biome-ignore lint/correctness/useExhaustiveDependencies: The attempt counter reloads history on retry and latest.
  useEffect(() => {
    if (!chatAvailable) return
    let active = true
    setLoading(true)
    setHistoryError(false)
    setHistoryMode('tail')
    setHasLater(false)
    setTargetMessageId(undefined)
    const historyEpoch = useChatStore.getState().historyEpoch
    fetchMessages(chatId)
      .then((history) => {
        if (!active || useChatStore.getState().historyEpoch !== historyEpoch) return
        useChatStore.getState().replaceMessages(chatId, history, history.length === 50)
        setHasEarlier(history.length === 50)
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
    const previous = currentRequestContext()
    const firstSeq = useChatStore.getState().messagesByChat[chatId]?.[0]?.seq
    if (!firstSeq) return
    setLoading(true)
    try {
      const history = await fetchMessages(chatId, firstSeq)
      if (!isCurrentRequest(chatId, previous)) return
      useChatStore.getState().prependMessages(chatId, history)
      setHasEarlier(history.length === 50)
    } catch (cause) {
      showRequestError(cause)
    } finally {
      setLoading(false)
    }
  }, [chatId])

  const loadLater = async () => {
    if (historyMode !== 'context' || !contextEndSeq) return
    const previous = currentRequestContext()
    setLoading(true)
    try {
      const context = await fetchMessageContext({
        chatId,
        seq: contextEndSeq,
        before: 0,
        after: 50,
      })
      if (!isCurrentRequest(chatId, previous)) return
      useChatStore.getState().appendMessages(chatId, context.messages)
      setContextEndSeq((current) =>
        Math.max(current, ...context.messages.map((message) => message.seq)),
      )
      setHasLater(context.hasLater)
    } catch (cause) {
      showRequestError(cause)
    } finally {
      setLoading(false)
    }
  }

  const jumpToMessage = async (message: Message) => {
    const previous = currentRequestContext()
    setLoading(true)
    setSearchOpen(false)
    try {
      const context = await fetchMessageContext({ chatId, seq: message.seq })
      if (!isCurrentRequest(chatId, previous)) return
      useChatStore.getState().replaceMessages(chatId, context.messages)
      setHistoryMode('context')
      setHasEarlier(context.hasEarlier)
      setHasLater(context.hasLater)
      setContextEndSeq(Math.max(...context.messages.map((item) => item.seq)))
      setTargetMessageId(message.id)
    } catch (cause) {
      showRequestError(cause)
    } finally {
      setLoading(false)
    }
  }

  const jumpToLatest = () => {
    setLoading(true)
    setHistoryAttempt((attempt) => attempt + 1)
  }

  useEffect(() => {
    if (!targetMessageId) return
    const timer = setTimeout(() => setTargetMessageId(undefined), 2500)
    return () => clearTimeout(timer)
  }, [targetMessageId])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    requestAnimationFrame(() => searchTriggerRef.current?.focus())
  }, [])

  useEffect(() => {
    const handleSearchKeyboard = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !chatAvailable) return
      if (matchesShortcut(event, Shortcut.MessageSearch)) {
        event.preventDefault()
        if (searchOpen) closeSearch()
        else setSearchOpen(true)
      } else if (searchOpen && event.key === 'Escape') {
        event.preventDefault()
        closeSearch()
      }
    }
    document.addEventListener('keydown', handleSearchKeyboard)
    return () => document.removeEventListener('keydown', handleSearchKeyboard)
  }, [chatAvailable, closeSearch, searchOpen])
  const focusComposer = () => {
    requestAnimationFrame(() => document.getElementById(`message-${chatId}`)?.focus())
  }

  const retry = async (clientId: string) => {
    try {
      await retryChatMessage(useChatStore, chatId, clientId, sendMessageRequest)
    } catch (cause) {
      showRequestError(cause)
    } finally {
      focusComposer()
    }
  }

  const discard = async (clientId: string) => {
    try {
      await discardChatMessage(useChatStore, chatId, clientId)
    } catch (cause) {
      showRequestError(cause)
    } finally {
      focusComposer()
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
    <section
      className="flex h-full min-h-0 flex-col bg-background"
      aria-labelledby={searchOpen ? undefined : 'chat-title'}
      aria-label={searchOpen ? t('chat:messageSearch.title') : undefined}
    >
      {searchOpen ? (
        <MessageSearchPanel
          chatId={chatId}
          onClose={closeSearch}
          onSelect={(message) => void jumpToMessage(message)}
        />
      ) : (
        <ChatHeader
          chatId={chatId}
          bot={chat.bot}
          searchTriggerRef={searchTriggerRef}
          onOpenSearch={() => setSearchOpen(true)}
        />
      )}
      <ConnectionBanner
        connection={connection}
        botOnline={chat.bot.online}
        pendingCount={messages.filter((message) => message.id.startsWith('pending:')).length}
      />
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
        messages={visibleMessages}
        historyMode={historyMode}
        historyRevision={historyAttempt}
        hasEarlier={hasEarlier}
        hasLater={hasLater}
        targetMessageId={targetMessageId}
        loading={loading}
        historyError={historyError}
        welcome={chat.bot.welcome}
        onLoadEarlier={loadEarlier}
        onLoadLater={loadLater}
        onJumpLatest={jumpToLatest}
        onRetry={retry}
        onDelete={discard}
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
