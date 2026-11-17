import { LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Redirect, Route, Switch } from 'wouter'
import { useChatStore } from '@/entities/chat'
import { AdminPage } from '@/pages/admin'
import { BrowsePage } from '@/pages/browse'
import { ChatPage } from '@/pages/chat'
import { LoginPage } from '@/pages/login'
import { NotFoundPage } from '@/pages/not-found'
import { RegisterPage } from '@/pages/register'

const LoadingScreen = () => (
  <main className="grid min-h-dvh place-items-center" aria-label="Загрузка">
    <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-muted-foreground" />
  </main>
)

const Protected = ({ children }: { children: ReactNode }) => {
  const authentication = useChatStore((state) => state.authentication)
  if (authentication === 'loading') return <LoadingScreen />
  if (authentication === 'anonymous') return <Redirect to="/login" />
  return children
}

export const canAccessAdmin = (user: { isAdmin: boolean } | undefined) => user?.isAdmin === true

export const AdminOnly = ({ children }: { children: ReactNode }) => {
  const user = useChatStore((state) => state.user)
  if (!canAccessAdmin(user ?? undefined)) return <Redirect to="/" />
  return children
}

const PublicOnly = ({ children }: { children: ReactNode }) => {
  const authentication = useChatStore((state) => state.authentication)
  if (authentication === 'loading') return <LoadingScreen />
  if (authentication === 'authenticated') return <Redirect to="/" />
  return children
}

export const AppRouter = () => (
  <Switch>
    <Route path="/login">
      <PublicOnly>
        <LoginPage />
      </PublicOnly>
    </Route>
    <Route path="/register">
      <PublicOnly>
        <RegisterPage />
      </PublicOnly>
    </Route>
    <Route path="/browse">
      <Protected>
        <BrowsePage />
      </Protected>
    </Route>
    <Route path="/admin">
      <Protected>
        <AdminOnly>
          <AdminPage />
        </AdminOnly>
      </Protected>
    </Route>
    <Route path="/c/:chatId">
      <Protected>
        <ChatPage />
      </Protected>
    </Route>
    <Route path="/">
      <Protected>
        <ChatPage />
      </Protected>
    </Route>
    <Route component={NotFoundPage} />
  </Switch>
)
