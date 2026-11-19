import { TEXT_MAX, type UserContent } from '@appercot/protocol'
import { ArrowUp, File, LoaderCircle, Paperclip, Terminal, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useChatStore } from '@/entities/chat'
import {
  fetchMediaLimit,
  mediaKindForMime,
  sendMessageRequest,
  uploadChatAttachment,
} from '@/entities/message'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import { displayShortcut } from '@/shared/lib/shortcuts'
import { Button } from '@/shared/ui/button'
import { Kbd } from '@/shared/ui/kbd'
import { Textarea } from '@/shared/ui/textarea'
import { shouldSubmitOnEnter } from '../model/keyboard'
import { sendChatMessage } from '../model/send-message'

interface ComposerProps {
  chatId: string
  onOpenCommands?: () => void
}

export const Composer = ({ chatId, onOpenCommands }: ComposerProps) => {
  const text = useChatStore((state) => state.draftsByChat[chatId] ?? '')
  const setText = (value: string) => useChatStore.getState().setDraft(chatId, value)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const sendContent = async (content: UserContent) => {
    if (submitting) return
    setSubmitting(true)
    setText('')
    try {
      await sendChatMessage(useChatStore, { chatId, content }, sendMessageRequest)
    } catch (error) {
      showRequestError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const sendText = async (content: string) => {
    if (content) await sendContent({ text: content })
  }

  const upload = async (file: File) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const limit = await fetchMediaLimit()
      if (limit && file.size > limit) throw new Error('Размер вложения превышает лимит сервера.')
      const { fileId, mime } = await uploadChatAttachment(chatId, file)
      const caption = text.trim()
      setText('')
      setAttachment(null)
      await sendChatMessage(
        useChatStore,
        {
          chatId,
          content: {
            media: [{ fileId, kind: mediaKindForMime(mime) }],
            ...(caption ? { text: caption } : {}),
          },
        },
        sendMessageRequest,
      )
    } catch (error) {
      showRequestError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (attachment) void upload(attachment)
    else void sendText(text.trim())
  }

  return (
    <div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 md:px-6 md:pb-5">
      <form
        ref={formRef}
        action={`/c/${chatId}`}
        method="post"
        className="relative mx-auto grid max-w-3xl gap-1 rounded-3xl border bg-card p-2 shadow-md focus-within:border-ring"
        onSubmit={submit}
      >
        {attachment ? (
          <div className="mx-2 mt-1 flex max-w-full items-center gap-2 justify-self-start rounded-xl border bg-background py-1 pl-2 pr-1">
            <File aria-hidden="true" className="ml-1 size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate text-sm" title={attachment.name}>
              {attachment.name}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={submitting}
              aria-label={strings.chat.removeAttachment}
              onClick={() => setAttachment(null)}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        ) : null}
        <input
          ref={fileRef}
          id={`attachment-${chatId}`}
          name="file"
          type="file"
          hidden
          disabled={submitting}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (!file) return
            setAttachment(file)
          }}
        />
        <label htmlFor={`message-${chatId}`} className="sr-only">
          {strings.chat.message}
        </label>
        <Textarea
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
          placeholder={strings.chat.messagePlaceholder}
          rows={1}
          readOnly={submitting}
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
            aria-label={strings.chat.attach}
            title={strings.chat.attach}
            disabled={submitting}
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
              aria-label={strings.chat.commandsTitle}
              aria-haspopup="dialog"
              aria-keyshortcuts="Control+J Meta+J"
              title={`${strings.chat.commandsTitle} (${displayShortcut('Mod+J')})`}
              onClick={onOpenCommands}
            >
              <Terminal aria-hidden="true" />
              <Kbd aria-hidden="true" className="hidden sm:inline-flex">
                {displayShortcut('Mod+J')}
              </Kbd>
            </Button>
          ) : null}
          <Button
            type="submit"
            size="icon-sm"
            className="ml-auto rounded-full"
            aria-label={strings.chat.send}
            disabled={(!text.trim() && !attachment) || submitting}
          >
            {submitting ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <ArrowUp aria-hidden="true" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
