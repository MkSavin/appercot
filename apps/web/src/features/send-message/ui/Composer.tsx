import { ArrowUp, LoaderCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { useChatStore } from '@/entities/chat'
import { sendMessageRequest } from '@/entities/message'
import { strings } from '@/shared/config'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import { shouldSubmitOnEnter } from '../model/keyboard'
import { sendChatMessage } from '../model/send-message'

export const Composer = ({ chatId }: { chatId: string }) => {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const submit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const content = text.trim()
    if (!content || submitting) return
    setText('')
    setError(null)
    setSubmitting(true)
    try {
      await sendChatMessage(
        useChatStore,
        { chatId, content: { text: content } },
        sendMessageRequest,
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : strings.auth.failed)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border-t bg-background px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:px-6 md:pb-5">
      <form
        ref={formRef}
        action={`/c/${chatId}`}
        method="post"
        className="mx-auto flex max-w-3xl items-end gap-2"
        onSubmit={submit}
      >
        <label htmlFor={`message-${chatId}`} className="sr-only">
          {strings.chat.message}
        </label>
        <Textarea
          id={`message-${chatId}`}
          name="message"
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setError(null)
          }}
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
      {error ? (
        <p role="alert" className="mx-auto mt-2 max-w-3xl text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
