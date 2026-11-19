import { Terminal } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'wouter'
import { BotAvatar } from '@/entities/bot'
import { BotMessage, parseGraphqlMessage, UserMessage } from '@/entities/message'
import { ChatCommandPalette, explicitButtonShortcuts } from '@/features/command-menu'
import {
  GuestChatDocument,
  graphqlClient,
  OpenGuestChatDocument,
  SendGuestCommandDocument,
  showRequestError,
} from '@/shared/api'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

const getChat = async (username: string, signal?: AbortSignal) => {
  const { guestChat } = await graphqlClient.request({
    document: GuestChatDocument,
    variables: { username },
    signal,
  })
  return {
    ...guestChat,
    commands: guestChat.commands.map(({ shortcut, ...command }) => ({
      ...command,
      shortcut: shortcut ?? undefined,
    })),
    messages: guestChat.messages.map(parseGraphqlMessage),
  }
}

const GuestChat = ({ username }: { username: string }) => {
  const [chat, setChat] = useState<Awaited<ReturnType<typeof getChat>>>()
  const [failed, setFailed] = useState(false)
  const [pending, setPending] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const log = useRef<HTMLDivElement>(null)
  const revision = useRef(0)
  const active = chat?.active ?? false
  const last = chat?.messages.at(-1)?.id
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const requested = ++revision.current
      try {
        const next = await getChat(username, signal)
        if (signal?.aborted || requested !== revision.current) return
        setChat(next)
        setFailed(false)
      } catch (error) {
        if (signal?.aborted || requested !== revision.current) return
        setFailed(true)
        throw error
      }
    },
    [username],
  )

  useEffect(() => {
    const abort = new AbortController()
    void refresh(abort.signal).catch(() => {})
    const timer = active
      ? window.setInterval(() => {
          if (document.visibilityState === 'visible') void refresh(abort.signal).catch(() => {})
        }, 1800)
      : undefined
    return () => {
      abort.abort()
      if (timer !== undefined) window.clearInterval(timer)
    }
  }, [active, refresh])

  useEffect(() => {
    if (last && log.current) log.current.scrollTop = log.current.scrollHeight
  }, [last])

  const run = async (operation: () => Promise<unknown>) => {
    if (pending) return
    setPending(true)
    try {
      await operation()
      await refresh()
    } catch (error) {
      showRequestError(error)
    } finally {
      setPending(false)
    }
  }
  const send = (command: string) => {
    if (!chat?.active || !chat.commands.some(({ name }) => command === `/${name}`)) return
    void run(() =>
      graphqlClient.request(SendGuestCommandDocument, {
        username,
        command,
        clientId: crypto.randomUUID(),
      }),
    )
  }

  if (failed || !chat)
    return (
      <main className="grid min-h-dvh place-items-center p-5">
        {failed ? (
          <div className="grid justify-items-center gap-3">
            <p role="status">Гостевой чат сейчас недоступен.</p>
            <Button variant="outline" onClick={() => void refresh().catch(showRequestError)}>
              Повторить
            </Button>
          </div>
        ) : (
          <p role="status">Загрузка гостевого чата…</p>
        )}
      </main>
    )
  const message = chat.messages.findLast((entry) => entry.sender === 'bot')
  const canRun = active && chat.bot.online && !pending
  const buttons = (message?.content.buttons ?? []).flatMap((row, i) =>
    row.flatMap((button, j) =>
      'command' in button && chat.commands.some(({ name }) => button.command === `/${name}`)
        ? [{ button, key: `${message?.id}:${i}:${j}` }]
        : [],
    ),
  )
  const shortcuts = explicitButtonShortcuts(chat.commands, buttons)
  return (
    <main className="flex h-dvh min-h-0 flex-col bg-background">
      <header className="border-b bg-card pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <BotAvatar bot={chat.bot} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold">{chat.bot.name}</h1>
            <p className="text-xs text-muted-foreground">@{chat.bot.username}</p>
          </div>
          <Badge variant="secondary">Гость</Badge>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Войти</Link>
          </Button>
        </div>
      </header>
      <div
        ref={log}
        role="log"
        aria-label="Гостевой чат"
        className="min-h-0 flex-1 overflow-y-auto px-4"
      >
        <div className="mx-auto grid max-w-3xl gap-3 py-5">
          {!chat.messages.length ? (
            <section className="settings-card grid justify-items-start gap-3">
              {chat.bot.description ? (
                <p className="whitespace-pre-wrap">{chat.bot.description}</p>
              ) : null}
              {chat.bot.welcome ? (
                <p className="whitespace-pre-wrap text-sm">{chat.bot.welcome}</p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                {chat.bot.online
                  ? 'В гостевом чате можно попробовать доступные команды.'
                  : 'Бот сейчас не в сети.'}
              </p>
              {!active ? (
                <Button
                  disabled={pending || !chat.commands.length}
                  onClick={() =>
                    void run(() => graphqlClient.request(OpenGuestChatDocument, { username }))
                  }
                >
                  Открыть гостевой чат
                </Button>
              ) : null}
            </section>
          ) : null}
          {chat.messages.map((item) =>
            item.sender === 'bot' ? (
              <BotMessage
                key={item.id}
                message={item}
                commands={chat.commands}
                buttonShortcuts={canRun && item.id === message?.id ? shortcuts : undefined}
                onCommand={canRun ? send : undefined}
                onButtonAction={
                  canRun
                    ? (button) => {
                        if ('command' in button) send(button.command)
                      }
                    : undefined
                }
              />
            ) : (
              <UserMessage
                key={item.id}
                message={item}
                commands={chat.commands}
                onCommand={canRun ? send : undefined}
              />
            ),
          )}
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-3xl gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        {chat.commands.length ? (
          <div className="flex flex-wrap gap-2">
            {chat.commands.map((command) => (
              <Button
                key={command.name}
                variant="outline"
                size="sm"
                disabled={!canRun}
                title={command.description}
                onClick={() => send(`/${command.name}`)}
              >
                /{command.name}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Бот пока не опубликовал команды для гостей.
          </p>
        )}
        {active ? (
          <Button
            variant="secondary"
            className="justify-self-start"
            disabled={!canRun}
            onClick={() => setPaletteOpen(true)}
          >
            <Terminal aria-hidden="true" />
            Команды
          </Button>
        ) : null}
      </div>
      <ChatCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        enabled={canRun}
        commands={chat.commands}
        buttons={buttons}
        onCommand={send}
        onButton={({ button }) => {
          if ('command' in button) send(button.command)
        }}
      />
    </main>
  )
}

export const GuestChatPage = () => {
  const { username = '' } = useParams<{ username: string }>()
  return <GuestChat key={username} username={username} />
}
