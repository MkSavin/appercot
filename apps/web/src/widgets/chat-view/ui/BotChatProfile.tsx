import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { blockBotRequest, fetchChatProfile, useChatStore } from '@/entities/chat'
import { BlockBotDialog, updateChatBlocked } from '@/features/block-bot'
import { showRequestError } from '@/shared/api'
import { Button } from '@/shared/ui/button'
import { PagePlaceholder } from '@/shared/ui/page-placeholder'
import { WorkspaceHeader } from '@/shared/ui/workspace-header'
import { BotProfileSummary } from './bot-profile/BotProfileSummary'
import { ChatMediaSection } from './bot-profile/ChatMediaSection'
import { DeleteChatDialog } from './bot-profile/DeleteChatDialog'

export const BotChatProfile = ({ chatId }: { chatId: string }) => {
  const { t } = useTranslation()
  const chat = useChatStore((state) => state.chats.find((item) => item.id === chatId))
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof fetchChatProfile>>>()
  const [failed, setFailed] = useState(false)
  const [pending, setPending] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [mediaCursors, setMediaCursors] = useState<number[]>([])
  useEffect(() => {
    if (profile || failed) return
    let active = true
    fetchChatProfile(chatId)
      .then((data) => {
        if (active) setProfile(data)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [chatId, failed, profile])

  const run = async (operation: () => Promise<void>) => {
    setPending(true)
    try {
      await operation()
    } catch (error) {
      showRequestError(error)
    } finally {
      setPending(false)
    }
  }
  const loadMediaPage = (cursors: number[]) =>
    void run(async () => {
      const page = await fetchChatProfile(chatId, cursors.at(-1))
      setProfile(
        (current) =>
          current && { ...current, media: page.media, olderMediaBefore: page.olderMediaBefore },
      )
      setMediaCursors(cursors)
    })

  return (
    <section className="h-full overflow-y-auto">
      <WorkspaceHeader
        className="pt-[env(safe-area-inset-top)]"
        before={
          <Button asChild variant="ghost" size="icon">
            <Link href={chat ? `/c/${chatId}` : '/'} aria-label={t('chat:back')}>
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
        }
      >
        {t('bot:profile')}
      </WorkspaceHeader>
      <div className="mx-auto grid max-w-3xl gap-6 p-4 md:p-7">
        {!profile ? (
          failed ? (
            <div className="grid justify-items-start gap-3">
              <p role="alert">{t('bot:profileFailed')}</p>
              <Button variant="outline" onClick={() => setFailed(false)}>
                {t('common:retry')}
              </Button>
            </div>
          ) : (
            <PagePlaceholder variant="profile" />
          )
        ) : (
          <>
            <BotProfileSummary
              chatId={chatId}
              bot={{ ...profile.bot, ...chat?.bot }}
              blocked={chat?.blocked ?? profile.blocked}
              pending={pending}
              onBlock={() => {
                if (!(chat?.blocked ?? profile.blocked)) setBlockOpen(true)
                else
                  void run(async () => {
                    await updateChatBlocked(useChatStore, chatId, false, blockBotRequest)
                    setProfile((current) => current && { ...current, blocked: false })
                  })
              }}
              onDelete={() => setDeleteOpen(true)}
            />
            <BlockBotDialog chatId={chatId} open={blockOpen} onOpenChange={setBlockOpen} />
            <DeleteChatDialog
              chatId={chatId}
              open={deleteOpen}
              pending={pending}
              run={run}
              onOpenChange={setDeleteOpen}
            />
            <ChatMediaSection
              media={profile.media}
              olderMediaBefore={profile.olderMediaBefore}
              mediaCursors={mediaCursors}
              pending={pending}
              onLoadPage={loadMediaPage}
            />
          </>
        )}
      </div>
    </section>
  )
}
