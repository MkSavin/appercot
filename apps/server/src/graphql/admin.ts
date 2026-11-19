import { eq } from 'drizzle-orm'
import { requireAdmin, requireOwner } from '../auth/context'
import { bots } from '../db/schema'
import {
  changeBotMemberRoles,
  createAdminBot,
  createAdminInvite,
  getAdminBot,
  getBotMemberships,
  inviteBotMember,
  issueBotInvite,
  listAdminBots,
  listAdminInvites,
  listAdminUsers,
  listBotInvites,
  requireManagedBot,
  resetAdminBotToken,
  revokeAdminInvite,
  revokeBotInvite,
  setAdminBotAccess,
  setAdminBotListed,
  setAdminBotOwner,
  setBotMemberRevoked,
  setPlatformRole,
  updateAdminInvite,
  updateBotInvite,
} from '../domain/admin'
import { toBotDto } from '../domain/bots'
import { DomainError } from '../domain/errors'
import { builder } from './builder'
import { toGraphQLError } from './errors'
import { BotTokenType, InviteRoleType, InviteType } from './types/admin'
import { BotAccessType, BotType, PlatformRoleType, UserType } from './types/session'

const BotInviteType = builder.objectRef<ReturnType<typeof issueBotInvite>>('BotInvite')
builder.objectType(BotInviteType, {
  fields: (field) => ({
    id: field.exposeID('id'),
    url: field.exposeString('url', { nullable: true }),
    expiresAt: field.exposeFloat('expiresAt', { nullable: true }),
    revokedAt: field.exposeFloat('revokedAt', { nullable: true }),
    uses: field.exposeInt('uses'),
    maxUses: field.exposeInt('maxUses', { nullable: true }),
    roles: field.exposeStringList('roles'),
  }),
})

type Memberships = ReturnType<typeof getBotMemberships>
const BotMemberType = builder.objectRef<Memberships['members'][number]>('BotMember')
builder.objectType(BotMemberType, {
  fields: (field) => ({
    chatId: field.exposeID('chatId'),
    username: field.exposeString('username'),
    displayName: field.exposeString('displayName'),
    revoked: field.exposeBoolean('revoked'),
    roles: field.exposeStringList('roles'),
  }),
})
const BotMembershipsType = builder.objectRef<Memberships>('BotMemberships')
const BotRoleType = builder.objectRef<Memberships['roleDefinitions'][number]>('BotRole')
BotRoleType.implement({
  fields: (f) => ({
    code: f.exposeString('code'),
    name: f.exposeString('name'),
    virtual: f.exposeBoolean('virtual'),
  }),
})
builder.objectType(BotMembershipsType, {
  fields: (field) => ({
    roles: field.exposeStringList('roles'),
    roleDefinitions: field.field({ type: [BotRoleType], resolve: (data) => data.roleDefinitions }),
    members: field.field({ type: [BotMemberType], resolve: (data) => data.members }),
  }),
})

const execute = <Result>(operation: () => Result) => {
  try {
    return operation()
  } catch (error) {
    throw toGraphQLError(error)
  }
}

builder.queryFields((field) => ({
  botInvitations: field.field({
    type: [BotInviteType],
    args: { botId: field.arg.id({ required: true }) },
    resolve: (_, args, ctx) =>
      execute(() =>
        listBotInvites(ctx.db, requireAdmin(ctx), String(args.botId), ctx.env.PUBLIC_URL),
      ),
  }),
  adminBot: field.field({
    type: BotType,
    args: { botId: field.arg.id({ required: true }) },
    resolve: (_parent, args, context) =>
      execute(() =>
        getAdminBot(context.db, context.hub, requireAdmin(context), String(args.botId)),
      ),
  }),
  botMemberships: field.field({
    type: BotMembershipsType,
    args: { botId: field.arg.id({ required: true }) },
    resolve: (_parent, args, context) =>
      execute(() => getBotMemberships(context.db, requireAdmin(context), String(args.botId))),
  }),
  adminUsers: field.field({
    type: [UserType],
    args: { query: field.arg.string() },
    resolve: (_parent, args, context) => {
      requireOwner(context)
      return listAdminUsers(context.db, args.query)
    },
  }),
  adminInvites: field.field({
    type: [InviteType],
    resolve: (_parent, _args, context) => {
      requireOwner(context)
      return listAdminInvites(context.db, context.env.PUBLIC_URL)
    },
  }),
  adminBots: field.field({
    type: [BotType],
    resolve: (_parent, _args, context) => {
      return listAdminBots(context.db, context.hub, requireAdmin(context))
    },
  }),
}))

