import { type ReactNode, useEffect, useRef } from 'react'
import { useLocation } from 'wouter'
import { synchronizeChatState, useChatStore } from '@/entities/chat'
import { fetchMessages, fetchSynchronization } from '@/entities/message'
import { fetchSession } from '@/entities/session'
import { type ClientWebSocketTransport, createClientWebSocketTransport } from '@/shared/api'
import { AppToaster } from './AppToaster'

const activeChatFromLocation = (location: string) => /^\/c\/([^/]+)$/.exec(location)?.[1]

const useSessionBootstrap = () => {
  const setSession = useChatStore((state) => state.setSession)
  const setAnonymous = useChatStore((state) => state.setAnonymous)

  useEffect(() => {
    let active = true
    fetchSession()
      .then((session) => {
        if (active) setSession(session)
      })
      .catch(() => {
        if (active) setAnonymous()
      })
    return () => {
      active = false
    }
  }, [setAnonymous, setSession])
}

const useClientSynchronization = () => {
  const userId = useChatStore((state) => state.user?.id)
  const [location] = useLocation()
  const activeChatId = activeChatFromLocation(location)
  const locationRef = useRef(location)
  const transportRef = useRef<ClientWebSocketTransport | null>(null)
  locationRef.current = location

  useEffect(() => {
    if (!userId) return
    let active = true
    let synchronizing = false
    let syncRequested = false
    const typingTimers = new Map<string, ReturnType<typeof setTimeout>>()

    const scheduleTypingExpiration = (chatId: string, until: number) => {
      const previousTimer = typingTimers.get(chatId)
      if (previousTimer) clearTimeout(previousTimer)
      const timer = setTimeout(
        () => {
          if (active) useChatStore.getState().expireTyping(chatId, until)
          typingTimers.delete(chatId)
        },
        Math.max(0, until - Date.now()),
      )
      typingTimers.set(chatId, timer)
    }

    const scheduleActiveTyping = () => {
      for (const [chatId, until] of Object.entries(useChatStore.getState().typingByChat)) {
        scheduleTypingExpiration(chatId, until)
      }
    }

    const synchronize = async () => {
      if (!active) return
      if (synchronizing) {
        syncRequested = true
        return
      }
      synchronizing = true
      try {
        do {
          syncRequested = false
          await synchronizeChatState(useChatStore, {
            activeChatId: activeChatFromLocation(locationRef.current),
            fetchUpdates: fetchSynchronization,
            refreshSession: fetchSession,
            loadActiveChat: fetchMessages,
          })
        } while (syncRequested && active)
        scheduleActiveTyping()
      } catch {
        if (active) useChatStore.getState().setConnection('offline')
      } finally {
        synchronizing = false
      }
    }

    const transport = createClientWebSocketTransport({
      onUpdate: (frame) => {
        if (frame.seq > useChatStore.getState().lastSeq + 1) {
          void synchronize()
          return
        }
        const applied = useChatStore.getState().applyUpdate(frame.seq, frame.update)
        if (applied && frame.update.type === 'bot.typing') {
          const until = useChatStore.getState().typingByChat[frame.update.chatId]
          if (until) scheduleTypingExpiration(frame.update.chatId, until)
        }
      },
      onReady: () => void synchronize(),
      onConnection: (status) => {
        if (active) useChatStore.getState().setConnection(status)
      },
    })
    transportRef.current = transport
    transport.setFocus(activeChatFromLocation(locationRef.current) ?? null)
    transport.start()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void synchronize()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      active = false
      for (const timer of typingTimers.values()) clearTimeout(timer)
      typingTimers.clear()
      document.removeEventListener('visibilitychange', handleVisibility)
      transport.stop()
      transportRef.current = null
    }
  }, [userId])

  useEffect(() => {
    transportRef.current?.setFocus(activeChatId ?? null)
  }, [activeChatId])
}

export const AppProviders = ({ children }: { children: ReactNode }) => {
  useSessionBootstrap()
  useClientSynchronization()
  return (
    <>
      {children}
      <AppToaster />
    </>
  )
}
