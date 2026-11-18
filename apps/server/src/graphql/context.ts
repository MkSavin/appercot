import { type AuthSession, getRequestSession } from '../auth/session'
import type { AppDatabase } from '../db/client'
import type { CallbackRegistry } from '../domain/callbacks'
import type { PushService } from '../domain/push'
import type { AppEnv } from '../env'
import type { Hub } from '../ws/hub'

export interface GraphQLContext {
  db: AppDatabase
  env: AppEnv
  hub: Hub
  callbacks: CallbackRegistry
  push: PushService
  auth: AuthSession | null
  setCookie: (cookie: string) => void
}

export const createGraphQLContext = (
  request: Request,
  db: AppDatabase,
  env: AppEnv,
  hub: Hub,
  callbacks: CallbackRegistry,
  push: PushService,
  responseCookies: string[],
): GraphQLContext => ({
  db,
  env,
  hub,
  callbacks,
  push,
  auth: getRequestSession(db, request),
  setCookie: (cookie) => responseCookies.push(cookie),
})
