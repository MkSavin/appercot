import type { UserDto } from '../../auth/session'
import { builder } from '../builder'

export interface BotDto {
  id: string
  username: string
  name: string
  description: string
  online: boolean
  listed: boolean
}

export interface ConnectionDto {
  id: string
  bot: BotDto
  roles: string[]
  blocked: boolean
  unread: number
  lastMessageAt: number | null
  createdAt: number
}

export interface SessionDto {
  user: UserDto
  chats: ConnectionDto[]
  vapidPublicKey: string | null
}

export const UserType = builder.objectRef<UserDto>('User')
export const BotType = builder.objectRef<BotDto>('Bot')
export const ConnectionType = builder.objectRef<ConnectionDto>('Connection')
export const SessionType = builder.objectRef<SessionDto>('Session')

builder.objectType(UserType, {
  fields: (field) => ({
    id: field.exposeID('id'),
    username: field.exposeString('username'),
    displayName: field.exposeString('displayName'),
    isAdmin: field.exposeBoolean('isAdmin'),
  }),
})

builder.objectType(BotType, {
  fields: (field) => ({
    id: field.exposeID('id'),
    username: field.exposeString('username'),
    name: field.exposeString('name'),
    description: field.exposeString('description'),
    online: field.exposeBoolean('online'),
    listed: field.exposeBoolean('listed'),
  }),
})

builder.objectType(ConnectionType, {
  fields: (field) => ({
    id: field.exposeID('id'),
    bot: field.field({ type: BotType, resolve: (chat) => chat.bot }),
    roles: field.exposeStringList('roles'),
    blocked: field.exposeBoolean('blocked'),
    unread: field.exposeInt('unread'),
    lastMessageAt: field.exposeInt('lastMessageAt', { nullable: true }),
  }),
})

builder.objectType(SessionType, {
  fields: (field) => ({
    user: field.field({ type: UserType, resolve: (session) => session.user }),
    chats: field.field({
      type: [ConnectionType],
      resolve: (session) => session.chats,
    }),
    vapidPublicKey: field.exposeString('vapidPublicKey', { nullable: true }),
  }),
})
