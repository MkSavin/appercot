import type { BotAccess, BotRef } from '@appercot/protocol'

export type BotDetails = Readonly<
  BotRef & { listed: boolean; avatar?: string | null; welcome?: string }
>
export type ManagedBot = BotDetails & { access: BotAccess; memberCount: number }

export interface IssuedBotToken {
  bot: BotDetails
  token: string
}
