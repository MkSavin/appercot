import { and, eq } from 'drizzle-orm'
import { requireUser } from '../auth/context'
import { bots } from '../db/schema'
import { createBotWebSocketUrl } from '../domain/bot-connection'
import { toBotDto } from '../domain/bots'
import { getCatalogBot } from '../domain/catalog'
import { listUserChats } from '../domain/chats'
import { getMessageContext, searchMessages } from '../domain/message-search'
import { listMessages } from '../domain/messages'
import { latestUserSequence, syncUserUpdates } from '../domain/sync'
import { builder } from './builder'
import { toGraphQLError } from './errors'
import {
  MessageContextType,
  MessageSearchPageType,
  MessageType,
  SyncPayloadType,
} from './types/messaging'
import { BotCommandType, BotType, SessionType } from './types/session'

const RegistrationPolicy = builder.objectRef<{ registration: boolean; invitations: boolean }>(
  'RegistrationPolicy',
)
RegistrationPolicy.implement({
  fields: (f) => ({
    registration: f.exposeBoolean('registration'),
    invitations: f.exposeBoolean('invitations'),
  }),
})

const CatalogBotDetailsType =
  builder.objectRef<ReturnType<typeof getCatalogBot>>('CatalogBotDetails')
CatalogBotDetailsType.implement({
  fields: (f) => ({
    bot: f.field({ type: BotType, resolve: (details) => details.bot }),
    commands: f.field({
      type: [BotCommandType],
      resolve: (details) => details.commands,
    }),
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
          botWebSocketUrl: createBotWebSocketUrl(context.env.PUBLIC_URL),
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
    searchMessages: field.field({
      type: MessageSearchPageType,
      args: {
        chatId: field.arg.id({ required: true }),
        query: field.arg.string({ required: true }),
        beforeSeq: field.arg.int(),
        limit: field.arg.int({ defaultValue: 30 }),
      },
      resolve: (_parent, args, context) => {
        const user = requireUser(context)
        try {
          return searchMessages(
            context.db,
            user.id,
            String(args.chatId),
            args.query,
            args.beforeSeq,
            args.limit ?? 30,
          )
        } catch (error) {
          throw toGraphQLError(error)
        }
      },
    }),
    messageContext: field.field({
      type: MessageContextType,
      args: {
        chatId: field.arg.id({ required: true }),
        seq: field.arg.int({ required: true }),
        before: field.arg.int({ defaultValue: 25 }),
        after: field.arg.int({ defaultValue: 25 }),
      },
      resolve: (_parent, args, context) => {
        const user = requireUser(context)
        try {
          return getMessageContext(
            context.db,
            user.id,
            String(args.chatId),
            args.seq,
            args.before ?? 25,
            args.after ?? 25,
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
          .where(and(eq(bots.access, 'public'), eq(bots.listed, true)))
          .all()
          .filter(
            (bot) =>
              !query ||
              bot.name.toLowerCase().includes(query) ||
              bot.username.toLowerCase().includes(query) ||
              bot.description.toLowerCase().includes(query) ||
              bot.tags.some((tag) => tag.toLowerCase().includes(query)),
          )
          .map((bot) => toBotDto(bot, context.hub))
      },
    }),
    browseBot: field.field({
      type: CatalogBotDetailsType,
      args: { botId: field.arg.id({ required: true }) },
      resolve: (_parent, args, context) => {
        const user = requireUser(context)
        try {
          return getCatalogBot(context.db, context.hub, user.id, String(args.botId))
        } catch (error) {
          throw toGraphQLError(error)
        }
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
