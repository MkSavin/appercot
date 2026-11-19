import { ArrowLeft, Bell, BellOff, Ellipsis, ShieldBan, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { BotAvatar } from '@/entities/bot'
import {
  blockBotRequest,
  deleteChatRequest,
  fetchChatProfile,
  setChatNotificationsRequest,
  useChatStore,
} from '@/entities/chat'
import { MediaGallery } from '@/entities/message'
import { BlockBotDialog, updateChatBlocked } from '@/features/block-bot'
import { ClearChatDialog } from '@/features/clear-chat'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
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
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

const isNotificationMode = (mode: string): mode is 'all' | 'silent' | 'off' =>
  mode === 'all' || mode === 'silent' || mode === 'off'

export const BotChatProfile = ({ chatId }: { chatId: string }) => {
  const [, navigate] = useLocation()
  const chat = useChatStore((state) => state.chats.find((item) => item.id === chatId))
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof fetchChatProfile>>>()
  const [failed, setFailed] = useState(false)
  const [pending, setPending] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
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
  const bot = chat?.bot ?? profile?.bot
  const blocked = chat?.blocked ?? profile?.blocked
  const notifications = chat?.notifications ?? profile?.notifications
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
      <header className="sticky top-0 z-10 border-b bg-card pt-[env(safe-area-inset-top)]">
        <div className="flex h-16 items-center gap-3 px-2 md:px-6">
          <Button asChild variant="ghost" size="icon">
            <Link href={chat ? `/c/${chatId}` : '/'} aria-label={strings.chat.back}>
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Профиль бота</h1>
        </div>
      </header>
      <div className="mx-auto grid max-w-3xl gap-6 p-4 md:p-7">
        {!profile || !bot ? (
          failed ? (
            <div className="grid justify-items-start gap-3">
              <p role="alert">Не удалось загрузить профиль бота.</p>
              <Button variant="outline" onClick={() => setFailed(false)}>
                Повторить загрузку
              </Button>
            </div>
          ) : (
            <p role="status" className="text-sm text-muted-foreground">
              Загрузка профиля…
            </p>
          )
        ) : (
          <>
            <div className="settings-card grid justify-items-center gap-3 py-6 text-center">
              <BotAvatar bot={bot} size="xl" />
              <div className="min-w-0">
                <h2 className="break-words text-2xl font-semibold">{bot.name}</h2>
                <p className="text-sm text-muted-foreground">@{bot.username}</p>
              </div>
              <Badge variant="secondary">
                {bot.online ? strings.chat.online : strings.chat.offlineStatus}
              </Badge>
              {bot.description ? (
                <p className="max-w-lg whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {bot.description}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={pending}>
                      {notifications === 'off' ? (
                        <BellOff aria-hidden="true" />
                      ) : (
                        <Bell aria-hidden="true" />
                      )}
                      Уведомления
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    <DropdownMenuRadioGroup
                      value={notifications}
                      onValueChange={(mode) => {
                        if (!isNotificationMode(mode)) return
                        void run(async () => {
                          await setChatNotificationsRequest(chatId, mode)
                          setProfile((current) => current && { ...current, notifications: mode })
                          const store = useChatStore.getState()
                          const currentChat = store.chats.find((item) => item.id === chatId)
                          if (currentChat) store.upsertChat({ ...currentChat, notifications: mode })
                        })
                      }}
                    >
                      <DropdownMenuRadioItem value="all">
                        Уведомления со звуком
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="silent">
                        Уведомления без звука
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="off">
                        Уведомления отключены
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={pending}
                      aria-label="Действия чата"
                    >
                      <Ellipsis aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => {
                        if (!blocked) setBlockOpen(true)
                        else
                          void run(async () => {
                            await updateChatBlocked(useChatStore, chatId, false, blockBotRequest)
                            setProfile((current) => current && { ...current, blocked: false })
                          })
                      }}
                    >
                      <ShieldBan aria-hidden="true" />
                      {blocked ? 'Разблокировать бота' : 'Заблокировать бота'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setClearOpen(true)}>
                      {strings.chat.clearChat}
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                      <Trash2 aria-hidden="true" />
                      Удалить чат
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <ClearChatDialog chatId={chatId} open={clearOpen} onOpenChange={setClearOpen} />
            <BlockBotDialog chatId={chatId} open={blockOpen} onOpenChange={setBlockOpen} />
            <AlertDialog
              open={deleteOpen}
              onOpenChange={(open) => {
                if (!pending) setDeleteOpen(open)
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить чат?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Чат исчезнет из списка, история удалится. Блокировка и разрешения сохранятся.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={pending}>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={pending}
                    onClick={(event) => {
                      event.preventDefault()
                      void run(async () => {
                        await deleteChatRequest(chatId)
                        useChatStore.getState().removeChat(chatId)
                        navigate('/', { replace: true })
                      })
                    }}
                  >
                    Удалить чат
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <section className="grid gap-3">
              <h2 className="text-base font-semibold">Медиа и файлы</h2>
              {profile.media.length ? (
                <div className="settings-card">
                  <MediaGallery media={profile.media} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">В этом чате пока нет вложений.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {mediaCursors.length > 0 ? (
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => loadMediaPage(mediaCursors.slice(0, -1))}
                  >
                    Новые вложения
                  </Button>
                ) : null}
                {profile.olderMediaBefore !== null ? (
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      if (profile.olderMediaBefore !== null)
                        loadMediaPage([...mediaCursors, profile.olderMediaBefore])
                    }}
                  >
                    Ранние вложения
                  </Button>
                ) : null}
              </div>
            </section>
          </>
        )}
      </div>
    </section>
  )
}
