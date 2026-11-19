import { Check, Copy, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'

interface BotTokenDialogProps {
  open: boolean
  token: string
  botName: string
  onClose: () => void
}

export const BotTokenDialog = ({ open, token, botName, onClose }: BotTokenDialogProps) => {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  if (!open) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="bot-token-title"
      className="fixed inset-x-4 top-8 z-50 mx-auto grid max-w-xl gap-4 rounded-2xl border bg-background p-6 shadow-xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="bot-token-title" className="text-lg font-semibold">
            {t('admin:tokenTitle')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{botName}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('admin:close')}
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
        {t('admin:tokenWarning')}
      </p>
      <label htmlFor="issued-bot-token" className="text-sm font-medium">
        {t('admin:token')}
      </label>
      <Textarea
        id="issued-bot-token"
        name="token"
        value={token}
        readOnly
        onFocus={(event) => event.currentTarget.select()}
        className="min-h-24 font-mono text-xs"
      />
      <Button type="button" onClick={copy}>
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? t('message:copied') : t('admin:copyToken')}
      </Button>
      <span className="sr-only" role="status">
        {copied ? t('message:copied') : ''}
      </span>
    </section>
  )
}
