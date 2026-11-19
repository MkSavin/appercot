import { type Message, MessageSchema } from '@appercot/protocol'
import type { MessagesQuery } from './generated/graphql'

export const parseGraphqlMessage = (
  message: Omit<MessagesQuery['messages'][number], 'deleted'> & { deleted?: boolean },
): Message => {
  const { replyTo, editedAt, deleted, ...requiredFields } = message
  return MessageSchema.parse({
    ...requiredFields,
    ...(replyTo === null ? {} : { replyTo }),
    ...(editedAt === null ? {} : { editedAt }),
    ...(deleted ? { deleted } : {}),
  })
}
