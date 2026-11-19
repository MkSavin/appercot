import type {
  ClientChat,
  ClientUpdate,
  Message,
  MessageContent,
  UserContent,
} from '@appercot/protocol'
import { create } from 'zustand'
import type {
  ChatConnection,
  ChatMessage,
  ConnectionStatus,
  SessionPayload,
  SessionUser,
} from '@/shared/model'

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
  chats: ChatConnection[]
  messagesByChat: Record<string, ChatMessage[]>
  pendingByChat: Record<string, string[]>
  draftsByChat: Record<string, string>
  typingByChat: Record<string, number>
  lastSeq: number
  historyEpoch: number
  connection: ConnectionStatus
  authentication: AuthenticationStatus
  activeChatId?: string | null
}

interface ChatActions {
  setSession: (session: SessionPayload) => void
  setAnonymous: () => void
  clearSession: () => void
  setDraft: (chatId: string, text: string) => void
  setConnection: (connection: ConnectionStatus) => void
  setLastSeq: (seq: number) => void
  setActiveChat: (chatId: string | null) => void
  discardCachedHistory: () => void
  applyUpdate: (seq: number, update: ClientUpdate) => boolean
  replaceMessages: (chatId: string, messages: Message[], preserveEarlier?: boolean) => void
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
  upsertChat: (chat: ClientChat) => void
  removeChat: (chatId: string) => void
  expireTyping: (chatId: string, until: number) => void
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

const withMessage = (messages: ChatMessage[], message: ChatMessage) => {
  const last = messages.at(-1)
  return !last || byMessageOrder(last, message) < 0
    ? [...messages, message]
    : mergeMessages(messages, [message])
}

const cacheLimit = 150
const maximumCachedChats = 12
const isLocal = (message: ChatMessage) =>
  message.clientId && (message.status === 'pending' || message.status === 'failed')

const warmHistory = (messages: ChatMessage[]) =>
  messages.length <= cacheLimit
    ? messages
    : [...messages.slice(0, -cacheLimit).filter(isLocal), ...messages.slice(-cacheLimit)]

const withChat = (chats: ChatConnection[], chat: ChatConnection) => {
  const previous = chats.find((current) => current.id === chat.id)
  const merged = {
    ...chat,
    commands: chat.commands ?? previous?.commands,
    preview: chat.preview ?? previous?.preview,
  }
  return [...chats.filter((current) => current.id !== chat.id), merged].sort(
    (left, right) =>
      (right.lastMessageAt ?? 0) - (left.lastMessageAt ?? 0) || right.createdAt - left.createdAt,
  )
}

export const isTypingActive = (until: number | undefined, now: number) =>
  until !== undefined && until > now

const sameContent = (left: MessageContent, right: MessageContent) =>
  JSON.stringify(left) === JSON.stringify(right)

const applyClientUpdate = (
  state: ChatState,
  update: ClientUpdate,
  now: () => number,
): Partial<ChatState> => {
  switch (update.type) {
    case 'message.new': {
      const { chatId } = update.message
      const cached = state.messagesByChat[chatId]
      if (!cached && state.activeChatId !== undefined && state.activeChatId !== chatId) return {}
      const current = cached ?? []
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
      const messages = withMessage(withoutPending, update.message)
      const currentChat = state.chats.find((chat) => chat.id === chatId)
      return {
        chats: currentChat
          ? withChat(state.chats, {
              ...currentChat,
              preview: update.message,
              lastMessageAt: update.message.createdAt,
            })
          : state.chats,
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]:
            state.activeChatId != null && state.activeChatId === chatId
              ? messages
              : warmHistory(messages),
        },
        pendingByChat,
      }
    }
    case 'message.edited':
      if (!state.messagesByChat[update.message.chatId]) return {}
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [update.message.chatId]: (state.messagesByChat[update.message.chatId] ?? []).map(
            (message) => (message.id === update.message.id ? update.message : message),
          ),
        },
      }
    case 'message.deleted':
      if (!state.messagesByChat[update.chatId]) return {}
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [update.chatId]: (state.messagesByChat[update.chatId] ?? []).filter(
            (message) =>
              message.id !== update.messageId &&
              (update.clientId === undefined || message.clientId !== update.clientId),
          ),
        },
        ...(update.clientId
          ? {
              pendingByChat: {
                ...state.pendingByChat,
                [update.chatId]: (state.pendingByChat[update.chatId] ?? []).filter(
                  (clientId) => clientId !== update.clientId,
                ),
              },
            }
          : {}),
      }
    case 'message.status':
      if (!state.messagesByChat[update.chatId]) return {}
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
      const draftsByChat = { ...state.draftsByChat }
      const typingByChat = { ...state.typingByChat }
      delete draftsByChat[update.chatId]
      delete typingByChat[update.chatId]
      return {
        chats: state.chats.filter((chat) => chat.id !== update.chatId),
        messagesByChat,
        pendingByChat,
        draftsByChat,
        typingByChat,
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
    case 'platform.role':
      return state.user ? { user: { ...state.user, role: update.role } } : {}
  }
}