builder.mutationFields((field) => ({
  setBotGuestAccess: field.field({
    type: BotType,
    args: {
      botId: field.arg.id({ required: true }),
      enabled: field.arg.boolean({ required: true }),
    },
    resolve: (_, args, ctx) =>
      execute(() => {
        const botId = String(args.botId)
        const bot = requireManagedBot(ctx.db, requireAdmin(ctx), botId)
        if (args.enabled && bot.access !== 'public')
          throw new DomainError('BAD_REQUEST', 'Гостевой режим доступен для открытых ботов')
        ctx.db.update(bots).set({ guestAccess: args.enabled }).where(eq(bots.id, botId)).run()
        return toBotDto({ ...bot, guestAccess: args.enabled }, ctx.hub)
      }),
  }),
  editPlatformInvite: field.field({
    type: InviteType,
    args: {
      code: field.arg.string({ required: true }),
      role: field.arg({ type: InviteRoleType }),
      maxUses: field.arg.int(),
      expiresInDays: field.arg.int(),
    },
    resolve: (_, { code, ...args }, ctx) =>
      execute(() => {
        requireOwner(ctx)
        if (!ctx.env.ALLOW_USER_INVITES)
          throw new DomainError('FORBIDDEN', 'Приглашения новых пользователей отключены')
        return updateAdminInvite(ctx.db, ctx.env.PUBLIC_URL, code, args)
      }),
  }),
  revokePlatformInvite: field.boolean({
    args: { code: field.arg.string({ required: true }) },
    resolve: (_, args, ctx) =>
      execute(() => {
        requireOwner(ctx)
        return revokeAdminInvite(ctx.db, args.code)
      }),
  }),
  editBotInvite: field.field({
    type: BotInviteType,
    args: {
      botId: field.arg.id({ required: true }),
      id: field.arg.id({ required: true }),
      roles: field.arg.stringList({ required: true }),
      maxUses: field.arg.int(),
      expiresInDays: field.arg.int(),
    },
    resolve: (_, { botId, id, ...args }, ctx) =>
      execute(() =>
        updateBotInvite(
          ctx.db,
          requireAdmin(ctx),
          String(botId),
          String(id),
          ctx.env.PUBLIC_URL,
          args,
        ),
      ),
  }),
  setBotMemberRoles: field.boolean({
    args: {
      botId: field.arg.id({ required: true }),
      chatId: field.arg.id({ required: true }),
      roles: field.arg.stringList({ required: true }),
    },
    resolve: (_parent, args, context) =>
      execute(() =>
        changeBotMemberRoles(
          context.db,
          context.hub,
          requireAdmin(context),
          String(args.botId),
          String(args.chatId),
          args.roles,
        ),
      ),
  }),
  setBotMemberRevoked: field.boolean({
    args: {
      botId: field.arg.id({ required: true }),
      chatId: field.arg.id({ required: true }),
      revoked: field.arg.boolean({ required: true }),
    },
    resolve: (_parent, args, context) =>
      execute(() =>
        setBotMemberRevoked(
          context.db,
          context.hub,
          requireAdmin(context),
          String(args.botId),
          String(args.chatId),
          args.revoked,
        ),
      ),
  }),
  createInvite: field.field({
    type: InviteType,
    args: {
      maxUses: field.arg.int(),
      expiresInDays: field.arg.int(),
      role: field.arg({ type: InviteRoleType }),
    },
    resolve: (_parent, args, context) =>
      execute(() => {
        const admin = requireOwner(context)
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
        return createAdminBot(context.db, context.hub, requireAdmin(context), args)
      }),
  }),
  resetBotToken: field.field({
    type: BotTokenType,
    args: { botId: field.arg.id({ required: true }) },
    resolve: (_parent, args, context) =>
      execute(() => {
        return resetAdminBotToken(
          context.db,
          context.hub,
          requireAdmin(context),
          String(args.botId),
        )
      }),
  }),
  setBotOwner: field.boolean({
    args: {
      botId: field.arg.id({ required: true }),
      username: field.arg.string(),
    },
    resolve: (_parent, args, context) =>
      execute(() => {
        requireOwner(context)
        return setAdminBotOwner(context.db, context.hub, String(args.botId), args.username)
      }),
  }),
  setBotListed: field.boolean({
    args: {
      botId: field.arg.id({ required: true }),
      listed: field.arg.boolean({ required: true }),
    },
    resolve: (_parent, args, context) =>
      execute(() => {
        return setAdminBotListed(context.db, requireAdmin(context), String(args.botId), args.listed)
      }),
  }),
  setUserRole: field.field({
    type: UserType,
    args: {
      userId: field.arg.id({ required: true }),
      role: field.arg({ type: PlatformRoleType, required: true }),
    },
    resolve: (_parent, args, context) =>
      execute(() => {
        requireOwner(context)
        return setPlatformRole(context.db, context.hub, String(args.userId), args.role)
      }),
  }),
  setBotAccess: field.field({
    type: BotType,
    args: {
      botId: field.arg.id({ required: true }),
      access: field.arg({ type: BotAccessType, required: true }),
    },
    resolve: (_parent, args, context) =>
      execute(() =>
        setAdminBotAccess(
          context.db,
          context.hub,
          requireAdmin(context),
          String(args.botId),
          args.access,
        ),
      ),
  }),
  issueBotInvite: field.field({
    type: BotInviteType,
    args: {
      botId: field.arg.id({ required: true }),
      roles: field.arg.stringList(),
      maxUses: field.arg.int(),
      expiresInDays: field.arg.int(),
    },
    resolve: (_parent, args, context) =>
      execute(() =>
        issueBotInvite(
          context.db,
          context.env.PUBLIC_URL,
          requireAdmin(context),
          String(args.botId),
          args.roles ?? [],
          args.maxUses,
          args.expiresInDays,
        ),
      ),
  }),
  inviteBotMember: field.boolean({
    args: {
      botId: field.arg.id({ required: true }),
      username: field.arg.string({ required: true }),
      roles: field.arg.stringList({ required: true }),
    },
    resolve: (_parent, args, context) =>
      execute(() =>
        inviteBotMember(
          context.db,
          context.hub,
          requireAdmin(context),
          String(args.botId),
          args.username,
          args.roles,
        ),
      ),
  }),
  revokeBotInvite: field.boolean({
    args: { botId: field.arg.id({ required: true }), id: field.arg.id() },
    resolve: (_parent, args, context) =>
      execute(() =>
        revokeBotInvite(
          context.db,
          requireAdmin(context),
          String(args.botId),
          args.id == null ? args.id : String(args.id),
        ),
      ),
  }),
}))
