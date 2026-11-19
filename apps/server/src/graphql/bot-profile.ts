import { requireAdmin, requireUser } from '../auth/context'
import { getChatProfile, updateBotProfile } from '../domain/bot-profile'
import { deleteChat, setChatNotifications } from '../domain/chats'
import { builder } from './builder'
import { toGraphQLError } from './errors'
import { BotType, ChatNotificationsType } from './types/session'

const execute = <T>(operation: () => T) => {
  try {
    return operation()
  } catch (error) {
    throw toGraphQLError(error)
  }
}

const ChatProfileType = builder.objectRef<ReturnType<typeof getChatProfile>>('ChatProfile')
ChatProfileType.implement({
  fields: (f) => ({
    bot: f.field({ type: BotType, resolve: (profile) => profile.bot }),
    blocked: f.exposeBoolean('blocked'),
    notifications: f.expose('notifications', { type: ChatNotificationsType }),
    media: f.field({ type: 'JSON', resolve: (profile) => profile.media }),
    olderMediaBefore: f.exposeInt('olderMediaBefore', { nullable: true }),
  }),
})
builder.queryFields((f) => ({
  chatProfile: f.field({
    type: ChatProfileType,
    args: { chatId: f.arg.id({ required: true }), beforeMediaSeq: f.arg.int() },
    resolve: (_, args, ctx) =>
      execute(() =>
        getChatProfile(
          ctx.db,
          ctx.hub,
          requireUser(ctx).id,
          String(args.chatId),
          args.beforeMediaSeq,
        ),
      ),
  }),
}))
builder.mutationFields((f) => ({
  updateBotProfile: f.field({
    type: BotType,
    args: {
      botId: f.arg.id({ required: true }),
      description: f.arg.string({ required: true }),
      welcome: f.arg.string({ required: true }),
      avatar: f.arg.string(),
      tags: f.arg.stringList(),
    },
    resolve: (_, { botId, ...args }, ctx) =>
      execute(() =>
        updateBotProfile(ctx.db, ctx.hub, requireAdmin(ctx), String(botId), {
          ...args,
          tags: args.tags ?? undefined,
        }),
      ),
  }),
  deleteChat: f.boolean({
    args: { chatId: f.arg.id({ required: true }) },
    resolve: (_, args, ctx) =>
      execute(() => deleteChat(ctx.db, ctx.hub, requireUser(ctx).id, String(args.chatId))),
  }),
  setChatNotifications: f.boolean({
    args: {
      chatId: f.arg.id({ required: true }),
      mode: f.arg({ type: ChatNotificationsType, required: true }),
    },
    resolve: (_, args, ctx) =>
      execute(() =>
        setChatNotifications(ctx.db, ctx.hub, requireUser(ctx).id, String(args.chatId), args.mode),
      ),
  }),
}))
