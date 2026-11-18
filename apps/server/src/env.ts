import { z } from 'zod'

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value)
const optionalString = (minimum: number) =>
  z.preprocess(emptyToUndefined, z.string().min(minimum).optional())

const EnvSchema = z
  .strictObject({
    PORT: z.coerce.number().int().min(0).max(65535).default(3000),
    DATA_DIR: z.string().min(1).default('.data'),
    PUBLIC_URL: z.url().default('http://localhost:3000'),
    ADMIN_USERNAME: optionalString(1),
    ADMIN_PASSWORD: optionalString(8),
    BOOTSTRAP_INVITE: optionalString(1),
    VAPID_PUBLIC_KEY: optionalString(1),
    VAPID_PRIVATE_KEY: optionalString(1),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  })
  .refine((env) => Boolean(env.ADMIN_USERNAME) === Boolean(env.ADMIN_PASSWORD), {
    message: 'ADMIN_USERNAME and ADMIN_PASSWORD must be provided together',
  })
  .refine((env) => Boolean(env.VAPID_PUBLIC_KEY) === Boolean(env.VAPID_PRIVATE_KEY), {
    message: 'VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be provided together',
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
