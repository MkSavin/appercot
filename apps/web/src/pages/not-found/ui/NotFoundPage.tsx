import { useTranslation } from 'react-i18next'

export const NotFoundPage = () => {
  const { t } = useTranslation()
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6 text-foreground">
      <h1 className="text-2xl font-semibold">{t('notFound:title')}</h1>
    </main>
  )
}
