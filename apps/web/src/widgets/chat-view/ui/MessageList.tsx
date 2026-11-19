import type { BotCommand, Button } from '@appercot/protocol'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, MessageSquareText } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { pressButtonRequest, useChatStore } from '@/entities/chat'
import { BotMessage, SystemMessage, sendMessageRequest, UserMessage } from '@/entities/message'
import {
  ChatCommandPalette,
  explicitButtonShortcuts,
  type PaletteButton,
} from '@/features/command-menu'
import { sendChatMessage } from '@/features/send-message'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import { toast } from '@/shared/lib/toast'
import type { ChatMessage } from '@/shared/model'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { Button as UiButton } from '@/shared/ui/button'
import { runButtonAction } from '../model/button-actions'

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

const dayFormat = new Intl.DateTimeFormat('ru', { dateStyle: 'long' })

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
        aria-label={strings.chat.title}
        aria-busy={loading}
        data-chat-id={chatId}
        onScroll={() => setShowLatest(!virtualizer.isAtEnd(80))}
      >
        <div className="mx-auto flex min-h-full max-w-3xl flex-col">
          {messages.length === 0 && !loading && !historyError ? (
            <div className="grid flex-1 place-items-center text-center">
              <div
                className={
                  welcome
                    ? 'max-w-md rounded-2xl border bg-card px-5 py-4'
                    : 'grid justify-items-center gap-3'
                }
              >
                {welcome ? (
                  <BotMessage
                    message={{
                      id: 'welcome',
                      chatId,
                      seq: 1,
                      sender: 'bot',
                      content: { text: welcome },
                      status: 'processed',
                      createdAt: 0,
                    }}
                    commands={commands}
                    onCommand={blocked ? undefined : sendCommand}
                  />
                ) : (
                  <>
                    <MessageSquareText
                      aria-hidden="true"
                      className="size-10 rounded-xl bg-accent p-2 text-primary"
                    />
                    <p className="text-sm text-muted-foreground">{strings.chat.noMessages}</p>
                  </>
                )}
              </div>
            </div>
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
                    {loading ? strings.chat.loading : strings.chat.loadEarlier}
                  </UiButton>
                </li>
              ) : null}
              {rows.map((row) => {
                const index = row.index
                const message = messages[index]
                if (!message) return null
                const style = { transform: `translateY(${row.start}px)` }
                const date = new Date(message.createdAt)
                const previous = messages[index - 1]
                const newDay =
                  !previous || date.toDateString() !== new Date(previous.createdAt).toDateString()
                return (
                  <li
                    key={row.key}
                    data-index={row.index}
                    ref={virtualizer.measureElement}
                    className="absolute inset-x-0 top-0 min-w-0 pb-3"
                    style={style}
                  >
                    {newDay ? (
                      <p className="mb-4 text-center text-xs font-medium text-muted-foreground">
                        {dayFormat.format(date)}
                      </p>
                    ) : null}
                    {message.sender === 'user' ? (
                      <UserMessage
                        message={message}
                        onRetry={onRetry}
                        commands={commands}
                        onCommand={blocked ? undefined : sendCommand}
                      />
                    ) : message.sender === 'system' ? (
                      <SystemMessage text={message.content.text ?? ''} />
                    ) : (
                      <BotMessage
                        message={message}
                        commands={commands}
                        onCommand={blocked ? undefined : sendCommand}
                        buttonShortcuts={
                          message.id === lastBotMessage?.id && !blocked
                            ? buttonShortcuts
                            : undefined
                        }
                        pendingButtonKey={pendingButtonKey}
                        onButtonAction={(button, key) =>
                          void handleButtonAction(message, button, key)
                        }
                      />
                    )}
                  </li>
                )
              })}
            </ol>
          )}
          {loading && messages.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{strings.chat.loading}</p>
          ) : null}
        </div>
      </div>
      {showLatest ? (
        <UiButton
          className="absolute right-5 bottom-4 shadow-md"
          variant="outline"
          onClick={() => virtualizer.scrollToEnd()}
        >
          <ArrowDown aria-hidden="true" />
          {strings.chat.jumpToLatest}
        </UiButton>
      ) : null}
      <AlertDialog
        open={externalUrl !== null}
        onOpenChange={(open) => !open && settleExternalUrl(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{strings.chat.externalLinkTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {strings.chat.externalLinkDescription}
              <span className="mt-2 block break-all font-medium text-foreground">
                {externalUrl}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settleExternalUrl(false)}>
              {strings.chat.cancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => settleExternalUrl(true)}>
              {strings.chat.openLink}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
