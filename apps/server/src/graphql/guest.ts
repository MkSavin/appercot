import { openGuestChat, sendGuestCommand, viewGuestChat } from '../domain/guest'
import { builder } from './builder'
import { toGraphQLError } from './errors'
import { MessageType } from './types/messaging'
import { BotCommandType, BotType } from './types/session'

const execute = <T>(operation: () => T) => {
  try {
    return operation()
  } catch (error) {
    throw toGraphQLError(error)
  }
}

const GuestChat = builder.objectRef<ReturnType<typeof viewGuestChat>>('GuestChat')
GuestChat.implement({
  fields: (f) => ({
    bot: f.field({ type: BotType, resolve: (value) => value.bot }),
    commands: f.field({ type: [BotCommandType], resolve: (value) => value.commands }),
    messages: f.field({ type: [MessageType], resolve: (value) => value.messages }),
    active: f.exposeBoolean('active'),
  }),
})
builder.queryFields((f) => ({
  guestChat: f.field({
    type: GuestChat,
    args: { username: f.arg.string({ required: true }) },
    resolve: (_, args, ctx) =>
      execute(() => viewGuestChat(ctx.db, ctx.hub, ctx.request, args.username)),
  }),
}))
builder.mutationFields((f) => ({
  openGuestChat: f.boolean({
    args: { username: f.arg.string({ required: true }) },
    resolve: (_, args, ctx) =>
      execute(() =>
        openGuestChat(
          ctx.db,
          ctx.hub,
          ctx.env,
          ctx.request,
          ctx.peer,
          args.username,
          ctx.setCookie,
        ),
      ),
  }),
  sendGuestCommand: f.boolean({
    args: {
      username: f.arg.string({ required: true }),
      command: f.arg.string({ required: true }),
      clientId: f.arg.string({ required: true }),
    },
    resolve: (_, args, ctx) =>
      execute(() =>
        sendGuestCommand(ctx.db, ctx.hub, ctx.request, args.username, args.command, args.clientId),
      ),
  }),
}))
