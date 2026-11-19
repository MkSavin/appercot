import { useTranslation } from 'react-i18next'

export const UnreadBadge = ({ count }: { count: number }) => {
  const { t } = useTranslation()
  if (!count) return null
  return (
    <span
      className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground"
      role="img"
      aria-label={t('chat:unread', { count })}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
