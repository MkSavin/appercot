import type { Message } from '@appercot/protocol'
import { LoaderCircle, RefreshCw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Shortcut } from '@/shared/lib/shortcuts'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Button } from '@/shared/ui/button'
import { PagePlaceholder } from '@/shared/ui/page-placeholder'
import { SearchInput } from '@/shared/ui/search-input'
import { snippetSegments } from '../model/snippet-segments'
import { useMessageSearch } from '../model/use-message-search'

export const MessageSearchPanel = ({
  chatId,
  onClose,
  onSelect,
}: {
  chatId: string
  onClose: () => void
  onSelect: (message: Message) => void
}) => {
  const { t, i18n } = useTranslation()
  const search = useMessageSearch(chatId, true)
  return (
    <section
      className="flex max-h-[min(30rem,60dvh)] shrink-0 flex-col border-b bg-card pt-[env(safe-area-inset-top)]"
      aria-label={t('chat:messageSearch.title')}
    >
      <div className="flex h-16 shrink-0 items-center gap-2 border-b pl-2 md:pl-4">
        <div className="min-w-0 flex-1">
          <SearchInput
            {...testId(testIds.chat.search.input)}
            autoFocus
            shortcut={Shortcut.MessageSearch}
            value={search.query}
            maxLength={200}
            onChange={(event) => search.setQuery(event.currentTarget.value)}
            aria-label={t('chat:messageSearch.placeholder')}
            placeholder={t('chat:messageSearch.placeholder')}
          />
        </div>
        <Button
          {...testId(testIds.chat.search.close)}
          variant="ghost"
          size="icon"
          className="h-16 w-14 shrink-0 rounded-none"
          aria-label={t('chat:messageSearch.close')}
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      {search.refreshAvailable ? (
        <Button
          {...testId(testIds.chat.search.refresh)}
          variant="ghost"
          size="sm"
          className="mx-3 mt-2 w-fit"
          onClick={search.refresh}
        >
          <RefreshCw aria-hidden="true" />
          {t('chat:messageSearch.refresh')}
        </Button>
      ) : null}
      {search.status === 'initial' ? null : (
        <div
          {...testId(testIds.chat.search.results)}
          className="min-h-0 overflow-y-auto p-3 md:px-6"
        >
          {search.status === 'loading' ? <PagePlaceholder variant="search-results" /> : null}
          {search.status === 'failed' ? (
            <div className="grid justify-items-center gap-3 py-5 text-center">
              <p role="alert" className="text-sm text-destructive">
                {t('chat:messageSearch.failed')}
              </p>
              <Button
                {...testId(testIds.chat.search.retry)}
                variant="outline"
                onClick={search.retry}
              >
                {t('common:retry')}
              </Button>
            </div>
          ) : null}
          {search.status === 'ready' && !search.items.length ? (
            <p role="status" className="py-4 text-center text-sm text-muted-foreground">
              {t('chat:messageSearch.noResults')}
            </p>
          ) : null}
          {search.status === 'ready' && search.items.length ? (
            <>
              <p role="status" className="mb-2 text-xs text-muted-foreground">
                {t('chat:messageSearch.resultsCount', { count: search.items.length })}
              </p>
              <ul className="grid gap-1" aria-label={t('chat:messageSearch.results')}>
                {search.items.map(({ message, snippet }) => (
                  <li key={message.id}>
                    <button
                      {...testId(testIds.chat.search.result(message.id))}
                      type="button"
                      className="grid min-h-16 w-full gap-1 rounded-lg px-3 py-2 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                      onClick={() => onSelect(message)}
                    >
                      <span className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{t(`chat:messageSearch.sender.${message.sender}`)}</span>
                        <time dateTime={new Date(message.createdAt).toISOString()}>
                          {new Intl.DateTimeFormat(i18n.language, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }).format(message.createdAt)}
                        </time>
                      </span>
                      <span className="line-clamp-2 break-words text-sm leading-5">
                        {snippetSegments(snippet, search.query).map((segment) =>
                          segment.match ? (
                            <mark
                              key={`${segment.start}:${segment.text}`}
                              className="rounded-sm bg-primary/20"
                            >
                              {segment.text}
                            </mark>
                          ) : (
                            <span key={`${segment.start}:${segment.text}`}>{segment.text}</span>
                          ),
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {search.paginationFailed ? (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {t('chat:messageSearch.paginationFailed')}
                </p>
              ) : null}
              {search.hasMore ? (
                <Button
                  {...testId(testIds.chat.search.loadMore)}
                  variant="outline"
                  className="mt-3 w-full"
                  disabled={search.paginationLoading}
                  onClick={() => void search.loadMore()}
                >
                  {search.paginationLoading ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : null}
                  {search.paginationLoading
                    ? t('common:loading')
                    : t('chat:messageSearch.loadMore')}
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      )}
    </section>
  )
}
