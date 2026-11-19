import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/ui/skeleton'

const messageRows = [62, 78, 54, 70, 66]

export const PagePlaceholder = ({
  variant = 'workspace',
}: {
  variant?:
    | 'workspace'
    | 'catalog'
    | 'cards'
    | 'settings'
    | 'chat'
    | 'messages'
    | 'profile'
    | 'list'
    | 'auth'
}) => {
  const { t } = useTranslation()
  const content = (() => {
    if (variant === 'auth')
      return (
        <div className="mx-auto grid w-full max-w-md gap-5 rounded-3xl border p-8">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-4 h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )
    if (variant === 'messages')
      return (
        <div className="mx-auto grid w-full max-w-3xl gap-5 p-6">
          {messageRows.map((width, index) => (
            <Skeleton
              key={width}
              className={`h-16 rounded-2xl ${index % 2 ? 'ml-auto' : ''}`}
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
      )
    if (variant === 'chat')
      return (
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-16 items-center gap-3 border-b px-5">
            <Skeleton className="size-11 rounded-full" />
            <div className="grid gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <PagePlaceholder variant="messages" />
          </div>
          <div className="m-4 flex gap-3">
            <Skeleton className="h-12 flex-1 rounded-2xl" />
            <Skeleton className="size-12 rounded-2xl" />
          </div>
        </div>
      )
    if (variant === 'list')
      return (
        <div className="grid gap-3">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="settings-card flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      )
    if (variant === 'cards')
      return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex min-h-32 gap-3 rounded-xl border p-4">
              <Skeleton className="size-11 rounded-full" />
              <div className="grid flex-1 content-start gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      )
    if (variant === 'settings')
      return (
        <div className="grid gap-6">
          {[0, 1, 2].map((row) => (
            <div key={row} className="grid gap-3">
              <Skeleton className="h-5 w-40" />
              <div className="settings-card grid gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )
    if (variant === 'profile')
      return (
        <div className="grid gap-6">
          <div className="settings-card grid justify-items-center gap-4 py-8">
            <Skeleton className="size-24 rounded-full" />
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="aspect-video rounded-xl" />
            <Skeleton className="aspect-video rounded-xl" />
          </div>
        </div>
      )
    return (
      <div className="grid h-full min-h-0 md:grid-cols-[var(--context-width)_minmax(0,1fr)]">
        <div className="hidden gap-4 border-r bg-sidebar p-5 md:grid md:content-start">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-10 w-full" />
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-full" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="min-w-0">
          <div className="flex h-16 items-center border-b px-6">
            <Skeleton className="h-6 w-44" />
          </div>
          <div className="p-6">
            {variant === 'catalog' ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((row) => (
                  <div key={row} className="flex min-h-32 gap-3 rounded-xl border p-4">
                    <Skeleton className="size-11 rounded-full" />
                    <div className="grid flex-1 content-start gap-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <PagePlaceholder variant="chat" />
            )}
          </div>
        </div>
      </div>
    )
  })()
  return (
    <div className="h-full min-h-0" aria-busy="true">
      <span className="sr-only">{t('common:loading')}</span>
      <div aria-hidden="true" className="h-full min-h-0">
        {content}
      </div>
    </div>
  )
}
