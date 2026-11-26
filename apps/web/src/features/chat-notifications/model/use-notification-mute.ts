import { useEffect, useState } from 'react'

const maximumTimeout = 2_147_483_647

export const useNotificationMute = (mutedUntil: number | null | undefined) => {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (mutedUntil == null || mutedUntil <= Date.now()) return
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(maximumTimeout, Math.max(0, mutedUntil - Date.now())),
    )
    return () => clearTimeout(timer)
  }, [mutedUntil])
  return { active: mutedUntil != null && mutedUntil > now, now }
}
