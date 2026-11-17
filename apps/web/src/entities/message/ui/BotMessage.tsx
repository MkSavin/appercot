import type { ChatMessage } from '@/shared/model'
import { MarkdownContent } from './MarkdownContent'

export const BotMessage = ({ message }: { message: ChatMessage }) => (
  <article className="w-full py-5 text-[15px] leading-7 text-foreground first:pt-0">
    {message.content.text ? <MarkdownContent text={message.content.text} /> : null}
    {message.editedAt ? (
      <span className="mt-2 block text-xs text-muted-foreground">изменено</span>
    ) : null}
  </article>
)
