import { eq } from 'drizzle-orm'
import { requireUser } from '../auth/context'
import { bots } from '../db/schema'
import { toBotDto } from '../domain/bots'
import { listUserChats } from '../domain/chats'
import { listMessages } from '../domain/messages'
import { syncUserUpdates } from '../domain/sync'
import { builder } from './builder'
import { MessageType, SyncPayloadType } from './types/messaging'
import { BotType, SessionType } from './types/session'

builder.queryType({
  fields: (field) => ({
    session: field.field({
      type: SessionType,
      resolve: (_parent, _args, context) => {
        const user = requireUser(context)
        return {
          user,
          chats: listUserChats(context.db, context.hub, user.id),
          vapidPublicKey: context.env.VAPID_PUBLIC_KEY ?? null,
        }
      },
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
        return listMessages(context.db, user.id, String(args.chatId), args.before, args.limit ?? 50)
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
          .where(eq(bots.listed, true))
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
