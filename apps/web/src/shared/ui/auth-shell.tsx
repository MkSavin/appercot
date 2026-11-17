import { Bot } from 'lucide-react'
import type { ReactNode } from 'react'
import { strings } from '@/shared/config'

interface AuthShellProps {
  title: string
  subtitle: string
  titleId: string
  children: ReactNode
}

export const AuthShell = ({ title, subtitle, titleId, children }: AuthShellProps) => (
  <main className="grid min-h-dvh place-items-center bg-secondary/45 px-4 py-10">
    <div className="w-full max-w-[420px]">
      <div className="mb-8 flex items-center justify-center gap-2.5">
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Bot aria-hidden="true" className="size-5" />
        </span>
        <span className="text-xl font-semibold tracking-tight">{strings.appName}</span>
      </div>
      <section className="rounded-2xl border bg-card p-6 shadow-xl shadow-zinc-950/[0.04] sm:p-8">
        <header className="mb-7">
          <h1 id={titleId} className="text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
        </header>
        {children}
      </section>
      <p className="mt-6 text-center text-xs text-muted-foreground">{strings.appTagline}</p>
    </div>
  </main>
)
