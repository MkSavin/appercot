import type { Message } from '@appercot/protocol'
import type { getMessageContext, searchMessages } from '../../domain/message-search'
import { builder } from '../builder'

export const MessageType = builder.objectRef<Message>('Message')
export const UpdateType = builder.objectRef<{ seq: number; payload: unknown }>('Update')
export const SyncPayloadType = builder.objectRef<{
  updates: Array<{ seq: number; payload: unknown }>
  resetRequired: boolean
  checkpoint: number
  hasMore: boolean
}>('SyncPayload')
export const ButtonResultType = builder.objectRef<{ toast: string | null }>('ButtonResult')
export const MessageSearchHitType =
  builder.objectRef<ReturnType<typeof searchMessages>['items'][number]>('MessageSearchHit')
export const MessageSearchPageType =
  builder.objectRef<ReturnType<typeof searchMessages>>('MessageSearchPage')
export const MessageContextType =
  builder.objectRef<ReturnType<typeof getMessageContext>>('MessageContext')

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
    deleted: field.boolean({ resolve: (message) => message.deleted ?? false }),
  }),
})

builder.objectType(MessageSearchHitType, {
  fields: (field) => ({
    message: field.field({ type: MessageType, resolve: (hit) => hit.message }),
    snippet: field.exposeString('snippet'),
  }),
})

builder.objectType(MessageSearchPageType, {
  fields: (field) => ({
    items: field.field({ type: [MessageSearchHitType], resolve: (page) => page.items }),
    hasMore: field.exposeBoolean('hasMore'),
  }),
})

builder.objectType(MessageContextType, {
  fields: (field) => ({
    messages: field.field({ type: [MessageType], resolve: (context) => context.messages }),
    targetSeq: field.exposeInt('targetSeq'),
    hasEarlier: field.exposeBoolean('hasEarlier'),
    hasLater: field.exposeBoolean('hasLater'),
    latestSeq: field.exposeInt('latestSeq'),
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
    checkpoint: field.exposeInt('checkpoint'),
    hasMore: field.exposeBoolean('hasMore'),
  }),
})

builder.objectType(ButtonResultType, {
  fields: (field) => ({
    toast: field.exposeString('toast', { nullable: true }),
  }),
})
