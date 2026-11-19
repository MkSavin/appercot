import { BotCommandSchema, ClientChatSchema, UserRefSchema } from '@appercot/protocol'
import {
  graphqlClient,
  LoginDocument,
  LogoutDocument,
  PushStatusDocument,
  RegisterDocument,
  SessionDocument,
  SubscribePushDocument,
  UnsubscribePushDocument,
} from '@/shared/api'
import type { SessionQuery } from '@/shared/api/graphql/generated/graphql'
import type { SessionPayload } from '@/shared/model'

const toSessionPayload = (session: SessionQuery['session']): SessionPayload => {
  const { role, bio, twoFactorEnabled, ...user } = session.user
  return {
    user: { ...UserRefSchema.parse(user), role, bio, twoFactorEnabled },
    chats: session.chats.map((chat) => {
      const { commands, ...connection } = chat
      return {
        ...ClientChatSchema.parse(connection),
        commands: BotCommandSchema.array().parse(
          commands.map(({ shortcut, ...command }) => ({
            ...command,
            shortcut: shortcut ?? undefined,
          })),
        ),
      }
    }),
    vapidPublicKey: session.vapidPublicKey,
    checkpoint: session.checkpoint,
  }
}

export const fetchSession = async () => {
  const result = await graphqlClient.request(SessionDocument)
  return toSessionPayload(result.session)
}

export const loginRequest = async (variables: {
  username: string
  password: string
  otp?: string
}) => {
  const result = await graphqlClient.request(LoginDocument, variables)
  return toSessionPayload(result.login)
}

export const registerRequest = async (variables: {
  username: string
  password: string
  displayName: string
  invite: string
}) => {
  const result = await graphqlClient.request(RegisterDocument, variables)
  return toSessionPayload(result.register)
}

export const logoutRequest = async (pushEndpoint?: string) => {
  await graphqlClient.request(LogoutDocument, { pushEndpoint })
}

export const fetchPushStatus = async (endpoint: string) => {
  const result = await graphqlClient.request(PushStatusDocument, { endpoint })
  return result.pushStatus
}

export const subscribePushRequest = async (subscription: unknown) => {
  await graphqlClient.request(SubscribePushDocument, { subscription })
}

export const unsubscribePushRequest = async (endpoint: string) => {
  await graphqlClient.request(UnsubscribePushDocument, { endpoint })
}
