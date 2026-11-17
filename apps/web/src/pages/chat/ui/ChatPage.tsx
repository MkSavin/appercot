import { MessageSquareText } from 'lucide-react'
import { useParams } from 'wouter'
import { strings } from '@/shared/config'
import { Sidebar } from '@/widgets/chat-list'
import { ChatView } from '@/widgets/chat-view'

export const ChatPage = () => {
  const params = useParams<{ chatId?: string }>()
  const chatId = params.chatId

  return (
    <div className="grid min-h-dvh bg-background md:grid-cols-[320px_minmax(0,1fr)]">
      <Sidebar activeChatId={chatId} />
      <main className={chatId ? 'min-w-0' : 'hidden min-w-0 md:block'}>
        {chatId ? (
          <ChatView chatId={chatId} />
        ) : (
          <section className="grid h-dvh place-items-center p-8 text-center">
            <div className="max-w-sm">
              <span className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
                <MessageSquareText aria-hidden="true" className="size-7" />
              </span>
              <h1 className="text-xl font-semibold tracking-tight">{strings.chat.emptyTitle}</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {strings.chat.emptyDescription}
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
