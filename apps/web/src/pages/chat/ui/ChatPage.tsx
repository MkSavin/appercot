import { Compass, MessageSquareText } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'wouter'
import { useChatStore } from '@/entities/chat'
import { Button } from '@/shared/ui/button'
import { PagePlaceholder } from '@/shared/ui/page-placeholder'
import { Sidebar } from '@/widgets/chat-list'

const ChatView = lazy(() =>
  import('@/widgets/chat-view').then(({ ChatView }) => ({ default: ChatView })),
)
const BotChatProfile = lazy(() =>
  import('@/widgets/chat-view').then(({ BotChatProfile }) => ({ default: BotChatProfile })),
)

export const ChatPage = () => {
  const { t } = useTranslation()
  const params = useParams<{ chatId?: string; panel?: string }>()
  const chatId = params.chatId
  const hasChats = useChatStore((state) => state.chats.length > 0)

  return (
    <div className="grid h-full min-h-0 bg-background md:grid-cols-[var(--context-width)_minmax(0,1fr)]">
      <Sidebar activeChatId={chatId} />
      <main className={chatId ? 'min-h-0 min-w-0' : 'hidden min-h-0 min-w-0 md:block'}>
        {chatId ? (
          <Suspense fallback={<PagePlaceholder variant="chat" />}>
            {params.panel === 'profile' ? (
              <BotChatProfile key={chatId} chatId={chatId} />
            ) : (
              <ChatView key={chatId} chatId={chatId} />
            )}
          </Suspense>
        ) : (
          <section className="workspace-surface grid h-full place-items-center p-8 text-center">
            <div className="max-w-sm">
              <span className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl border bg-card text-primary shadow-sm">
                <MessageSquareText aria-hidden="true" className="size-7" />
              </span>
              <h1 className="text-3xl font-semibold tracking-tight">
                {hasChats ? t('chat:emptyTitle') : t('chat:welcomeTitle')}
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {hasChats ? t('chat:emptyDescription') : t('chat:welcomeDescription')}
              </p>
              {!hasChats ? (
                <Button asChild className="mt-6">
                  <Link href="/browse">
                    <Compass aria-hidden="true" />
                    {t('chat:browse')}
                  </Link>
                </Button>
              ) : null}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
