import type { BotAccess, Message } from '@appercot/protocol'
import type { UserDto } from '../../auth/session'
import type { VisibleCommand } from '../../domain/commands'
import { builder } from '../builder'
import { MessageType } from './messaging'

export interface BotDto {
  id: string
  username: string
  name: string
  description: string
  online: boolean
  stopped: boolean
  listed: boolean
  guestAccess: boolean
  access: BotAccess
  memberCount?: number
  avatar: string | null
  welcome: string
  tags: string[]
}

export interface ConnectionDto {
  id: string
  bot: BotDto
  roles: string[]
  blocked: boolean
  unread: number
  lastMessageAt: number | null
  createdAt: number
  commands: VisibleCommand[]
  notifications: 'all' | 'silent' | 'off'
  notificationsMutedUntil: number | null
  preview: Message | null
}

export interface SessionDto {
  user: UserDto
  chats: ConnectionDto[]
  vapidPublicKey: string | null
  botWebSocketUrl: string
  checkpoint: number
}

export const UserType = builder.objectRef<UserDto>('User')
export const PlatformRoleType = builder.enumType('PlatformRole', {
  values: ['user', 'admin', 'owner'] as const,
})
export const BotAccessType = builder.enumType('BotAccess', {
  values: ['public', 'by_link'] as const,
})
export const ChatNotificationsType = builder.enumType('ChatNotifications', {
  values: ['all', 'silent', 'off'] as const,
})
export const BotType = builder.objectRef<BotDto>('Bot')
export const BotCommandType = builder.objectRef<VisibleCommand>('BotCommand')
export const ConnectionType = builder.objectRef<ConnectionDto>('Connection')
export const SessionType = builder.objectRef<SessionDto>('Session')

builder.objectType(UserType, {
  fields: (field) => ({
    id: field.exposeID('id'),
    username: field.exposeString('username'),
    displayName: field.exposeString('displayName'),
    bio: field.exposeString('bio'),
    twoFactorEnabled: field.exposeBoolean('twoFactorEnabled'),
    isAdmin: field.exposeBoolean('isAdmin'),
    role: field.expose('role', { type: PlatformRoleType }),
  }),
})

builder.objectType(BotType, {
  fields: (field) => ({
    id: field.exposeID('id'),
    username: field.exposeString('username'),
    name: field.exposeString('name'),
    description: field.exposeString('description'),
    online: field.exposeBoolean('online'),
    stopped: field.exposeBoolean('stopped'),
    listed: field.exposeBoolean('listed'),
    guestAccess: field.exposeBoolean('guestAccess'),
    access: field.expose('access', { type: BotAccessType }),
    memberCount: field.int({ resolve: (bot) => bot.memberCount ?? 0 }),
    avatar: field.exposeString('avatar', { nullable: true }),
    welcome: field.exposeString('welcome'),
    tags: field.exposeStringList('tags'),
  }),
})

builder.objectType(BotCommandType, {
  fields: (field) => ({
    name: field.exposeString('name'),
    description: field.exposeString('description'),
    shortcut: field.exposeString('shortcut', { nullable: true }),
  }),
})

builder.objectType(ConnectionType, {
  fields: (field) => ({
    id: field.exposeID('id'),
    bot: field.field({ type: BotType, resolve: (chat) => chat.bot }),
    roles: field.exposeStringList('roles'),
    blocked: field.exposeBoolean('blocked'),
    unread: field.exposeInt('unread'),
    lastMessageAt: field.exposeFloat('lastMessageAt', { nullable: true }),
    createdAt: field.exposeFloat('createdAt'),
    commands: field.field({ type: [BotCommandType], resolve: (chat) => chat.commands }),
    notifications: field.expose('notifications', { type: ChatNotificationsType }),
    notificationsMutedUntil: field.exposeFloat('notificationsMutedUntil', { nullable: true }),
    preview: field.field({ type: MessageType, nullable: true, resolve: (chat) => chat.preview }),
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
    botWebSocketUrl: field.exposeString('botWebSocketUrl'),
    checkpoint: field.exposeInt('checkpoint'),
  }),
})
