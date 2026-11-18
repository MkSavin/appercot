/// <reference path="../types/web-push.d.ts" />

import { type Message, PushPayloadSchema } from '@appercot/protocol'
import { and, eq } from 'drizzle-orm'
import { sendNotification, setVapidDetails } from 'web-push'
import { z } from 'zod'
import type { AppDatabase } from '../db/client'
import { bots, chats, pushSubs } from '../db/schema'
import type { AppEnv } from '../env'
import { DomainError } from './errors'

const PushSubscriptionSchema = z.strictObject({
  endpoint: z.url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol)),
  expirationTime: z.number().nullable().optional(),
  keys: z.strictObject({ p256dh: z.string().min(1), auth: z.string().min(1) }),
})

export class PushService {
  private readonly configured: boolean

  constructor(
    private readonly db: AppDatabase,
    env: AppEnv,
    private readonly send: typeof sendNotification = sendNotification,
  ) {
    this.configured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY)
    if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
      const subject = env.PUBLIC_URL.startsWith('https:')
        ? env.PUBLIC_URL
        : 'mailto:admin@localhost'
      setVapidDetails(subject, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)
    }
  }

  subscribe(userId: string, input: unknown) {
    if (!this.configured) throw new DomainError('BAD_REQUEST', 'Web Push is not configured')
    const subscription = PushSubscriptionSchema.parse(input)
    const createdAt = Date.now()
    this.db
      .insert(pushSubs)
      .values({
        id: Bun.randomUUIDv7(),
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        createdAt,
      })
      .onConflictDoUpdate({
        target: pushSubs.endpoint,
        set: {
          userId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          createdAt,
        },
      })
      .run()
    return true
  }

  unsubscribe(userId: string, endpoint: string) {
    this.db
      .delete(pushSubs)
      .where(and(eq(pushSubs.userId, userId), eq(pushSubs.endpoint, endpoint)))
      .run()
    return true
  }

  async sendMessage(userId: string, chatId: string, message: Message) {
    if (!this.configured) return
    const result = this.db
      .select({ bot: bots })
      .from(chats)
      .innerJoin(bots, eq(bots.id, chats.botId))
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
      .get()
    if (!result) return
    const subscriptions = this.db.select().from(pushSubs).where(eq(pushSubs.userId, userId)).all()
    const payload = JSON.stringify(
      PushPayloadSchema.parse({
        title: result.bot.name,
        body: message.content.text ?? (message.content.media?.length ? 'Медиа' : 'Новое сообщение'),
        tag: chatId,
        url: `/c/${chatId}`,
      }),
    )
    for (const subscription of subscriptions) {
      try {
        await this.send(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload,
        )
      } catch (error) {
        const statusCode =
          typeof error === 'object' && error !== null && 'statusCode' in error
            ? error.statusCode
            : undefined
        if (statusCode === 404 || statusCode === 410) {
          this.db.delete(pushSubs).where(eq(pushSubs.id, subscription.id)).run()
        }
      }
    }
  }
}
