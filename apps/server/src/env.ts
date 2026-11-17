import { z } from 'zod'

const EnvSchema = z
  .strictObject({
    PORT: z.coerce.number().int().min(0).max(65535).default(3000),
    DATA_DIR: z.string().min(1).default('.data'),
    PUBLIC_URL: z.url().default('http://localhost:3000'),
    ADMIN_USERNAME: z.string().min(1).optional(),
    ADMIN_PASSWORD: z.string().min(8).optional(),
    BOOTSTRAP_INVITE: z.string().min(1).optional(),
    VAPID_PUBLIC_KEY: z.string().min(1).optional(),
    VAPID_PRIVATE_KEY: z.string().min(1).optional(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  })
  .refine((env) => Boolean(env.ADMIN_USERNAME) === Boolean(env.ADMIN_PASSWORD), {
    message: 'ADMIN_USERNAME and ADMIN_PASSWORD must be provided together',
  })

export type AppEnv = z.infer<typeof EnvSchema>

export const loadEnv = (source: Record<string, string | undefined> = process.env): AppEnv =>
  EnvSchema.parse({
    PORT: source.PORT,
    DATA_DIR: source.DATA_DIR,
    PUBLIC_URL: source.PUBLIC_URL,
    ADMIN_USERNAME: source.ADMIN_USERNAME,
    ADMIN_PASSWORD: source.ADMIN_PASSWORD,
    BOOTSTRAP_INVITE: source.BOOTSTRAP_INVITE,
    VAPID_PUBLIC_KEY: source.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: source.VAPID_PRIVATE_KEY,
    NODE_ENV: source.NODE_ENV,
  })
