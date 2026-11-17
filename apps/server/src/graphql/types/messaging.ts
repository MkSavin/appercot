import type { Message } from '@appercot/protocol'
import { builder } from '../builder'

export const MessageType = builder.objectRef<Message>('Message')
export const UpdateType = builder.objectRef<{ seq: number; payload: unknown }>('Update')
export const SyncPayloadType = builder.objectRef<{
  updates: Array<{ seq: number; payload: unknown }>
  resetRequired: boolean
}>('SyncPayload')
export const ButtonResultType = builder.objectRef<{ toast: string | null }>('ButtonResult')

export const SendMessageInput = builder.inputType('SendMessageInput', {
  fields: (field) => ({
    chatId: field.id({ required: true }),
    clientId: field.string({ required: true }),
    content: field.field({ type: 'JSON', required: true }),
  }),
})

builder.objectType(MessageType, {
  fields: (field) => ({
    id: field.exposeID('id'),
    chatId: field.exposeID('chatId'),
    seq: field.exposeInt('seq'),
    sender: field.exposeString('sender'),
    content: field.field({ type: 'JSON', resolve: (message) => message.content }),
    status: field.exposeString('status'),
    replyTo: field.exposeID('replyTo', { nullable: true }),
    createdAt: field.exposeFloat('createdAt'),
    editedAt: field.exposeFloat('editedAt', { nullable: true }),
  }),
})

builder.objectType(UpdateType, {
  fields: (field) => ({
    seq: field.exposeInt('seq'),
    payload: field.field({ type: 'JSON', resolve: (update) => update.payload }),
  }),
})

builder.objectType(SyncPayloadType, {
  fields: (field) => ({
    updates: field.field({ type: [UpdateType], resolve: (payload) => payload.updates }),
    resetRequired: field.exposeBoolean('resetRequired'),
  }),
})

builder.objectType(ButtonResultType, {
  fields: (field) => ({
    toast: field.exposeString('toast', { nullable: true }),
  }),
})
