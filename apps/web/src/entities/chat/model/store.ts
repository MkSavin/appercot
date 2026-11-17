import type {
  ClientChat,
  ClientUpdate,
  Message,
  MessageContent,
  UserContent,
} from '@appercot/protocol'
import { create } from 'zustand'
import type { ChatMessage, ConnectionStatus, SessionPayload, SessionUser } from '@/shared/model'

export type {
  ChatMessage,
  ConnectionStatus,
  SessionPayload,
  SessionUser,
} from '@/shared/model'
export type AuthenticationStatus = 'loading' | 'anonymous' | 'authenticated'

type CheckpointStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

interface ChatStoreOptions {
  checkpointStorage?: CheckpointStorage
  now?: () => number
}

interface ChatState {
  user: SessionUser | null
  vapidPublicKey: string | null
  chats: ClientChat[]
  messagesByChat: Record<string, ChatMessage[]>
  pendingByChat: Record<string, string[]>
  typingByChat: Record<string, number>
  lastSeq: number
  connection: ConnectionStatus
  authentication: AuthenticationStatus
}

interface ChatActions {
  setSession: (session: SessionPayload) => void
  setAnonymous: () => void
  clearSession: () => void
  setConnection: (connection: ConnectionStatus) => void
  setLastSeq: (seq: number) => void
  applyUpdate: (seq: number, update: ClientUpdate) => boolean
  replaceMessages: (chatId: string, messages: Message[]) => void
  prependMessages: (chatId: string, messages: Message[]) => void
  beginOptimisticMessage: (
    chatId: string,
    clientId: string,
    content: UserContent,
    createdAt: number,
  ) => ChatMessage
  completeOutgoingMessage: (chatId: string, clientId: string, message: Message) => void
  failOutgoingMessage: (chatId: string, clientId: string) => void
  retryOutgoingMessage: (chatId: string, clientId: string) => void
}

export type ChatStore = ChatState & ChatActions

const checkpointKey = (userId: string) => `appercot:last-seq:${userId}`

const getBrowserStorage = () => {
  if (typeof window === 'undefined') return undefined
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

const readCheckpoint = (storage: CheckpointStorage | undefined, userId: string) => {
  if (!storage) return 0
  try {
    const value = Number(storage.getItem(checkpointKey(userId)))
    return Number.isSafeInteger(value) && value >= 0 ? value : 0
  } catch {
    return 0
  }
}

const writeCheckpoint = (storage: CheckpointStorage | undefined, userId: string, seq: number) => {
  try {
    storage?.setItem(checkpointKey(userId), String(seq))
  } catch {
    return
  }
}

const byMessageOrder = (left: ChatMessage, right: ChatMessage) =>
  left.seq - right.seq || left.createdAt - right.createdAt

const mergeMessages = (current: ChatMessage[], incoming: ChatMessage[]) => {
  const messagesById = new Map(current.map((message) => [message.id, message]))
  for (const message of incoming) {
    const previous = messagesById.get(message.id)
    messagesById.set(message.id, previous ? { ...previous, ...message } : message)
  }
  return [...messagesById.values()].sort(byMessageOrder)
}

const withMessage = (messages: ChatMessage[], message: ChatMessage) =>
  mergeMessages(messages, [message])

const withChat = (chats: ClientChat[], chat: ClientChat) =>
  [...chats.filter((current) => current.id !== chat.id), chat].sort(
    (left, right) =>
      (right.lastMessageAt ?? 0) - (left.lastMessageAt ?? 0) || right.createdAt - left.createdAt,
  )

const sameContent = (left: MessageContent, right: MessageContent) =>
  JSON.stringify(left) === JSON.stringify(right)

const applyClientUpdate = (
  state: ChatState,
  update: ClientUpdate,
  now: () => number,
): Partial<ChatState> => {
  switch (update.type) {
    case 'message.new': {
      const current = state.messagesByChat[update.message.chatId] ?? []
      const existing = current.some((message) => message.id === update.message.id)
      const pending = existing
        ? undefined
        : current.find(
            (message) =>
              message.clientId &&
              message.status === 'pending' &&
              update.message.sender === 'user' &&
              sameContent(message.content, update.message.content),
          )
      const withoutPending = pending
        ? current.filter((message) => message.id !== pending.id)
        : current
      const pendingByChat = { ...state.pendingByChat }
      if (pending?.clientId) {
        pendingByChat[update.message.chatId] = (pendingByChat[update.message.chatId] ?? []).filter(
          (clientId) => clientId !== pending.clientId,
        )
      }
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [update.message.chatId]: withMessage(withoutPending, update.message),
        },
        pendingByChat,
      }
    }
    case 'message.edited':
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [update.message.chatId]: (state.messagesByChat[update.message.chatId] ?? []).map(
            (message) => (message.id === update.message.id ? update.message : message),
          ),
        },
      }
    case 'message.deleted':
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [update.chatId]: (state.messagesByChat[update.chatId] ?? []).filter(
            (message) => message.id !== update.messageId,
          ),
        },
      }
    case 'message.status':
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [update.chatId]: (state.messagesByChat[update.chatId] ?? []).map((message) =>
            message.id === update.messageId &&
            !(message.status === 'processed' && update.status === 'accepted')
              ? { ...message, status: update.status }
              : message,
          ),
        },
      }
    case 'chat.updated':
      return { chats: withChat(state.chats, update.chat) }
    case 'chat.cleared':
      return {
        messagesByChat: { ...state.messagesByChat, [update.chatId]: [] },
        pendingByChat: { ...state.pendingByChat, [update.chatId]: [] },
      }
    case 'chat.removed': {
      const messagesByChat = Object.fromEntries(
        Object.entries(state.messagesByChat).filter(([chatId]) => chatId !== update.chatId),
      )
      const pendingByChat = Object.fromEntries(
        Object.entries(state.pendingByChat).filter(([chatId]) => chatId !== update.chatId),
      )
      return {
        chats: state.chats.filter((chat) => chat.id !== update.chatId),
        messagesByChat,
        pendingByChat,
      }
    }
    case 'bot.typing':
      return { typingByChat: { ...state.typingByChat, [update.chatId]: now() + 5000 } }
    case 'bot.presence':
      return {
        chats: state.chats.map((chat) =>
          chat.bot.id === update.botId
            ? { ...chat, bot: { ...chat.bot, online: update.online } }
            : chat,
        ),
      }
  }
}

