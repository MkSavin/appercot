import type { BotRef } from '@appercot/protocol'

export type BotDetails = Readonly<BotRef & { listed: boolean }>

export interface IssuedBotToken {
  bot: BotDetails
  token: string
}
