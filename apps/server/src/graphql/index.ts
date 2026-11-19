import { createYoga } from 'graphql-yoga'
import type { AppDatabase } from '../db/client'
import type { CallbackRegistry } from '../domain/callbacks'
import type { PushService } from '../domain/push'
import type { AppEnv } from '../env'
import type { Hub } from '../ws/hub'
import { builder } from './builder'
import { createGraphQLContext } from './context'
import './queries'
import './mutations'
import './admin'
import './accounts'
import './bot-profile'
import './guest'

export const schema = builder.toSchema()

export const createGraphQLHandler = (
  db: AppDatabase,
  env: AppEnv,
  hub: Hub,
  callbacks: CallbackRegistry,
  push: PushService,
) => {
  return async (request: Request, peer = 'local') => {
    const responseCookies: string[] = []
    const yoga = createYoga({
      schema,
      graphiql: env.NODE_ENV !== 'production',
      context: () =>
        createGraphQLContext(request, db, env, hub, callbacks, push, responseCookies, peer),
    })
    const response = await yoga.fetch(request)
    for (const cookie of responseCookies) response.headers.append('set-cookie', cookie)
    return response
  }
}
