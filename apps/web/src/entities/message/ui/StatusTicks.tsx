import { Check, CheckCheck, CircleAlert, LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MessageDeliveryStatus } from '@/shared/model'

export const StatusTicks = ({ status }: { status: MessageDeliveryStatus }) => {
  const { t } = useTranslation()
  const labels: Record<MessageDeliveryStatus, string> = {
    pending: t('message:pending'),
    accepted: t('message:accepted'),
    processed: t('message:processed'),
    failed: t('message:failed'),
  }
  const Icon =
    status === 'pending'
      ? LoaderCircle
      : status === 'accepted'
        ? Check
        : status === 'processed'
          ? CheckCheck
          : CircleAlert
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] leading-none"
      title={labels[status]}
    >
      <Icon
        aria-hidden="true"
        className={status === 'pending' ? 'size-3.5 animate-spin' : 'size-3.5'}
      />
      <span className="sr-only">{labels[status]}</span>
      {status === 'failed' ? <span aria-hidden="true">{labels[status]}</span> : null}
    </span>
  )
}
