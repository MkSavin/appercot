import { GraphQLError } from 'graphql'
import type { AuthSession } from './session'

interface AuthContext {
  auth: AuthSession | null
}

export const requireSession = (context: AuthContext) => {
  if (!context.auth) {
    throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHORIZED' } })
  }
  return context.auth
}

export const requireUser = (context: AuthContext) => requireSession(context).user

export const requireAdmin = (context: AuthContext) => {
  const user = requireUser(context)
  if (user.role === 'user') {
    throw new GraphQLError('Administrator role required', { extensions: { code: 'FORBIDDEN' } })
  }
  return user
}

export const requireOwner = (context: AuthContext) => {
  const user = requireUser(context)
  if (user.role !== 'owner') {
    throw new GraphQLError('Platform owner role required', { extensions: { code: 'FORBIDDEN' } })
  }
  return user
}
