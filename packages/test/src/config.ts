import type { BotCommand, BotRole, MessageContent, UserContent } from '@appercot/protocol'

export interface TestLaunchConfig {
  server?: {
    hostname?: string
    port?: number
    dataDir?: string
    publicDir?: string
    publicUrl?: string
  }
  registration?: { enabled?: boolean; userInvites?: boolean }
  admin?: { username: string; password: string }
  bootstrapInvite?: string
  media?: {
    maxBytes?: number
    uploadsPerActor?: number
    originalsPerUser?: number
    trustedHosts?: string[]
    ffmpeg?: string
  }
  s3?: {
    endpoint?: string
    bucket?: string
    region?: string
    accessKeyId?: string
    secretAccessKey?: string
  }
  vapid?: { publicKey: string; privateKey: string }
  nodeEnv?: 'development' | 'test' | 'production'
}

export interface TestUserConfig {
  id?: string
  username: string
  displayName: string
  password: string
}

export interface TestBotConfig {
  id?: string
  username: string
  name: string
  description?: string
  welcome?: string
  owner?: string
  token?: string
  tags?: string[]
  listed?: boolean
  access?: 'public' | 'by_link'
  guestAccess?: boolean
  roles?: BotRole[]
  defaultRoles?: string[]
  commands?: BotCommand[]
}

export type TestMessageConfig = {
  id?: string
  clientId?: string
} & ({ sender: 'user'; content: UserContent } | { sender: 'bot'; content: MessageContent })

export interface TestChatConfig {
  id?: string
  user: string
  bot: string
  roles?: string[]
  notifications?: 'all' | 'silent' | 'off'
  messages?: TestMessageConfig[]
}

export interface AppercotTestConfig extends TestLaunchConfig {
  users?: TestUserConfig[]
  bots?: TestBotConfig[]
  chats?: TestChatConfig[]
  test: { token: string }
}
