import { lazy, type ReactNode, Suspense } from 'react'
import { Redirect, Route, Switch, useLocation, useSearch } from 'wouter'
import { useChatStore } from '@/entities/chat'
import { LoginPage } from '@/pages/login'
import { NotFoundPage } from '@/pages/not-found'
import { RegisterPage } from '@/pages/register'
import { authHref, readAuthReturn } from '@/shared/lib/auth-return'
import { PagePlaceholder } from '@/shared/ui/page-placeholder'
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

const workspacePlaceholder = <PagePlaceholder />
const routePlaceholder = (path: string) => {
  if (path.startsWith('/settings'))
    return <PagePlaceholder variant="settings-page" detail={path !== '/settings'} />
  if (path.startsWith('/browse')) return <PagePlaceholder variant="catalog" />
  return workspacePlaceholder
}
const authenticationPlaceholder = (
  <main className="grid min-h-dvh place-items-center p-6">
    <PagePlaceholder variant="auth" />
  </main>
)

const Protected = ({ children }: { children: ReactNode }) => {
  const authentication = useChatStore((state) => state.authentication)
  const [path] = useLocation()
  const search = useSearch()
  if (authentication === 'loading') return workspacePlaceholder
  if (authentication === 'anonymous') {
    return <Redirect to={authHref('/login', search ? `${path}?${search}` : path)} replace />
  }
  return (
    <Workspace path={path}>
      <Suspense fallback={routePlaceholder(path)}>{children}</Suspense>
    </Workspace>
  )
}

const PublicOnly = ({ children }: { children: ReactNode }) => {
  const authentication = useChatStore((state) => state.authentication)
  const search = useSearch()
  if (authentication === 'loading') return authenticationPlaceholder
  if (authentication === 'authenticated') return <Redirect to={readAuthReturn(search)} replace />
  return children
}

export const AppRouter = () => (
  <Suspense fallback={workspacePlaceholder}>
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
            <Route path="/browse/:botId?" component={BrowsePage} />
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
