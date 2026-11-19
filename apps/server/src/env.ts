import { MAX_FILE } from '@appercot/protocol'
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
    ALLOW_REGISTRATION: z
      .preprocess(emptyToUndefined, z.enum(['true', 'false']).default('true'))
      .transform((value) => value === 'true'),
    ALLOW_USER_INVITES: z
      .preprocess(emptyToUndefined, z.enum(['true', 'false']).default('true'))
      .transform((value) => value === 'true'),
    VAPID_PUBLIC_KEY: optionalString(1),
    VAPID_PRIVATE_KEY: optionalString(1),
    MEDIA_MAX_BYTES: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number()
        .int()
        .min(0)
        .max(5 * 1024 ** 4)
        .default(MAX_FILE),
    ),
    MEDIA_UPLOADS_PER_ACTOR: z.coerce.number().int().min(1).max(32).default(3),
    MEDIA_ORIGINALS_PER_USER: z.coerce.number().int().min(1).max(64).default(4),
    MEDIA_TRUSTED_HOSTS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((host) => host.trim().toLowerCase())
          .filter(Boolean),
      ),
    MEDIA_FFMPEG: optionalString(1),
    S3_ENDPOINT: z.preprocess(emptyToUndefined, z.url({ protocol: /^https?$/ }).optional()),
    S3_BUCKET: z.preprocess(emptyToUndefined, z.string().min(3).default('appercot')),
    S3_REGION: z.preprocess(emptyToUndefined, z.string().min(1).default('us-east-1')),
    S3_ACCESS_KEY_ID: optionalString(1),
    S3_SECRET_ACCESS_KEY: optionalString(1),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  })
  .refine((env) => Boolean(env.ADMIN_USERNAME) === Boolean(env.ADMIN_PASSWORD), {
    message: 'ADMIN_USERNAME and ADMIN_PASSWORD must be provided together',
  })
  .refine((env) => Boolean(env.VAPID_PUBLIC_KEY) === Boolean(env.VAPID_PRIVATE_KEY), {
    message: 'VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be provided together',
  })
  .refine((env) => !env.S3_ENDPOINT || Boolean(env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY), {
    message: 'S3_ENDPOINT requires S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY',
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
    ALLOW_REGISTRATION: source.ALLOW_REGISTRATION,
    ALLOW_USER_INVITES: source.ALLOW_USER_INVITES,
    VAPID_PUBLIC_KEY: source.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: source.VAPID_PRIVATE_KEY,
    MEDIA_MAX_BYTES: source.MEDIA_MAX_BYTES,
    MEDIA_UPLOADS_PER_ACTOR: source.MEDIA_UPLOADS_PER_ACTOR,
    MEDIA_ORIGINALS_PER_USER: source.MEDIA_ORIGINALS_PER_USER,
    MEDIA_TRUSTED_HOSTS: source.MEDIA_TRUSTED_HOSTS,
    MEDIA_FFMPEG: source.MEDIA_FFMPEG,
    S3_ENDPOINT: source.S3_ENDPOINT,
    S3_BUCKET: source.S3_BUCKET,
    S3_REGION: source.S3_REGION,
    S3_ACCESS_KEY_ID: source.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: source.S3_SECRET_ACCESS_KEY,
    NODE_ENV: source.NODE_ENV,
  })
