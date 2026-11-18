import { BotCommandSchema, ClientChatSchema, UserRefSchema } from '@appercot/protocol'
import {
  graphqlClient,
  LoginDocument,
  LogoutDocument,
  RegisterDocument,
  SessionDocument,
  SubscribePushDocument,
  UnsubscribePushDocument,
} from '@/shared/api'
import type { SessionQuery } from '@/shared/api/graphql/generated/graphql'
import type { SessionPayload } from '@/shared/model'

const toSessionPayload = (session: SessionQuery['session']): SessionPayload => {
  const { isAdmin, ...user } = session.user
  return {
    user: { ...UserRefSchema.parse(user), isAdmin },
    chats: session.chats.map((chat) => {
      const { commands, ...connection } = chat
      return {
        ...ClientChatSchema.parse(connection),
        commands: BotCommandSchema.array().parse(commands),
      }
    }),
    vapidPublicKey: session.vapidPublicKey,
  }
}

export const fetchSession = async () => {
  const result = await graphqlClient.request(SessionDocument)
  return toSessionPayload(result.session)
}

export const loginRequest = async (variables: { username: string; password: string }) => {
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

export const logoutRequest = async () => {
  await graphqlClient.request(LogoutDocument)
}

export const subscribePushRequest = async (subscription: unknown) => {
  await graphqlClient.request(SubscribePushDocument, { subscription })
}

export const unsubscribePushRequest = async (endpoint: string) => {
  await graphqlClient.request(UnsubscribePushDocument, { endpoint })
}
