import type { BotAccess, BotCommand, BotRef } from '@appercot/protocol'

export type BotDetails = Readonly<
  BotRef & { listed: boolean; avatar?: string | null; welcome?: string; tags?: string[] }
>
export type CatalogBotDetails = Readonly<{
  bot: BotDetails & { access: BotAccess }
  commands: BotCommand[]
}>
export type ManagedBot = BotDetails & { access: BotAccess; memberCount: number }

export interface IssuedBotToken {
  bot: BotDetails
  token: string
}
