import { allowsBotAction, BOT_SYSTEM_ROLES, type BotCommand, type Params } from '@appercot/protocol'
import { asc, eq } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { botCommands, bots } from '../db/schema'
import { DomainError } from './errors'

export type VisibleCommand = Pick<BotCommand, 'name' | 'description' | 'shortcut'>
type CommandRow = typeof botCommands.$inferSelect

export const filterCommandsByRoles = (commands: CommandRow[], roles: string[]): VisibleCommand[] =>
  commands
    .filter((command) => allowsBotAction(command.roles, roles))
    .map(({ name, description, shortcut }) => ({
      name,
      description,
      ...(shortcut ? { shortcut } : {}),
    }))

export const listVisibleCommands = (db: AppDatabase, botId: string, roles: string[]) => {
  const commands = db
    .select()
    .from(botCommands)
    .where(eq(botCommands.botId, botId))
    .orderBy(asc(botCommands.sort), asc(botCommands.name))
    .all()
  return filterCommandsByRoles(commands, roles)
}

export const setBotCommands = (db: AppDatabase, botId: string, params: Params<'setCommands'>) => {
  db.transaction((transaction) => {
    const current = transaction.select().from(bots).where(eq(bots.id, botId)).get()
    if (!current) throw new DomainError('NOT_FOUND', 'Bot was not found')
    const roles = new Set([...current.roles, ...BOT_SYSTEM_ROLES, 'all', 'authenticated'])
    if (params.commands.some((command) => command.roles?.some((role) => !roles.has(role)))) {
      throw new DomainError('BAD_REQUEST', 'Command role is not registered for this bot')
    }
    transaction.delete(botCommands).where(eq(botCommands.botId, botId)).run()
    if (params.commands.length > 0) {
      transaction
        .insert(botCommands)
        .values(
          params.commands.map((command, sort) => ({
            botId,
            name: command.name,
            description: command.description,
            roles: command.roles ?? null,
            sort,
            shortcut: command.shortcut,
          })),
        )
        .run()
    }
    transaction
      .update(bots)
      .set({ commandsRev: current.commandsRev + 1 })
      .where(eq(bots.id, botId))
      .run()
  })
  return { ok: true } as const
}
