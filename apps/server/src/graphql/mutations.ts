import { requireUser } from '../auth/context'
import type { UserDto } from '../auth/session'
import {
  createLogoutCookie,
  createSessionCookie,
  loginUser,
  logoutUser,
  registerUser,
} from '../auth/session'
import { builder } from './builder'
import type { GraphQLContext } from './context'
import { toGraphQLError } from './errors'
import { type SessionDto, SessionType } from './types/session'

const createSessionPayload = (user: UserDto, context: GraphQLContext): SessionDto => ({
  user,
  chats: [],
  vapidPublicKey: context.env.VAPID_PUBLIC_KEY ?? null,
})

builder.mutationType({
  fields: (field) => ({
    login: field.field({
      type: SessionType,
      args: {
        username: field.arg.string({ required: true }),
        password: field.arg.string({ required: true }),
      },
      resolve: async (_parent, args, context) => {
        try {
          const session = await loginUser(context.db, args)
          context.setCookie(createSessionCookie(session.token, context.env))
          return createSessionPayload(session.user, context)
        } catch (error) {
          throw toGraphQLError(error)
        }
      },
    }),
    register: field.field({
      type: SessionType,
      args: {
        username: field.arg.string({ required: true }),
        password: field.arg.string({ required: true }),
        displayName: field.arg.string({ required: true }),
        invite: field.arg.string({ required: true }),
      },
      resolve: async (_parent, args, context) => {
        try {
          const session = await registerUser(context.db, context.env, args)
          context.setCookie(createSessionCookie(session.token, context.env))
          return createSessionPayload(session.user, context)
        } catch (error) {
          throw toGraphQLError(error)
        }
      },
    }),
    logout: field.boolean({
      resolve: (_parent, _args, context) => {
        requireUser(context)
        if (context.auth) logoutUser(context.db, context.auth.token)
        context.setCookie(createLogoutCookie(context.env))
        return true
      },
    }),
  }),
})