/** @anchor DOC:web */
export const createChatStore = (options: ChatStoreOptions = {}) => {
  const checkpointStorage = options.checkpointStorage ?? getBrowserStorage()
  const now = options.now ?? Date.now
  const visited = new Set<string>()

  return create<ChatStore>()((set, get) => ({
    user: null,
    vapidPublicKey: null,
    chats: [],
    messagesByChat: {},
    pendingByChat: {},
    draftsByChat: {},
    typingByChat: {},
    lastSeq: 0,
    historyEpoch: 0,
    connection: 'offline',
    authentication: 'loading',
    setSession: (session) => {
      const previousUser = get().user
      const isSameUser = previousUser?.id === session.user.id
      const lastSeq = isSameUser
        ? get().lastSeq
        : (session.checkpoint ?? readCheckpoint(checkpointStorage, session.user.id))
      if (!isSameUser) {
        visited.clear()
        if (session.checkpoint !== undefined)
          writeCheckpoint(checkpointStorage, session.user.id, lastSeq)
      }
      const messagesByChat = isSameUser ? { ...get().messagesByChat } : {}
      for (const chat of session.chats) {
        if (chat.preview)
          messagesByChat[chat.id] = mergeMessages([chat.preview], messagesByChat[chat.id] ?? [])
      }
      set({
        user: session.user,
        vapidPublicKey: session.vapidPublicKey,
        chats: [...session.chats].sort(
          (left, right) =>
            (right.lastMessageAt ?? 0) - (left.lastMessageAt ?? 0) ||
            right.createdAt - left.createdAt,
        ),
        messagesByChat,
        pendingByChat: isSameUser ? get().pendingByChat : {},
        draftsByChat: isSameUser ? get().draftsByChat : {},
        typingByChat: isSameUser ? get().typingByChat : {},
        lastSeq,
        authentication: 'authenticated',
      })
    },
    setAnonymous: () => set({ authentication: 'anonymous', user: null }),
    clearSession: () => {
      visited.clear()
      set({
        user: null,
        vapidPublicKey: null,
        chats: [],
        messagesByChat: {},
        pendingByChat: {},
        draftsByChat: {},
        typingByChat: {},
        lastSeq: 0,
        connection: 'offline',
        authentication: 'anonymous',
        activeChatId: undefined,
      })
    },
    setDraft: (chatId, text) =>
      set((state) => ({
        draftsByChat: { ...state.draftsByChat, [chatId]: text },
      })),
    setConnection: (connection) => set({ connection }),
    setLastSeq: (lastSeq) => {
      const user = get().user
      if (user) writeCheckpoint(checkpointStorage, user.id, lastSeq)
      set({ lastSeq })
    },
    setActiveChat: (activeChatId) => {
      if (activeChatId) {
        visited.delete(activeChatId)
        visited.add(activeChatId)
      }
      if (visited.size > maximumCachedChats) {
        const oldest = visited.values().next().value
        if (oldest) visited.delete(oldest)
      }
      set((state) => {
        const histories = { ...state.messagesByChat }
        for (const [id, messages] of Object.entries(histories)) {
          if (id === activeChatId) continue
          if (visited.has(id)) histories[id] = warmHistory(messages)
          else {
            const pending = messages.filter(isLocal)
            if (pending.length) histories[id] = pending
            else delete histories[id]
          }
        }
        return { activeChatId, messagesByChat: histories }
      })
    },
    discardCachedHistory: () =>
      set((state) => ({
        historyEpoch: state.historyEpoch + 1,
        typingByChat: {},
        messagesByChat: Object.fromEntries(
          Object.entries(state.messagesByChat)
            .map(([id, messages]) => [id, messages.filter(isLocal)])
            .filter(([, rows]) => rows?.length),
        ),
      })),
    applyUpdate: (seq, update) => {
      const state = get()
      if (seq <= state.lastSeq) return false
      const changes = applyClientUpdate(state, update, now)
      set({ ...changes, lastSeq: seq })
      if (state.user) writeCheckpoint(checkpointStorage, state.user.id, seq)
      return true
    },
    replaceMessages: (chatId, messages, preserveEarlier = false) => {
      const cache = get().messagesByChat[chatId] ?? []
      const pending = cache.filter(isLocal)
      const first = messages[0]
      const earlier =
        preserveEarlier && first && cache.some((item) => item.id === first.id)
          ? cache.filter((item) => item.seq < first.seq)
          : []
      set((state) => ({
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: mergeMessages([...earlier, ...messages], pending),
        },
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
        seq: Math.max(createdAt, (current.at(-1)?.seq ?? 0) + 1),
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
      set((state) => {
        const messages = state.messagesByChat[chatId] ?? []
        const pending = state.pendingByChat[chatId] ?? []
        const existing = messages.find((current) => current.id === message.id)
        if (!existing && !pending.includes(clientId)) return state
        const resolved = !message.deleted && existing?.status === 'processed' ? existing : message
        return {
          messagesByChat: {
            ...state.messagesByChat,
            [chatId]: resolved.deleted
              ? messages.filter(
                  (current) => current.clientId !== clientId && current.id !== resolved.id,
                )
              : withMessage(
                  messages.filter((current) => current.clientId !== clientId),
                  resolved,
                ),
          },
          pendingByChat: {
            ...state.pendingByChat,
            [chatId]: pending.filter((current) => current !== clientId),
          },
        }
      }),
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
    upsertChat: (chat) => set((state) => ({ chats: withChat(state.chats, chat) })),
    removeChat: (chatId) =>
      set((state) => applyClientUpdate(state, { type: 'chat.removed', chatId }, now)),
    expireTyping: (chatId, until) =>
      set((state) => {
        if (state.typingByChat[chatId] !== until) return state
        return {
          typingByChat: Object.fromEntries(
            Object.entries(state.typingByChat).filter(
              ([currentChatId]) => currentChatId !== chatId,
            ),
          ),
        }
      }),
  }))
}

export const useChatStore = createChatStore()
