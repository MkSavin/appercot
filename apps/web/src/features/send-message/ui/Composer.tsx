import type { UserContent } from '@appercot/protocol'
import { ArrowUp, LoaderCircle, Paperclip } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'
import { useChatStore } from '@/entities/chat'
import { mediaKindForMime, sendMessageRequest, uploadChatMedia } from '@/entities/message'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import { shouldSubmitOnEnter } from '../model/keyboard'
import { sendChatMessage } from '../model/send-message'

interface ComposerProps {
  chatId: string
  renderCommandMenu?: (query: string, onSelect: (command: string) => void) => ReactNode
}

export const Composer = ({ chatId, renderCommandMenu }: ComposerProps) => {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const sendContent = async (content: UserContent) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await sendChatMessage(useChatStore, { chatId, content }, sendMessageRequest)
      setText('')
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
      const fileId = await uploadChatMedia(chatId, file)
      const caption = text.trim()
      await sendChatMessage(
        useChatStore,
        {
          chatId,
          content: {
            media: [{ fileId, kind: mediaKindForMime(file.type), ...(caption ? { caption } : {}) }],
            ...(caption ? { text: caption } : {}),
          },
        },
        sendMessageRequest,
      )
      setText('')
    } catch (error) {
      showRequestError(error)
    } finally {
      setSubmitting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void sendText(text.trim())
  }

  return (
    <div className="border-t bg-background px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:px-6 md:pb-5">
      <form
        ref={formRef}
        action={`/c/${chatId}`}
        method="post"
        className="relative mx-auto flex max-w-3xl items-end gap-2"
        onSubmit={submit}
      >
        {renderCommandMenu?.(text, (command) => void sendText(command))}
        <input
          ref={fileRef}
          id={`attachment-${chatId}`}
          name="file"
          type="file"
          className="sr-only"
          disabled={submitting}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            if (file) void upload(file)
          }}
        />
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 rounded-xl text-muted-foreground"
        >
          <label
            htmlFor={`attachment-${chatId}`}
            aria-label={strings.chat.attach}
            title={strings.chat.attach}
          >
            <Paperclip aria-hidden="true" />
          </label>
        </Button>
        <label htmlFor={`message-${chatId}`} className="sr-only">
          {strings.chat.message}
        </label>
        <Textarea
          id={`message-${chatId}`}
          name="message"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.shiftKey) return
            const isMobile = window.matchMedia('(max-width: 767px)').matches
            if (isMobile) return
            event.preventDefault()
            if (shouldSubmitOnEnter(event, false)) formRef.current?.requestSubmit()
          }}
          placeholder={strings.chat.messagePlaceholder}
          rows={1}
          maxLength={8192}
          enterKeyHint="send"
          className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl bg-secondary/60 px-4 py-3 shadow-none"
        />
        <Button
          type="submit"
          size="icon"
          className="size-11 rounded-xl"
          aria-label={strings.chat.send}
          disabled={!text.trim() || submitting}
        >
          {submitting ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : (
            <ArrowUp aria-hidden="true" />
          )}
        </Button>
      </form>
    </div>
  )
}
