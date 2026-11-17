import { builder } from '../builder'
import type { BotDto } from './session'
import { BotType } from './session'

export interface InviteDto {
  code: string
  uses: number
  maxUses: number | null
  url: string
}

export interface BotTokenDto {
  bot: BotDto
  token: string
}

export const InviteType = builder.objectRef<InviteDto>('Invite')
export const BotTokenType = builder.objectRef<BotTokenDto>('BotToken')

builder.objectType(InviteType, {
  fields: (field) => ({
    code: field.exposeString('code'),
    uses: field.exposeInt('uses'),
    maxUses: field.exposeInt('maxUses', { nullable: true }),
    url: field.exposeString('url'),
  }),
})

builder.objectType(BotTokenType, {
  fields: (field) => ({
    bot: field.field({ type: BotType, resolve: (result) => result.bot }),
    token: field.exposeString('token'),
  }),
})
