import type { BotCommand, Button } from '@appercot/protocol'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { pressButtonRequest, useChatStore } from '@/entities/chat'
import { sendMessageRequest } from '@/entities/message'
import {
  ChatCommandPalette,
  explicitButtonShortcuts,
  type PaletteButton,
} from '@/features/command-menu'
import { sendChatMessage } from '@/features/send-message'
import { showRequestError } from '@/shared/api'
import { toast } from '@/shared/lib/toast'
import type { ChatMessage } from '@/shared/model'
import { Button as UiButton } from '@/shared/ui/button'
import { PagePlaceholder } from '@/shared/ui/page-placeholder'
import { runButtonAction } from '../model/button-actions'
import { EmptyChat } from './message-list/EmptyChat'
import { ExternalLinkDialog } from './message-list/ExternalLinkDialog'
import { MessageRow } from './message-list/MessageRow'

interface MessageListProps {
  chatId: string
  messages: ChatMessage[]
  hasMore: boolean
  loading: boolean
  historyError: boolean
  welcome?: string
  onLoadEarlier: () => void
  onRetry: (clientId: string) => void
  commands?: BotCommand[]
  paletteOpen?: boolean
  onPaletteOpen?: (open: boolean) => void
  blocked?: boolean
}

export const MessageList = ({
  chatId,
  messages,
  hasMore,
  loading,
  historyError,
  welcome,
  onLoadEarlier,
  onRetry,
  commands = [],
  paletteOpen = false,
  onPaletteOpen,
  blocked = false,
}: MessageListProps) => {
  const { t } = useTranslation()
  const viewport = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)
  const [showLatest, setShowLatest] = useState(false)
  const [pendingButtonKey, setPendingButtonKey] = useState<string | null>(null)
  const [externalUrl, setExternalUrl] = useState<string | null>(null)
  const urlResolver = useRef<((confirmed: boolean) => void) | null>(null)
  const itemKey = useCallback((index: number) => messages[index]?.id ?? index, [messages])
  const estimateSize = (index: number) => {
    const message = messages[index]
    return message?.content.media?.some(({ kind }) => kind === 'video' || kind === 'image')
      ? 320
      : 84
  }
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => viewport.current,
    estimateSize,
    getItemKey: itemKey,
    anchorTo: 'end',
    followOnAppend: true,
    scrollEndThreshold: 80,
    overscan: 8,
    paddingStart: hasMore ? 64 : 20,
    paddingEnd: 16,
  })
  const rows = virtualizer.getVirtualItems()
  const lastBotMessage = messages.findLast((message) => message.sender === 'bot')
  const paletteButtons = (lastBotMessage?.content.buttons ?? []).flatMap((row, rowIndex) =>
    row.map((button, columnIndex) => ({
      button,
      key: `${lastBotMessage?.id}:${rowIndex}:${columnIndex}`,
    })),
  )
  const sendCommand = (command: string) => {
    if (blocked) return
    void sendChatMessage(
      useChatStore,
      { chatId, content: { text: command } },
      sendMessageRequest,
    ).catch(showRequestError)
  }

  useLayoutEffect(() => {
    if (initialized.current || loading || !messages.length) return
    initialized.current = true
    virtualizer.scrollToEnd()
  }, [loading, messages.length, virtualizer])

  useEffect(() => () => urlResolver.current?.(false), [])

  const settleExternalUrl = (confirmed: boolean) => {
    urlResolver.current?.(confirmed)
    urlResolver.current = null
    setExternalUrl(null)
  }

  const handleButtonAction = async (message: ChatMessage, button: Button, key: string) => {
    if (blocked || pendingButtonKey) return
    setPendingButtonKey(key)
    try {
      await runButtonAction(button, {
        pressCallback: (data) => pressButtonRequest({ chatId, messageId: message.id, data }),
        sendCommand: (command) =>
          sendChatMessage(useChatStore, { chatId, content: { text: command } }, sendMessageRequest),
        confirmUrl: (url) =>
          new Promise<boolean>((resolve) => {
            urlResolver.current = resolve
            setExternalUrl(url)
          }),
        openUrl: (url) => {
          window.open(url, '_blank', 'noopener,noreferrer')
        },
        notify: (message) => toast(message, { toasterId: 'appercot' }),
      })
    } catch (error) {
      showRequestError(error)
    } finally {
      setPendingButtonKey(null)
    }
  }

  const runPaletteButton = ({ button, key }: PaletteButton) => {
    if (lastBotMessage) void handleButtonAction(lastBotMessage, button, key)
  }
  const buttonShortcuts = explicitButtonShortcuts(commands, paletteButtons)

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {onPaletteOpen ? (
        <ChatCommandPalette
          open={paletteOpen}
          onOpenChange={onPaletteOpen}
          enabled={!blocked}
          commands={commands}
          buttons={paletteButtons}
          onCommand={sendCommand}
          onButton={runPaletteButton}
        />
      ) : null}
      <div
        ref={viewport}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 [overflow-anchor:none] [scrollbar-gutter:stable] md:px-8"
        role="log"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: The scrollable history needs a keyboard focus target.
        tabIndex={0}
        aria-label={t('chat:title')}
        aria-busy={loading}
        data-chat-id={chatId}
        onScroll={() => setShowLatest(!virtualizer.isAtEnd(80))}
      >
        <div className="mx-auto flex min-h-full max-w-3xl flex-col">
          {messages.length === 0 && !loading && !historyError ? (
            <EmptyChat
              chatId={chatId}
              welcome={welcome}
              commands={commands}
              blocked={blocked}
              onCommand={sendCommand}
            />
          ) : (
            <ol className="relative" style={{ height: virtualizer.getTotalSize() }}>
              {hasMore ? (
                <li className="absolute inset-x-0 top-5 text-center">
                  <UiButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onLoadEarlier}
                    disabled={loading}
                  >
                    {loading ? t('chat:loading') : t('chat:loadEarlier')}
                  </UiButton>
                </li>
              ) : null}
              {rows.map((row) => {
                const message = messages[row.index]
                if (!message) return null
                return (
                  <MessageRow
                    key={row.key}
                    index={row.index}
                    message={message}
                    previous={messages[row.index - 1]}
                    lastBotMessageId={lastBotMessage?.id}
                    commands={commands}
                    buttonShortcuts={buttonShortcuts}
                    pendingButtonKey={pendingButtonKey}
                    blocked={blocked}
                    style={{ transform: `translateY(${row.start}px)` }}
                    measureElement={virtualizer.measureElement}
                    onRetry={onRetry}
                    onCommand={sendCommand}
                    onButtonAction={(target, button, key) =>
                      void handleButtonAction(target, button, key)
                    }
                  />
                )
              })}
            </ol>
          )}
          {loading && messages.length === 0 ? <PagePlaceholder variant="messages" /> : null}
        </div>
      </div>
      {showLatest ? (
        <UiButton
          className="absolute right-5 bottom-4 shadow-md"
          variant="outline"
          onClick={() => virtualizer.scrollToEnd()}
        >
          <ArrowDown aria-hidden="true" />
          {t('chat:jumpToLatest')}
        </UiButton>
      ) : null}
      <ExternalLinkDialog url={externalUrl} onSettle={settleExternalUrl} />
    </div>
  )
}
