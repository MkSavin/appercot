import { eq } from 'drizzle-orm'
import { requireUser } from '../auth/context'
import { bots } from '../db/schema'
import { toBotDto } from '../domain/bots'
import { listUserChats } from '../domain/chats'
import { listMessages } from '../domain/messages'
import { latestUserSequence, syncUserUpdates } from '../domain/sync'
import { builder } from './builder'
import { toGraphQLError } from './errors'
import { MessageType, SyncPayloadType } from './types/messaging'
import { BotType, SessionType } from './types/session'

const RegistrationPolicy = builder.objectRef<{ registration: boolean; invitations: boolean }>(
  'RegistrationPolicy',
)
RegistrationPolicy.implement({
  fields: (f) => ({
    registration: f.exposeBoolean('registration'),
    invitations: f.exposeBoolean('invitations'),
  }),
})

builder.queryType({
  fields: (field) => ({
    registrationPolicy: field.field({
      type: RegistrationPolicy,
      resolve: (_, __, { env }) => ({
        registration: env.ALLOW_REGISTRATION,
        invitations: env.ALLOW_USER_INVITES,
      }),
    }),
    session: field.field({
      type: SessionType,
      resolve: (_parent, _args, context) => {
        const user = requireUser(context)
        return {
          user,
          chats: listUserChats(context.db, context.hub, user.id),
          vapidPublicKey: context.env.VAPID_PUBLIC_KEY ?? null,
          checkpoint: latestUserSequence(context.db, user.id),
        }
      },
    }),
    pushStatus: field.boolean({
      args: { endpoint: field.arg.string({ required: true }) },
      resolve: (_parent, args, context) =>
        context.push.isSubscribed(requireUser(context).id, args.endpoint),
    }),
    messages: field.field({
      type: [MessageType],
      args: {
        chatId: field.arg.id({ required: true }),
        before: field.arg.int(),
        limit: field.arg.int({ defaultValue: 50 }),
      },
      resolve: (_parent, args, context) => {
        const user = requireUser(context)
        try {
          return listMessages(
            context.db,
            user.id,
            String(args.chatId),
            args.before,
            args.limit ?? 50,
          )
        } catch (error) {
          throw toGraphQLError(error)
        }
      },
    }),
    browseBots: field.field({
      type: [BotType],
      args: { query: field.arg.string() },
      resolve: (_parent, args, context) => {
        requireUser(context)
        const query = args.query?.toLowerCase()
        return context.db
          .select()
          .from(bots)
          .where(eq(bots.access, 'public'))
          .all()
          .filter(
            (bot) =>
              !query ||
              bot.name.toLowerCase().includes(query) ||
              bot.username.toLowerCase().includes(query),
          )
          .map((bot) => toBotDto(bot, context.hub))
      },
    }),
    sync: field.field({
      type: SyncPayloadType,
      args: { since: field.arg.int({ required: true }) },
      resolve: (_parent, args, context) => {
        const user = requireUser(context)
        return syncUserUpdates(context.db, user.id, args.since)
      },
    }),
  }),
})
