import { createYoga } from 'graphql-yoga'
import type { AppDatabase } from '../db/client'
import type { CallbackRegistry } from '../domain/callbacks'
import type { AppEnv } from '../env'
import type { Hub } from '../ws/hub'
import { builder } from './builder'
import { createGraphQLContext } from './context'
import './queries'
import './mutations'
import './admin'

export const schema = builder.toSchema()

export const createGraphQLHandler = (
  db: AppDatabase,
  env: AppEnv,
  hub: Hub,
  callbacks: CallbackRegistry,
) => {
  return async (request: Request) => {
    const responseCookies: string[] = []
    const yoga = createYoga({
      schema,
      graphiql: env.NODE_ENV !== 'production',
      context: () => createGraphQLContext(request, db, env, hub, callbacks, responseCookies),
    })
    const response = await yoga.fetch(request)
    for (const cookie of responseCookies) response.headers.append('set-cookie', cookie)
    return response
  }
}
