import { GraphQLError } from 'graphql'
import type { AuthSession } from './session'

interface AuthContext {
  auth: AuthSession | null
}

export const requireUser = (context: AuthContext) => {
  if (!context.auth) {
    throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHORIZED' } })
  }
  return context.auth.user
}

export const requireAdmin = (context: AuthContext) => {
  const user = requireUser(context)
  if (!user.isAdmin) {
    throw new GraphQLError('Administrator role required', { extensions: { code: 'FORBIDDEN' } })
  }
  return user
}
