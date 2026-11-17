import type { Params } from '@appercot/protocol'
import { eq } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { botCommands, bots } from '../db/schema'

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
