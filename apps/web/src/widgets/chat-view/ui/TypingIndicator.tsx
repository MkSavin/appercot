import { useTranslation } from 'react-i18next'

export const TypingIndicator = ({ until }: { until?: number }) => {
  const { t } = useTranslation()
  if (!until) return null
  return (
    <div
      className="flex items-center gap-2 px-4 pb-2 text-xs text-muted-foreground md:px-8"
      role="status"
    >
      <span className="flex gap-1" aria-hidden="true">
        <span className="size-1.5 animate-pulse rounded-full bg-current" />
        <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
      </span>
      {t('chat:typing')}
    </div>
  )
}
