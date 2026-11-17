import { ArrowLeft, Bot } from 'lucide-react'
import { Link } from 'wouter'
import { strings } from '@/shared/config'
import { Button } from '@/shared/ui/button'

export const BrowsePage = () => (
  <main className="min-h-dvh bg-background p-4 md:p-8">
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
        <Link href="/">
          <ArrowLeft aria-hidden="true" />
          {strings.chat.back}
        </Link>
      </Button>
      <div className="rounded-2xl border bg-card p-8 text-center">
        <Bot aria-hidden="true" className="mx-auto mb-4 size-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold">{strings.chat.browse}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{strings.chat.noChats}</p>
      </div>
    </div>
  </main>
)
