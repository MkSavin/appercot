import { requireSession, requireUser } from '../auth/context'
import type { UserDto } from '../auth/session'
import {
  createLogoutCookie,
  createSessionCookie,
  loginUser,
  logoutUser,
  registerUser,
} from '../auth/session'
import { addBot, listUserChats, markChatRead, setChatBlocked } from '../domain/chats'
import { sendUserMessage } from '../domain/messages'
import { latestUserSequence } from '../domain/sync'
import { builder } from './builder'
import type { GraphQLContext } from './context'
import { toGraphQLError } from './errors'
import { ButtonResultType, MessageType, SendMessageInput } from './types/messaging'
import { ConnectionType, type SessionDto, SessionType } from './types/session'

const createSessionPayload = (user: UserDto, context: GraphQLContext): SessionDto => ({
  user,
  chats: listUserChats(context.db, context.hub, user.id),
  vapidPublicKey: context.env.VAPID_PUBLIC_KEY ?? null,
  checkpoint: latestUserSequence(context.db, user.id),
})

const execute = async <Result>(operation: () => Result | Promise<Result>) => {
  try {
    return await operation()
  } catch (error) {
    throw toGraphQLError(error)
  }
}

builder.mutationType({
  fields: (field) => ({
    login: field.field({
      type: SessionType,
      args: {
        username: field.arg.string({ required: true }),
        password: field.arg.string({ required: true }),
        otp: field.arg.string(),
      },
      resolve: async (_parent, args, context) =>
        execute(async () => {
          const session = await loginUser(
            context.db,
            args,
            context.env.DATA_DIR,
            context.request.headers.get('user-agent'),
          )
          context.setCookie(createSessionCookie(session.token, context.env))
          return createSessionPayload(session.user, context)
        }),
    }),
    register: field.field({
      type: SessionType,
      args: {
        username: field.arg.string({ required: true }),
        password: field.arg.string({ required: true }),
        displayName: field.arg.string({ required: true }),
        invite: field.arg.string({ required: true }),
      },
      resolve: async (_parent, args, context) =>
        execute(async () => {
          const session = await registerUser(
            context.db,
            context.env,
            args,
            context.request.headers.get('user-agent'),
          )
          context.setCookie(createSessionCookie(session.token, context.env))
          return createSessionPayload(session.user, context)
        }),
    }),
    logout: field.boolean({
      args: { pushEndpoint: field.arg.string() },
      resolve: (_parent, args, context) => {
        const user = requireUser(context)
        if (args.pushEndpoint) context.push.unsubscribe(user.id, args.pushEndpoint)
        if (context.auth) {
          logoutUser(context.db, context.auth.token)
          context.hub.disconnectSessions(user.id, [context.auth.sessionId])
        }
        context.setCookie(createLogoutCookie(context.env))
        return true
      },
    }),
    addBot: field.field({
      type: ConnectionType,
      args: { username: field.arg.string({ required: true }), invite: field.arg.string() },
      resolve: (_parent, args, context) =>
        execute(() => {
          const user = requireUser(context)
          return addBot(context.db, context.hub, user.id, args.username, args.invite)
        }),
    }),
    sendMessage: field.field({
      type: MessageType,
      args: { input: field.arg({ type: SendMessageInput, required: true }) },
      resolve: (_parent, args, context) =>
        execute(() => {
          const user = requireUser(context)
          return sendUserMessage(context.db, context.hub, user.id, {
            chatId: String(args.input.chatId),
            clientId: args.input.clientId,
            content: args.input.content,
          })
        }),
    }),
    pressButton: field.field({
      type: ButtonResultType,
      args: {
        chatId: field.arg.id({ required: true }),
        messageId: field.arg.id({ required: true }),
        data: field.arg.string({ required: true }),
      },
      resolve: (_parent, args, context) =>
        execute(() => {
          const user = requireUser(context)
          return context.callbacks.press(
            context.db,
            context.hub,
            user.id,
            String(args.chatId),
            String(args.messageId),
            args.data,
          )
        }),
    }),
    markRead: field.boolean({
      args: {
        chatId: field.arg.id({ required: true }),
        seq: field.arg.int({ required: true }),
      },
      resolve: (_parent, args, context) =>
        execute(() => {
          const user = requireUser(context)
          return markChatRead(context.db, context.hub, user.id, String(args.chatId), args.seq)
        }),
    }),
    blockBot: field.boolean({
      args: {
        chatId: field.arg.id({ required: true }),
        blocked: field.arg.boolean({ required: true }),
      },
      resolve: (_parent, args, context) =>
        execute(() => {
          const user = requireUser(context)
          return setChatBlocked(context.db, context.hub, user.id, String(args.chatId), args.blocked)
        }),
    }),
    subscribePush: field.boolean({
      args: { subscription: field.arg({ type: 'JSON', required: true }) },
      resolve: (_parent, args, context) =>
        execute(() => {
          return context.push.subscribe(requireSession(context), args.subscription)
        }),
    }),
    unsubscribePush: field.boolean({
      args: { endpoint: field.arg.string({ required: true }) },
      resolve: (_parent, args, context) =>
        execute(() => {
          const user = requireUser(context)
          return context.push.unsubscribe(user.id, args.endpoint)
        }),
    }),
  }),
})
