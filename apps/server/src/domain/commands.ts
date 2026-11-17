import type { BotCommand, Params } from '@appercot/protocol'
import { asc, eq } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { botCommands, bots } from '../db/schema'

export type VisibleCommand = Pick<BotCommand, 'name' | 'description'>
type CommandRow = typeof botCommands.$inferSelect

export const filterCommandsByRoles = (commands: CommandRow[], roles: string[]): VisibleCommand[] =>
  commands
    .filter(
      (command) =>
        !command.roles ||
        command.roles.length === 0 ||
        command.roles.some((role) => roles.includes(role)),
    )
    .map(({ name, description }) => ({ name, description }))

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
          })),
        )
        .run()
    }
    const current = transaction.select().from(bots).where(eq(bots.id, botId)).get()
    transaction
      .update(bots)
      .set({ commandsRev: (current?.commandsRev ?? 0) + 1 })
      .where(eq(bots.id, botId))
      .run()
  })
  return { ok: true } as const
}
