import { requireOwner, requireUser } from '../auth/context'
import { createLogoutCookie, toUserDto } from '../auth/session'
import { hashToken } from '../auth/tokens'
import { checkSecondFactor, clearTotp, enableTotp, startTotp } from '../auth/totp'
import {
  changeAccountPassword,
  deleteAccount,
  getAccount,
  listSessions,
  resetAccountPassword,
  revokeSession,
  updateAccount,
  verifyAccountPassword,
} from '../domain/accounts'
import { builder } from './builder'
import { toGraphQLError } from './errors'
import { UserType } from './types/session'

const execute = async <T>(operation: () => T | Promise<T>) => {
  try {
    return await operation()
  } catch (error) {
    throw toGraphQLError(error)
  }
}

const AuthSessionType = builder.objectRef<ReturnType<typeof listSessions>[number]>('AuthSession')
AuthSessionType.implement({
  fields: (f) => ({
    id: f.exposeID('id'),
    createdAt: f.exposeFloat('createdAt'),
    expiresAt: f.exposeFloat('expiresAt'),
    userAgent: f.exposeString('userAgent', { nullable: true }),
    current: f.exposeBoolean('current'),
  }),
})

builder.queryFields((f) => ({
  mySessions: f.field({
    type: [AuthSessionType],
    resolve: (_, __, { db, auth }) =>
      listSessions(db, requireUser({ auth }).id, auth?.sessionId ?? ''),
  }),
  adminUser: f.field({
    type: UserType,
    args: { userId: f.arg.id({ required: true }) },
    resolve: (_, args, ctx) =>
      execute(() => {
        requireOwner(ctx)
        return toUserDto(getAccount(ctx.db, String(args.userId)))
      }),
  }),
}))

builder.mutationFields((f) => {
  const profileArgs = {
    username: f.arg.string({ required: true }),
    displayName: f.arg.string({ required: true }),
    bio: f.arg.string({ required: true }),
  }
  const securityArgs = { password: f.arg.string({ required: true }), otp: f.arg.string() }
  return {
    updateProfile: f.field({
      type: UserType,
      args: profileArgs,
      resolve: (_, args, ctx) => execute(() => updateAccount(ctx.db, requireUser(ctx).id, args)),
    }),
    updateAdminUser: f.field({
      type: UserType,
      args: { ...profileArgs, userId: f.arg.id({ required: true }) },
      resolve: (_, args, ctx) =>
        execute(() => {
          requireOwner(ctx)
          return updateAccount(ctx.db, String(args.userId), args)
        }),
    }),
    changePassword: f.boolean({
      args: { ...securityArgs, newPassword: f.arg.string({ required: true }) },
      resolve: (_, args, ctx) =>
        execute(() =>
          changeAccountPassword(
            ctx.db,
            ctx.hub,
            ctx.env.DATA_DIR,
            requireUser(ctx).id,
            ctx.auth?.sessionId ?? '',
            args,
          ),
        ),
    }),
    resetUserPassword: f.boolean({
      args: { userId: f.arg.id({ required: true }), newPassword: f.arg.string({ required: true }) },
      resolve: (_, args, ctx) =>
        execute(() => {
          requireOwner(ctx)
          return resetAccountPassword(ctx.db, ctx.hub, String(args.userId), args.newPassword)
        }),
    }),
    beginTotp: f.string({
      args: { password: f.arg.string({ required: true }) },
      resolve: (_, args, ctx) =>
        execute(async () =>
          startTotp(
            ctx.db,
            ctx.env.DATA_DIR,
            await verifyAccountPassword(ctx.db, requireUser(ctx).id, args.password),
          ),
        ),
    }),
    enableTotp: f.string({
      args: { password: f.arg.string({ required: true }), code: f.arg.string({ required: true }) },
      resolve: (_, args, ctx) =>
        execute(async () =>
          enableTotp(
            ctx.db,
            ctx.env.DATA_DIR,
            await verifyAccountPassword(ctx.db, requireUser(ctx).id, args.password),
            args.code.trim(),
          ),
        ),
    }),
    disableTotp: f.boolean({
      args: securityArgs,
      resolve: (_, args, ctx) =>
        execute(async () => {
          const user = await verifyAccountPassword(ctx.db, requireUser(ctx).id, args.password)
          return ctx.db.transaction((tx) => {
            checkSecondFactor(tx, ctx.env.DATA_DIR, user, args.otp)
            clearTotp(tx, user.id)
            return true
          })
        }),
    }),
    revokeMySession: f.boolean({
      args: { id: f.arg.id({ required: true }) },
      resolve: (_, args, ctx) =>
        execute(() => {
          const user = requireUser(ctx)
          const current = ctx.auth && hashToken(ctx.auth.sessionId) === args.id
          const removed = revokeSession(ctx.db, ctx.hub, user.id, String(args.id))
          if (removed && current) ctx.setCookie(createLogoutCookie(ctx.env))
          return removed
        }),
    }),
    deleteMyAccount: f.boolean({
      args: securityArgs,
      resolve: (_, args, ctx) =>
        execute(async () => {
          await deleteAccount(
            ctx.db,
            ctx.hub,
            ctx.env.DATA_DIR,
            requireUser(ctx).id,
            args.password,
            args.otp,
          )
          ctx.setCookie(createLogoutCookie(ctx.env))
          return true
        }),
    }),
  }
})
