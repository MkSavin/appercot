import { eq } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { invites, users } from '../db/schema'
import type { AppEnv } from '../env'

export const hashPassword = (password: string) =>
  Bun.password.hash(password, { algorithm: 'argon2id' })

export const verifyPassword = (password: string, hash: string) =>
  Bun.password.verify(password, hash)

export const bootstrapAuth = (db: AppDatabase, env: AppEnv) => {
  if (env.ADMIN_USERNAME && env.ADMIN_PASSWORD) {
    const administrator = db
      .select()
      .from(users)
      .where(eq(users.username, env.ADMIN_USERNAME))
      .get()
    if (!administrator) {
      const passwordHash = Bun.password.hashSync(env.ADMIN_PASSWORD, { algorithm: 'argon2id' })
      db.insert(users)
        .values({
          id: Bun.randomUUIDv7(),
          username: env.ADMIN_USERNAME,
          displayName: env.ADMIN_USERNAME,
          passwordHash,
          isAdmin: true,
          createdAt: Date.now(),
        })
        .run()
    }
  }

  if (env.BOOTSTRAP_INVITE) {
    db.insert(invites)
      .values({
        code: env.BOOTSTRAP_INVITE,
        maxUses: 1,
        uses: 0,
        createdAt: Date.now(),
      })
      .onConflictDoNothing()
      .run()
  }
}
