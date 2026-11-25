import { useCallback, useEffect, useState } from 'react'
import { fetchAdminBotDiagnostics } from '@/entities/bot'

export const useBotDiagnostics = (botId: string | undefined, enabled: boolean) => {
  const [diagnostics, setDiagnostics] =
    useState<Awaited<ReturnType<typeof fetchAdminBotDiagnostics>>>()
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    void attempt
    let active = true
    let timer: ReturnType<typeof setInterval> | undefined
    let pending = false
    setDiagnostics(undefined)
    setFailed(false)

    const stop = () => {
      if (timer !== undefined) clearInterval(timer)
      timer = undefined
    }
    const load = async () => {
      if (!botId || pending) return
      pending = true
      try {
        const result = await fetchAdminBotDiagnostics(botId)
        if (!active) return
        setDiagnostics(result)
        setFailed(false)
      } catch {
        if (active) setFailed(true)
      } finally {
        pending = false
      }
    }
    const start = () => {
      stop()
      if (
        !active ||
        !botId ||
        !enabled ||
        document.visibilityState !== 'visible' ||
        !navigator.onLine
      )
        return
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
  }, [botId, enabled, attempt])

  return { diagnostics, failed, retry }
}
