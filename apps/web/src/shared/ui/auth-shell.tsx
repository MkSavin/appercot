import { Bot } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { testIds } from '@/shared/lib/test-ids'
import { LanguageSelect } from './language-select'

interface AuthShellProps {
  title: string
  subtitle: string
  titleId: string
  children: ReactNode
}

export const AuthShell = ({ title, subtitle, titleId, children }: AuthShellProps) => {
  const { t } = useTranslation()
  return (
    <main className="workspace-surface grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-4 flex justify-end">
          <LanguageSelect testId={testIds.auth.language} className="w-36" />
        </div>
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Bot aria-hidden="true" className="size-5" />
          </span>
          <span className="text-xl font-semibold tracking-tight">{t('appName')}</span>
        </div>
        <section
          aria-labelledby={titleId}
          className="rounded-3xl border bg-card p-6 shadow-xl shadow-primary/[0.05] sm:p-9"
        >
          <header className="mb-7">
            <h1 id={titleId} className="text-3xl font-semibold tracking-tight">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
          </header>
          {children}
        </section>
      </div>
    </main>
  )
}
