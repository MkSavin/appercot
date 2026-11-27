import { Check, Copy, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { testId } from '@/shared/lib/test-ids'
import { Button } from './button'

type CopyStatus = 'idle' | 'copied' | 'failed'

export const CopyIconButton = ({
  text,
  label,
  testID,
  className,
}: {
  text: string
  label: string
  testID?: string
  className?: string
}) => {
  const { t } = useTranslation('common')
  const [status, setStatus] = useState<CopyStatus>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(
    () => () => {
      if (timer.current !== undefined) clearTimeout(timer.current)
    },
    [],
  )

  const copy = async () => {
    if (timer.current !== undefined) clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(text)
      setStatus('copied')
    } catch {
      setStatus('failed')
    }
    timer.current = setTimeout(() => setStatus('idle'), 2500)
  }

  const Icon = status === 'copied' ? Check : status === 'failed' ? X : Copy
  return (
    <>
      <Button
        {...(testID ? testId(testID) : {})}
        type="button"
        data-copy-status={status}
        variant="ghost"
        size="icon"
        className={cn('size-11 shrink-0 md:size-9', className)}
        aria-label={label}
        title={label}
        onClick={() => void copy()}
      >
        <Icon
          aria-hidden="true"
          className={cn(status === 'copied' && 'text-emerald-600 dark:text-emerald-400')}
        />
      </Button>
      <span className="sr-only" role="status">
        {status === 'copied' ? t('copied') : status === 'failed' ? t('copyFailed') : ''}
      </span>
    </>
  )
}
