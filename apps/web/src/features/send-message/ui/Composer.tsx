import { TEXT_MAX, type UserContent } from '@appercot/protocol'
import { ArrowUp, LoaderCircle, Paperclip, Terminal } from 'lucide-react'
import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/entities/chat'
import { sendMessageRequest } from '@/entities/message'
import { showRequestError } from '@/shared/api'
import { ariaShortcut, displayShortcut, Shortcut } from '@/shared/lib/shortcuts'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Button } from '@/shared/ui/button'
import { ShortcutKbd } from '@/shared/ui/shortcut-kbd'
import { Textarea } from '@/shared/ui/textarea'
import { attachmentQueueFor } from '../model/attachment-queue'
import { shouldSubmitOnEnter } from '../model/keyboard'
import { sendChatMessage, setChatDraft } from '../model/send-message'
import { AttachmentList } from './AttachmentList'
import { ComposerDropTarget } from './ComposerDropTarget'

interface ComposerProps {
  chatId: string
  onOpenCommands?: () => void
}

export const Composer = ({ chatId, onOpenCommands }: ComposerProps) => {
  const { t } = useTranslation()
  const text = useChatStore((state) => state.draftsByChat[chatId] ?? '')
  const userId = useChatStore((state) => state.user?.id ?? '')
  const queue = useMemo(() => attachmentQueueFor(userId, chatId), [userId, chatId])
  const { items, notice } = useSyncExternalStore(
    queue.subscribe,
    queue.getSnapshot,
    queue.getSnapshot,
  )
  const setText = (value: string) => setChatDraft(useChatStore, chatId, value)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const submit = async () => {
    if (submitting) return
    const caption = text.trim()
    if (!caption && !items.length) return
    setSubmitting(true)
    try {
      await queue.submit(async (batch) => {
        const state = useChatStore.getState()
        const chat = state.chats.find((candidate) => candidate.id === chatId)
        if (state.user?.id !== userId || !chat || chat.blocked) return
        const content: UserContent = {
          ...(caption ? { text: caption } : {}),
          ...(batch.media.length ? { media: batch.media } : {}),
        }
        await sendChatMessage(useChatStore, { chatId, content }, sendMessageRequest, {
          clearDraft: text,
        })
      })
    } catch (error) {
      showRequestError(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 md:px-6 md:pb-5">
      <ComposerDropTarget onFiles={(files) => void queue.addFiles(files)}>
        <form
          ref={formRef}
          action={`/c/${chatId}`}
          method="post"
          className="relative mx-auto grid max-w-3xl gap-1 rounded-3xl border bg-card p-2 shadow-md focus-within:border-ring"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
          onPaste={(event) => {
            const files = Array.from(event.clipboardData.files)
            if (!files.length) return
            event.preventDefault()
            void queue.addFiles(files)
          }}
        >
          <AttachmentList
            items={items}
            notice={notice}
            waiting={submitting && items.length > 0}
            onCancel={queue.cancel}
            onRetry={queue.retry}
            onRemove={queue.remove}
          />
          <input
            {...testId(testIds.chat.composer.fileInput)}
            ref={fileRef}
            id={`attachment-${chatId}`}
            name="file"
            type="file"
            multiple
            hidden
            onChange={(event) => {
              const files = Array.from(event.currentTarget.files ?? [])
              event.currentTarget.value = ''
              void queue.addFiles(files)
            }}
          />
          <label htmlFor={`message-${chatId}`} className="sr-only">
            {t('chat:message')}
          </label>
          <Textarea
            {...testId(testIds.chat.composer.input)}
            id={`message-${chatId}`}
            name="message"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              const touchKeyboard = window.matchMedia('(pointer: coarse)').matches
              if (!shouldSubmitOnEnter(event.nativeEvent, touchKeyboard)) return
              event.preventDefault()
              formRef.current?.requestSubmit()
            }}
            placeholder={t('chat:messagePlaceholder')}
            rows={1}
            maxLength={TEXT_MAX}
            enterKeyHint="send"
            className="max-h-40 min-h-11 min-w-0 resize-none border-0 bg-transparent px-3 py-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <div className="flex items-center gap-1 px-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 rounded-lg text-muted-foreground"
              aria-label={t('chat:attach')}
              title={t('chat:attach')}
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip aria-hidden="true" />
            </Button>
            {onOpenCommands ? (
              <Button
                type="button"
                variant="ghost"
                className="shrink-0 text-muted-foreground"
                disabled={submitting}
                aria-label={`${t('chat:commandsTitle')} ${displayShortcut(Shortcut.CommandPalette)}`}
                aria-haspopup="dialog"
                aria-keyshortcuts={ariaShortcut(Shortcut.CommandPalette)}
                title={`${t('chat:commandsTitle')} (${displayShortcut(Shortcut.CommandPalette)})`}
                onClick={onOpenCommands}
              >
                <Terminal aria-hidden="true" />
                <ShortcutKbd
                  aria-hidden="true"
                  className="hidden sm:inline-flex"
                  shortcut={Shortcut.CommandPalette}
                />
              </Button>
            ) : null}
            <Button
              {...testId(testIds.chat.composer.send)}
              type="submit"
              size="icon-sm"
              className="ml-auto rounded-full"
              aria-label={submitting && items.length ? t('upload:waitingForFiles') : t('chat:send')}
              disabled={(!text.trim() && !items.length) || submitting}
            >
              {submitting ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <ArrowUp aria-hidden="true" />
              )}
            </Button>
          </div>
        </form>
      </ComposerDropTarget>
    </div>
  )
}
