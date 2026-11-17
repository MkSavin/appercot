import { Check, CheckCheck, CircleAlert, LoaderCircle } from 'lucide-react'
import { strings } from '@/shared/config'
import type { MessageDeliveryStatus } from '@/shared/model'

const labels: Record<MessageDeliveryStatus, string> = {
  pending: strings.message.pending,
  accepted: strings.message.accepted,
  processed: strings.message.processed,
  failed: strings.message.failed,
}

export const StatusTicks = ({ status }: { status: MessageDeliveryStatus }) => {
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