export const createChatStore = (options: ChatStoreOptions = {}) => {
  const checkpointStorage = options.checkpointStorage ?? getBrowserStorage()
  const now = options.now ?? Date.now

  return create<ChatStore>()((set, get) => ({
    user: null,
    vapidPublicKey: null,
    chats: [],
    messagesByChat: {},
    pendingByChat: {},
    typingByChat: {},
    lastSeq: 0,
    connection: 'offline',
    authentication: 'loading',
    setSession: (session) => {
      const previousUser = get().user
      const isSameUser = previousUser?.id === session.user.id
      set({
        user: session.user,
        vapidPublicKey: session.vapidPublicKey,
        chats: [...session.chats].sort(
          (left, right) =>
            (right.lastMessageAt ?? 0) - (left.lastMessageAt ?? 0) ||
            right.createdAt - left.createdAt,
        ),
        messagesByChat: isSameUser ? get().messagesByChat : {},
        pendingByChat: isSameUser ? get().pendingByChat : {},
        typingByChat: isSameUser ? get().typingByChat : {},
        lastSeq: isSameUser ? get().lastSeq : readCheckpoint(checkpointStorage, session.user.id),
        authentication: 'authenticated',
      })
    },
    setAnonymous: () => set({ authentication: 'anonymous', user: null }),
    clearSession: () =>
      set({
        user: null,
        vapidPublicKey: null,
        chats: [],
        messagesByChat: {},
        pendingByChat: {},
        typingByChat: {},
        lastSeq: 0,
        connection: 'offline',
        authentication: 'anonymous',
      }),
    setConnection: (connection) => set({ connection }),
    setLastSeq: (lastSeq) => {
      const user = get().user
      if (user) writeCheckpoint(checkpointStorage, user.id, lastSeq)
      set({ lastSeq })
    },
    applyUpdate: (seq, update) => {
      const state = get()
      if (seq <= state.lastSeq) return false
      const changes = applyClientUpdate(state, update, now)
      set({ ...changes, lastSeq: seq })
      if (state.user) writeCheckpoint(checkpointStorage, state.user.id, seq)
      return true
    },
    replaceMessages: (chatId, messages) => {
      const pending = (get().messagesByChat[chatId] ?? []).filter(
        (message) => message.clientId && ['pending', 'failed'].includes(message.status),
      )
      set((state) => ({
        messagesByChat: { ...state.messagesByChat, [chatId]: mergeMessages(messages, pending) },
      }))
    },
    prependMessages: (chatId, messages) =>
      set((state) => ({
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: mergeMessages(state.messagesByChat[chatId] ?? [], messages),
        },
      })),
    beginOptimisticMessage: (chatId, clientId, content, createdAt) => {
      const current = get().messagesByChat[chatId] ?? []
      const optimistic: ChatMessage = {
        id: `pending:${clientId}`,
        chatId,
        seq: Math.max(createdAt, ...current.map((message) => message.seq + 1)),
        sender: 'user',
        content,
        status: 'pending',
        clientId,
        createdAt,
      }
      set((state) => ({
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: withMessage(current, optimistic),
        },
        pendingByChat: {
          ...state.pendingByChat,
          [chatId]: [...(state.pendingByChat[chatId] ?? []), clientId],
        },
      }))
      return optimistic
    },
    completeOutgoingMessage: (chatId, clientId, message) =>
      set((state) => ({
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: withMessage(
            (state.messagesByChat[chatId] ?? []).filter((current) => current.clientId !== clientId),
            message,
          ),
        },
        pendingByChat: {
          ...state.pendingByChat,
          [chatId]: (state.pendingByChat[chatId] ?? []).filter((current) => current !== clientId),
        },
      })),
    failOutgoingMessage: (chatId, clientId) =>
      set((state) => ({
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: (state.messagesByChat[chatId] ?? []).map((message) =>
            message.clientId === clientId ? { ...message, status: 'failed' } : message,
          ),
        },
      })),
    retryOutgoingMessage: (chatId, clientId) =>
      set((state) => ({
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: (state.messagesByChat[chatId] ?? []).map((message) =>
            message.clientId === clientId ? { ...message, status: 'pending' } : message,
          ),
        },
      })),
  }))
}

export const useChatStore = createChatStore()
