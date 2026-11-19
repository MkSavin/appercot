import { LoaderCircle } from 'lucide-react'
import { lazy, type ReactNode, Suspense } from 'react'
import { Redirect, Route, Switch, useLocation, useSearch } from 'wouter'
import { useChatStore } from '@/entities/chat'
import { LoginPage } from '@/pages/login'
import { NotFoundPage } from '@/pages/not-found'
import { RegisterPage } from '@/pages/register'
import { authHref, readAuthReturn } from '@/shared/lib/auth-return'
import { Workspace } from './Workspace'

const SettingsPage = lazy(() =>
  import('@/pages/settings').then(({ SettingsPage }) => ({ default: SettingsPage })),
)
const BrowsePage = lazy(() =>
  import('@/pages/browse').then(({ BrowsePage }) => ({ default: BrowsePage })),
)
const ChatPage = lazy(() => import('@/pages/chat').then(({ ChatPage }) => ({ default: ChatPage })))
const GuestChatPage = lazy(() =>
  import('@/pages/guest').then(({ GuestChatPage }) => ({ default: GuestChatPage })),
)

const LoadingScreen = () => (
  <main className="grid min-h-dvh place-items-center" aria-label="Загрузка">
    <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-muted-foreground" />
  </main>
)

const Protected = ({ children }: { children: ReactNode }) => {
  const authentication = useChatStore((state) => state.authentication)
  const [path] = useLocation()
  const search = useSearch()
  if (authentication === 'loading') return <LoadingScreen />
  if (authentication === 'anonymous') {
    return <Redirect to={authHref('/login', search ? `${path}?${search}` : path)} replace />
  }
  return (
    <Workspace path={path}>
      <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
    </Workspace>
  )
}

const PublicOnly = ({ children }: { children: ReactNode }) => {
  const authentication = useChatStore((state) => state.authentication)
  const search = useSearch()
  if (authentication === 'loading') return <LoadingScreen />
  if (authentication === 'authenticated') return <Redirect to={readAuthReturn(search)} replace />
  return children
}

export const AppRouter = () => (
  <Suspense fallback={<LoadingScreen />}>
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
      <Route path="/guest/:username" component={GuestChatPage} />
      <Route path="/admin">
        <Redirect to="/settings/bots" replace />
      </Route>
      <Route>
        <Protected>
          <Switch>
            <Route path="/browse" component={BrowsePage} />
            <Route path="/settings/:section?/:botId?" component={SettingsPage} />
            <Route path="/c/:chatId/:panel?" component={ChatPage} />
            <Route path="/" component={ChatPage} />
            <Route component={NotFoundPage} />
          </Switch>
        </Protected>
      </Route>
    </Switch>
  </Suspense>
)
