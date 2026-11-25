import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/button'

export const TokenCloseConfirmation = ({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: () => void
}) => {
  const { t } = useTranslation('onboarding')
  return (
    <div role="alert" className="grid gap-3 rounded-lg border border-amber-500/40 p-3">
      <p className="text-sm">{t('closeWarning')}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" className="min-h-11" onClick={onCancel}>
          {t('keepEditing')}
        </Button>
        <Button type="button" variant="destructive" className="min-h-11" onClick={onConfirm}>
          {t('discardToken')}
        </Button>
      </div>
    </div>
  )
}
