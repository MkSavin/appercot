import type { Button } from '@appercot/protocol'
import { useEffect, useRef, useState } from 'react'
import { pressButtonRequest, useChatStore } from '@/entities/chat'
import { BotMessage, SystemMessage, sendMessageRequest, UserMessage } from '@/entities/message'
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
  onLoadEarlier: () => void
  onRetry: (clientId: string) => void
}

export const MessageList = ({
  chatId,
  messages,
  hasMore,
  loading,
  onLoadEarlier,
  onRetry,
}: MessageListProps) => {
  const endRef = useRef<HTMLDivElement>(null)
  const previousLastId = useRef<string | null>(null)
  const [pendingButtonKey, setPendingButtonKey] = useState<string | null>(null)
  const [externalUrl, setExternalUrl] = useState<string | null>(null)
  const urlResolver = useRef<((confirmed: boolean) => void) | null>(null)
  const lastId = messages.at(-1)?.id ?? null

  useEffect(() => {
    if (lastId === previousLastId.current) return
    previousLastId.current = lastId
    endRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' })
  }, [lastId])

  const settleExternalUrl = (confirmed: boolean) => {
    urlResolver.current?.(confirmed)
    urlResolver.current = null
    setExternalUrl(null)
  }

  const handleButtonAction = async (message: ChatMessage, button: Button, key: string) => {
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

  return (
    <>
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 [scrollbar-gutter:stable] md:px-8"
        role="log"
        aria-label={strings.chat.title}
        data-chat-id={chatId}
      >
        <div className="mx-auto max-w-3xl py-6">
          {hasMore ? (
            <div className="mb-5 text-center">
              <UiButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={onLoadEarlier}
                disabled={loading}
              >
                {strings.chat.loadEarlier}
              </UiButton>
            </div>
          ) : null}
          {messages.length === 0 && !loading ? (
            <div className="grid min-h-[40dvh] place-items-center text-center">
              <p className="text-sm text-muted-foreground">{strings.chat.noMessages}</p>
            </div>
          ) : (
            <ol className="divide-y divide-border/50">
              {messages.map((message) => (
                <li key={message.id} className="last:[scroll-initial-target:nearest]">
                  {message.sender === 'user' ? (
                    <UserMessage message={message} onRetry={onRetry} />
                  ) : message.sender === 'system' ? (
                    <SystemMessage text={message.content.text ?? ''} />
                  ) : (
                    <BotMessage
                      message={message}
                      pendingButtonKey={pendingButtonKey}
                      onButtonAction={(button, key) =>
                        void handleButtonAction(message, button, key)
                      }
                    />
                  )}
                </li>
              ))}
            </ol>
          )}
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{strings.chat.loading}</p>
          ) : null}
          <div ref={endRef} aria-hidden="true" />
        </div>
      </div>
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
    </>
  )
}
