import type { BotCommand } from '@appercot/protocol'

export const filterBotCommands = (commands: BotCommand[], query: string) => {
  const normalized = query.replace(/^\//, '').toLowerCase()
  return commands.filter((command) => command.name.toLowerCase().includes(normalized))
}
