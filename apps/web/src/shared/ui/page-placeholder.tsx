import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/ui/skeleton'

const messageRows = [62, 78, 54, 70, 66]

export const PagePlaceholder = ({
  variant = 'workspace',
  detail = false,
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
    | 'sessions'
    | 'search-results'
    | 'bot-settings'
    | 'bots'
    | 'users'
    | 'invites'
    | 'settings-page'
    | 'auth'
  detail?: boolean
}) => {
  const { t } = useTranslation()
  const content = (() => {
    if (variant === 'auth')
      return (
        <div className="mx-auto grid w-full max-w-[420px] gap-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="h-7 w-28" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
          <div className="grid gap-5 rounded-3xl border p-6 sm:p-9">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-4 h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
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
          <div className="flex h-16 items-center gap-3 border-b pl-2 md:pl-6">
            <Skeleton className="size-9 md:hidden" />
            <Skeleton className="size-10 rounded-full" />
            <div className="grid gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="ml-auto size-14 self-stretch" />
          </div>
          <div className="min-h-0 flex-1">
            <PagePlaceholder variant="messages" />
          </div>
          <div className="px-3 pt-2 pb-3 md:px-6 md:pb-5">
            <div className="mx-auto grid max-w-3xl gap-2 rounded-3xl border p-3">
              <Skeleton className="h-9 w-full" />
              <div className="flex items-center gap-2">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="ml-auto size-8 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      )
    if (variant === 'sessions')
      return (
        <div className="grid gap-4">
          <Skeleton className="ml-auto h-9 w-32" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-3 border-b pb-3 last:border-0">
              <Skeleton className="size-5" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-4 w-40 max-w-2/3" />
                <Skeleton className="h-3 w-52 max-w-full" />
              </div>
              {row > 0 ? <Skeleton className="h-9 w-32" /> : null}
            </div>
          ))}
        </div>
      )
    if (variant === 'search-results')
      return (
        <div className="grid gap-1">
          <Skeleton className="mb-2 h-3 w-24" />
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="grid min-h-16 gap-2 rounded-lg px-3 py-2">
              <div className="flex justify-between gap-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      )
    if (variant === 'users')
      return (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 min-w-40 flex-1" />
            <Skeleton className="h-9 w-36" />
          </div>
          <div className="overflow-hidden rounded-xl border">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex items-center gap-3 border-b p-4 last:border-0">
                <div className="grid flex-1 gap-2">
                  <Skeleton className="h-4 w-40 max-w-2/3" />
                  <Skeleton className="h-3 w-28 max-w-1/2" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="size-4" />
              </div>
            ))}
          </div>
        </div>
      )
    if (variant === 'invites')
      return (
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-64 max-w-2/3" />
            <Skeleton className="h-9 w-40" />
          </div>
          <div className="overflow-hidden rounded-xl border">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="grid gap-3 border-b p-4 last:border-0">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-6 w-36" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    if (variant === 'bots')
      return (
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-64 max-w-2/3" />
            <Skeleton className="h-11 w-36" />
          </div>
          <div className="settings-card grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-4 w-full" />
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Skeleton className="size-5 rounded-full" />
                <Skeleton className="h-4 w-56 max-w-2/3" />
              </div>
            ))}
          </div>
          <PagePlaceholder variant="list" />
        </div>
      )
    if (variant === 'bot-settings')
      return (
        <div className="grid gap-8">
          <div className="settings-card flex items-center gap-3">
            <Skeleton className="size-16 rounded-full" />
            <div className="grid flex-1 gap-2">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <PagePlaceholder variant="settings" />
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
    if (variant === 'settings-page')
      return (
        <div className="grid h-full min-h-0 md:grid-cols-[var(--context-width)_minmax(0,1fr)]">
          <div
            className={`${detail ? 'hidden md:grid' : 'grid'} content-start gap-2 border-r bg-sidebar p-5`}
          >
            <Skeleton className="mt-2 mb-5 h-7 w-32" />
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="flex h-12 items-center gap-3 px-3">
                <Skeleton className="size-5" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
          <div className={detail ? 'min-w-0' : 'hidden min-w-0 md:block'}>
            <div className="flex h-16 items-center border-b px-6">
              <Skeleton className="h-6 w-44" />
            </div>
            <div className="mx-auto max-w-4xl p-4 md:p-7">
              <PagePlaceholder variant="settings" />
            </div>
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
