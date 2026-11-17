import { type AuthSession, getRequestSession } from '../auth/session'
import type { AppDatabase } from '../db/client'
import type { AppEnv } from '../env'

export interface GraphQLContext {
  db: AppDatabase
  env: AppEnv
  auth: AuthSession | null
  setCookie: (cookie: string) => void
}

export const createGraphQLContext = (
  request: Request,
  db: AppDatabase,
  env: AppEnv,
  responseCookies: string[],
): GraphQLContext => ({
  db,
  env,
  auth: getRequestSession(db, request),
  setCookie: (cookie) => responseCookies.push(cookie),
})
