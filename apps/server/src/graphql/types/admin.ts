import { builder } from '../builder'
import type { BotDto } from './session'
import { BotType } from './session'

export interface InviteDto {
  code: string
  uses: number
  maxUses: number | null
  url: string
  expiresAt: number | null
  revokedAt: number | null
  role: 'user' | 'admin'
}

export interface BotTokenDto {
  bot: BotDto
  token: string
}

export const InviteType = builder.objectRef<InviteDto>('Invite')
export const InviteRoleType = builder.enumType('InviteRole', { values: ['user', 'admin'] as const })
export const BotTokenType = builder.objectRef<BotTokenDto>('BotToken')

builder.objectType(InviteType, {
  fields: (field) => ({
    code: field.exposeString('code'),
    uses: field.exposeInt('uses'),
    maxUses: field.exposeInt('maxUses', { nullable: true }),
    url: field.exposeString('url'),
    role: field.expose('role', { type: InviteRoleType }),
    expiresAt: field.exposeFloat('expiresAt', { nullable: true }),
    revokedAt: field.exposeFloat('revokedAt', { nullable: true }),
  }),
})

builder.objectType(BotTokenType, {
  fields: (field) => ({
    bot: field.field({ type: BotType, resolve: (result) => result.bot }),
    token: field.exposeString('token'),
  }),
})
