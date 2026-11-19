import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'

export const ExternalLinkDialog = ({
  url,
  onSettle,
}: {
  url: string | null
  onSettle: (confirmed: boolean) => void
}) => {
  const { t } = useTranslation()
  return (
    <AlertDialog open={url !== null} onOpenChange={(open) => !open && onSettle(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('chat:externalLinkTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('chat:externalLinkDescription')}
            <span className="mt-2 block break-all font-medium text-foreground">{url}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onSettle(false)}>{t('chat:cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={() => onSettle(true)}>{t('chat:openLink')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
