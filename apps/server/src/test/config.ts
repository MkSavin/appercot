import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'
import { z } from 'zod'
import { type AppEnv, loadEnv } from '../env'
import {
  type ServerConfig,
  ServerConfigSchema,
  type TestConfig,
  TestConfigSchema,
} from './config-schema'

export type { ServerConfig, TestConfig } from './config-schema'

export interface ResolvedServerConfig {
  config: ServerConfig
  env: AppEnv
  hostname: string
  publicDir?: string
  configDirectory?: string
}

export interface ResolvedTestConfig {
  config: TestConfig
  env: AppEnv
  hostname: string
  publicDir?: string
  configDirectory?: string
}

const envKeys = [
  'PORT',
  'DATA_DIR',
  'PUBLIC_URL',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'BOOTSTRAP_INVITE',
  'ALLOW_REGISTRATION',
  'ALLOW_USER_INVITES',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'MEDIA_MAX_BYTES',
  'MEDIA_UPLOADS_PER_ACTOR',
  'MEDIA_ORIGINALS_PER_USER',
  'MEDIA_TRUSTED_HOSTS',
  'MEDIA_FFMPEG',
  'S3_ENDPOINT',
  'S3_BUCKET',
  'S3_REGION',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'NODE_ENV',
] as const

const pathText = (path: PropertyKey[]) =>
  path.reduce<string>(
    (result, part) =>
      typeof part === 'number' ? `${result}[${part}]` : `${result}.${String(part)}`,
    '',
  ) || '<root>'

const configError = (error: z.ZodError, kind: 'server' | 'test' = 'test') => {
  const first = error.issues[0]
  return new Error(
    first
      ? `Invalid ${kind} configuration at ${pathText(first.path)}: ${first.message}`
      : `Invalid ${kind} configuration`,
  )
}

export const expandPlaceholders = (
  value: unknown,
  environment: Record<string, string | undefined>,
  path: PropertyKey[] = [],
): unknown => {
  if (typeof value === 'string') {
    return value.replace(
      /\\?\$(?:\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}|([A-Za-z_][A-Za-z0-9_]*))/g,
      (
        match,
        bracedName: string | undefined,
        fallback: string | undefined,
        plainName: string | undefined,
      ) => {
        if (match.startsWith('\\$')) return match.slice(1)
        const name = bracedName ?? plainName
        if (!name) return match
        const current = environment[name]
        if (current === undefined && fallback === undefined) {
          throw new Error(`Missing environment variable ${name} at ${pathText(path)}`)
        }
        return current === undefined || (current === '' && fallback !== undefined)
          ? (fallback ?? '')
          : current
      },
    )
  }
  if (Array.isArray(value))
    return value.map((item, index) => expandPlaceholders(item, environment, [...path, index]))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        expandPlaceholders(item, environment, [...path, key]),
      ]),
    )
  }
  return value
}

export const parseTestConfig = (value: unknown) => {
  const parsed = TestConfigSchema.safeParse(value)
  if (!parsed.success) throw configError(parsed.error)
  return parsed.data
}

export const parseServerConfig = (value: unknown) => {
  const parsed = ServerConfigSchema.safeParse(value)
  if (!parsed.success) throw configError(parsed.error, 'server')
  return parsed.data
}

const stringValue = (value: string | number | boolean | undefined) =>
  value === undefined ? undefined : String(value)

