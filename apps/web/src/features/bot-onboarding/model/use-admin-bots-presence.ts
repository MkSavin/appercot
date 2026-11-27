import { useEffect, useState } from 'react'
import { fetchAdminBots } from '@/entities/bot'

export const useAdminBotsPresence = (enabled: boolean) => {
  const [presence, setPresence] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let active = true
    let pending = false
    let timer: ReturnType<typeof setInterval> | undefined
    const stop = () => {
      if (timer !== undefined) clearInterval(timer)
      timer = undefined
    }
    const load = async () => {
      if (pending) return
      pending = true
      try {
        const bots = await fetchAdminBots()
        if (active) setPresence(Object.fromEntries(bots.map((bot) => [bot.id, bot.online])))
      } catch {
        // Keep the last server-backed presence until the next poll.
      } finally {
        pending = false
      }
    }
    const start = () => {
      stop()
      if (!active || !enabled || document.visibilityState !== 'visible' || !navigator.onLine) return
      void load()
      timer = setInterval(() => void load(), 2500)
    }
    const handleOffline = () => stop()
    start()
    document.addEventListener('visibilitychange', start)
    window.addEventListener('online', start)
    window.addEventListener('offline', handleOffline)
    return () => {
      active = false
      stop()
      document.removeEventListener('visibilitychange', start)
      window.removeEventListener('online', start)
      window.removeEventListener('offline', handleOffline)
    }
  }, [enabled])

  return presence
}
