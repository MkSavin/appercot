import { requireAdmin } from '../auth/context'
import {
  createAdminBot,
  createAdminInvite,
  listAdminBots,
  listAdminInvites,
  listAdminUsers,
  resetAdminBotToken,
  setAdminBotListed,
  setAdminBotOwner,
} from '../domain/admin'
import { builder } from './builder'
import { toGraphQLError } from './errors'
import { BotTokenType, InviteType } from './types/admin'
import { BotType, UserType } from './types/session'

const execute = <Result>(operation: () => Result) => {
  try {
    return operation()
  } catch (error) {
    throw toGraphQLError(error)
  }
}

builder.queryFields((field) => ({
  adminUsers: field.field({
    type: [UserType],
    args: { query: field.arg.string() },
    resolve: (_parent, args, context) => {
      requireAdmin(context)
      return listAdminUsers(context.db, args.query)
    },
  }),
  adminInvites: field.field({
    type: [InviteType],
    resolve: (_parent, _args, context) => {
      requireAdmin(context)
      return listAdminInvites(context.db, context.env.PUBLIC_URL)
    },
  }),
  adminBots: field.field({
    type: [BotType],
    resolve: (_parent, _args, context) => {
      requireAdmin(context)
      return listAdminBots(context.db, context.hub)
    },
  }),
}))

builder.mutationFields((field) => ({
  createInvite: field.field({
    type: InviteType,
    args: {
      maxUses: field.arg.int(),
      expiresInDays: field.arg.int(),
    },
    resolve: (_parent, args, context) =>
      execute(() => {
        const admin = requireAdmin(context)
        return createAdminInvite(context.db, context.env, admin.id, args)
      }),
  }),
  createBot: field.field({
    type: BotTokenType,
    args: {
      username: field.arg.string({ required: true }),
      name: field.arg.string({ required: true }),
      description: field.arg.string({ required: true }),
    },
    resolve: (_parent, args, context) =>
      execute(() => {
        requireAdmin(context)
        return createAdminBot(context.db, context.hub, args)
      }),
  }),
  resetBotToken: field.field({
    type: BotTokenType,
    args: { botId: field.arg.id({ required: true }) },
    resolve: (_parent, args, context) =>
      execute(() => {
        requireAdmin(context)
        return resetAdminBotToken(context.db, context.hub, String(args.botId))
      }),
  }),
  setBotOwner: field.boolean({
    args: {
      botId: field.arg.id({ required: true }),
      username: field.arg.string(),
    },
    resolve: (_parent, args, context) =>
      execute(() => {
        requireAdmin(context)
        return setAdminBotOwner(context.db, String(args.botId), args.username)
      }),
  }),
  setBotListed: field.boolean({
    args: {
      botId: field.arg.id({ required: true }),
      listed: field.arg.boolean({ required: true }),
    },
    resolve: (_parent, args, context) =>
      execute(() => {
        requireAdmin(context)
        return setAdminBotListed(context.db, String(args.botId), args.listed)
      }),
  }),
}))
