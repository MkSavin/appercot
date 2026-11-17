import { AddBotDocument, BrowseBotsDocument, graphqlClient } from '@/shared/api'
import type { BotDetails } from '../model/types'

export const browseBotsRequest = async (query?: string): Promise<BotDetails[]> => {
  const result = await graphqlClient.request(BrowseBotsDocument, { query })
  return result.browseBots
}

export const addBotRequest = async (username: string) => {
  const result = await graphqlClient.request(AddBotDocument, { username })
  const { commands, ...connection } = result.addBot
  return { ...connection, commands }
}
