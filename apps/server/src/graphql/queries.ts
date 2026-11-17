import { requireUser } from '../auth/context'
import { builder } from './builder'
import { SessionType } from './types/session'

builder.queryType({
  fields: (field) => ({
    session: field.field({
      type: SessionType,
      resolve: (_parent, _args, context) => ({
        user: requireUser(context),
        chats: [],
        vapidPublicKey: context.env.VAPID_PUBLIC_KEY ?? null,
      }),
    }),
  }),
})
