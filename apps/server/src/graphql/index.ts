import { createYoga } from 'graphql-yoga'
import type { AppDatabase } from '../db/client'
import type { AppEnv } from '../env'
import { builder } from './builder'
import { createGraphQLContext } from './context'
import './queries'
import './mutations'

export const schema = builder.toSchema()

export const createGraphQLHandler = (db: AppDatabase, env: AppEnv) => {
  return async (request: Request) => {
    const responseCookies: string[] = []
    const yoga = createYoga({
      schema,
      graphiql: env.NODE_ENV !== 'production',
      context: () => createGraphQLContext(request, db, env, responseCookies),
    })
    const response = await yoga.fetch(request)
    for (const cookie of responseCookies) response.headers.append('set-cookie', cookie)
    return response
  }
}
