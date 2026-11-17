import { Check, Copy, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { strings } from '@/shared/config'
import { cn } from '@/shared/lib/cn'

interface CopyButtonProps {
  text: string
  targetId: string
  label?: string
}

type CopyStatus = 'idle' | 'copied' | 'failed'

export const CopyButton = ({
  text,
  targetId,
  label = strings.message.copyCode,
}: CopyButtonProps) => {
  const [status, setStatus] = useState<CopyStatus>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    [],
  )

  const copy = async () => {
    if (timer.current !== null) clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(text)
      setStatus('copied')
    } catch {
      setStatus('failed')
    }
    timer.current = setTimeout(() => setStatus('idle'), 2000)
  }

  const Icon = status === 'copied' ? Check : status === 'failed' ? X : Copy
  return (
    <span className="copy-control">
      <button
        type="button"
        className={cn(
          'inline-flex min-h-6 min-w-6 items-center justify-center rounded-md border border-white/10 bg-zinc-800/90 p-1 text-zinc-300 opacity-100 transition-opacity hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:opacity-0 md:group-hover/code:opacity-100 md:focus-visible:opacity-100 md:group-focus-within/code:opacity-100',
          status !== 'idle' && 'md:opacity-100',
        )}
        aria-label={label}
        onClick={copy}
        {...{ command: '--copy', commandfor: targetId }}
      >
        <Icon aria-hidden="true" className="size-3.5" />
      </button>
      <span className="sr-only" role="status">
        {status === 'copied'
          ? strings.message.copied
          : status === 'failed'
            ? strings.message.copyFailed
            : ''}
      </span>
    </span>
  )
}
