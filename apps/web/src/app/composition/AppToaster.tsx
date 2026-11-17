import { X } from 'lucide-react'
import { toast, useSonner } from '@/shared/lib/toast'

export const AppToaster = () => {
  const { toasts } = useSonner()
  const visibleToasts = toasts.filter((item) => item.toasterId === 'appercot')

  return (
    <section
      className="pointer-events-none fixed inset-x-3 top-3 z-[100] mx-auto flex max-w-sm flex-col gap-2"
      aria-label="Уведомления"
      aria-live="polite"
    >
      {visibleToasts.map((item) => (
        <div
          key={item.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border bg-popover p-4 text-sm text-popover-foreground shadow-lg"
          data-type={item.type}
        >
          <div className="min-w-0 flex-1">
            {item.title ? (
              <p className="font-medium">
                {typeof item.title === 'function' ? item.title() : item.title}
              </p>
            ) : null}
            {item.description ? (
              <p className="mt-1 text-muted-foreground">
                {typeof item.description === 'function' ? item.description() : item.description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            aria-label="Закрыть уведомление"
            onClick={() => toast.dismiss(item.id)}
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      ))}
    </section>
  )
}
