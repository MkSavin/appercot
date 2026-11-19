import { i18n } from '@/shared/config'

export const sessionDevice = (agent: string | null) => {
  if (!agent) return i18n.t('account:unknownDevice')
  const browser = /Edg\//i.test(agent)
    ? 'Edge'
    : /OPR\//i.test(agent)
      ? 'Opera'
      : /(?:Chrome|CriOS)\//i.test(agent)
        ? 'Chrome'
        : /(?:Firefox|FxiOS)\//i.test(agent)
          ? 'Firefox'
          : /Safari\//i.test(agent)
            ? 'Safari'
            : undefined
  const platform = /Android/i.test(agent)
    ? 'Android'
    : /iPhone|iPad/i.test(agent)
      ? 'iOS'
      : /Windows/i.test(agent)
        ? 'Windows'
        : /Macintosh/i.test(agent)
          ? 'macOS'
          : /Linux/i.test(agent)
            ? 'Linux'
            : undefined
  return [browser, platform].filter(Boolean).join(' · ') || i18n.t('account:unknownDevice')
}

export const sessionDeviceType = (agent: string | null): 'mobile' | 'desktop' | 'unknown' => {
  if (!agent) return 'unknown'
  if (/Android|iPhone|iPad/i.test(agent)) return 'mobile'
  if (/Windows|Macintosh|Linux/i.test(agent)) return 'desktop'
  return 'unknown'
}