export const resolveTestConfig = (
  config: TestConfig,
  environment: Record<string, string | undefined> = process.env,
): ResolvedTestConfig => {
  const jsonSource: Record<string, string | undefined> = {
    PORT: stringValue(config.server?.port),
    DATA_DIR: config.server?.dataDir,
    PUBLIC_URL: config.server?.publicUrl,
    ADMIN_USERNAME: config.admin?.username,
    ADMIN_PASSWORD: config.admin?.password,
    BOOTSTRAP_INVITE: config.bootstrapInvite,
    ALLOW_REGISTRATION: stringValue(config.registration?.enabled),
    ALLOW_USER_INVITES: stringValue(config.registration?.userInvites),
    VAPID_PUBLIC_KEY: config.vapid?.publicKey,
    VAPID_PRIVATE_KEY: config.vapid?.privateKey,
    MEDIA_MAX_BYTES: stringValue(config.media?.maxBytes),
    MEDIA_UPLOADS_PER_ACTOR: stringValue(config.media?.uploadsPerActor),
    MEDIA_ORIGINALS_PER_USER: stringValue(config.media?.originalsPerUser),
    MEDIA_TRUSTED_HOSTS: config.media?.trustedHosts?.join(','),
    MEDIA_FFMPEG: config.media?.ffmpeg,
    S3_ENDPOINT: config.s3?.endpoint,
    S3_BUCKET: config.s3?.bucket,
    S3_REGION: config.s3?.region,
    S3_ACCESS_KEY_ID: config.s3?.accessKeyId,
    S3_SECRET_ACCESS_KEY: config.s3?.secretAccessKey,
    NODE_ENV: config.nodeEnv,
  }
  for (const key of envKeys) {
    if (environment[key] !== undefined) jsonSource[key] = environment[key]
  }
  try {
    return {
      config,
      env: loadEnv(jsonSource),
      hostname: config.server?.hostname ?? '127.0.0.1',
      ...(config.server?.publicDir ? { publicDir: config.server.publicDir } : {}),
    }
  } catch (error) {
    if (error instanceof z.ZodError) throw configError(error)
    throw error
  }
}

export const resolveServerConfig = (
  config: ServerConfig,
  environment: Record<string, string | undefined> = process.env,
): ResolvedServerConfig => {
  const resolved = resolveTestConfig(
    { ...config, users: [], bots: [], chats: [], test: { token: 'server-launch-only' } },
    environment,
  )
  return {
    config,
    env: resolved.env,
    hostname: config.server?.hostname ?? '0.0.0.0',
    ...(resolved.publicDir ? { publicDir: resolved.publicDir } : {}),
  }
}

const resolveConfigPaths = <Config extends ServerConfig>(
  config: Config,
  directory: string,
): Config =>
  ({
    ...config,
    ...(config.server
      ? {
          server: {
            ...config.server,
            ...(config.server.dataDir
              ? {
                  dataDir: isAbsolute(config.server.dataDir)
                    ? config.server.dataDir
                    : resolve(directory, config.server.dataDir),
                }
              : {}),
            ...(config.server.publicDir
              ? {
                  publicDir: isAbsolute(config.server.publicDir)
                    ? config.server.publicDir
                    : resolve(directory, config.server.publicDir),
                }
              : {}),
          },
        }
      : {}),
    ...(config.media?.ffmpeg &&
    /[\\/]/.test(config.media.ffmpeg) &&
    !isAbsolute(config.media.ffmpeg)
      ? { media: { ...config.media, ffmpeg: resolve(directory, config.media.ffmpeg) } }
      : {}),
  }) as Config

export const loadServerConfig = async (
  configPath: string,
  environment: Record<string, string | undefined> = process.env,
) => {
  let input: unknown
  try {
    input = JSON.parse(await readFile(configPath, 'utf8'))
  } catch (error) {
    throw new Error(`Unable to read server configuration ${configPath}`, { cause: error })
  }
  const directory = dirname(resolve(configPath))
  const parsed = parseServerConfig(expandPlaceholders(input, environment))
  return {
    ...resolveServerConfig(resolveConfigPaths(parsed, directory), environment),
    configDirectory: directory,
  }
}

export const loadTestConfig = async (
  configPath: string,
  environment: Record<string, string | undefined> = process.env,
) => {
  let input: unknown
  try {
    input = JSON.parse(await readFile(configPath, 'utf8'))
  } catch (error) {
    throw new Error(`Unable to read test configuration ${configPath}`, { cause: error })
  }
  const directory = dirname(resolve(configPath))
  const parsed = parseTestConfig(expandPlaceholders(input, environment))
  return {
    ...resolveTestConfig(resolveConfigPaths(parsed, directory), environment),
    configDirectory: directory,
  }
}
