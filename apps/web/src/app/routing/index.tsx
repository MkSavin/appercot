import { Route, Switch } from 'wouter'
import { ChatPage } from '@/pages/chat'
import { NotFoundPage } from '@/pages/not-found'

export const AppRouter = () => (
  <Switch>
    <Route path="/" component={ChatPage} />
    <Route component={NotFoundPage} />
  </Switch>
)
